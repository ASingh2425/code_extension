document.addEventListener('DOMContentLoaded', () => {
    const repoNameEl = document.getElementById('repo-name') as HTMLParagraphElement;
    const lastSyncEl = document.getElementById('last-sync-time') as HTMLSpanElement;
    const btnSync = document.getElementById('btn-sync') as HTMLButtonElement;
    const btnRepo = document.getElementById('btn-repo') as HTMLButtonElement;
    const btnSettings = document.getElementById('btn-settings') as HTMLButtonElement;

    // Load data from storage
    chrome.storage.sync.get(['github_repo'], (items) => {
        if (items.github_repo) {
            repoNameEl.textContent = items.github_repo as string;
        } else {
            repoNameEl.textContent = 'Not Configured';
            repoNameEl.style.color = '#ef4444';
        }
    });

    // Calculate Day Streak from solved history YYYY-MM-DD dates
    function calculateStreak(history: any[]): number {
        if (history.length === 0) return 0;
        
        // Extract unique sorted dates as YYYY-MM-DD in descending order (newest first)
        const solvedDates = Array.from(new Set(history.map(h => {
            const d = new Date(h.date);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        }))).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
        
        if (solvedDates.length === 0) return 0;
        
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
        
        const latestDate = solvedDates[0];
        // If the latest solve was not today or yesterday, streak is broken
        if (latestDate !== todayStr && latestDate !== yesterdayStr) {
            return 0;
        }
        
        let streak = 0;
        let checkDate = new Date(latestDate);
        
        for (const dateStr of solvedDates) {
            const curDateStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
            if (dateStr === curDateStr) {
                streak++;
                checkDate.setDate(checkDate.getDate() - 1);
            } else {
                break;
            }
        }
        return streak;
    }

    // Load and update statistics on popup open
    function updateStats() {
        chrome.storage.sync.get(['github_token', 'github_repo'], (syncItems) => {
            if (syncItems.github_token && syncItems.github_repo) {
                const headers = {
                    'Authorization': `token ${syncItems.github_token}`,
                    'Accept': 'application/vnd.github.v3+json'
                };

                // Fetch 1: Git Tree API for absolute total solved count
                const treePromise = fetch(`https://api.github.com/repos/${syncItems.github_repo}/git/trees/main?recursive=1`, { headers })
                    .then(res => res.status === 404 ? fetch(`https://api.github.com/repos/${syncItems.github_repo}/git/trees/master?recursive=1`, { headers }) : res)
                    .then(res => res.json())
                    .catch(() => ({ tree: [] }));

                // Fetch 2: Commits API to reconstruct active history for Today count and Streaks
                const commitsPromise = fetch(`https://api.github.com/repos/${syncItems.github_repo}/commits?per_page=100`, { headers })
                    .then(res => res.json())
                    .catch(() => []);

                Promise.all([treePromise, commitsPromise])
                    .then(([treeData, commitsData]) => {
                        let totalSolved = 0;
                        
                        // 1. Calculate Total Solved from Repository Tree
                        if (treeData.tree && Array.isArray(treeData.tree)) {
                            const solutionDirs = new Set(
                                treeData.tree
                                    .filter((file: any) => {
                                        const path = file.path;
                                        const isPlatform = path.startsWith('LeetCode/') || 
                                                           path.startsWith('CodeChef/') || 
                                                           path.startsWith('HackerRank/');
                                        return isPlatform && (path.includes('/Solution.') || path.endsWith('/metadata.json'));
                                    })
                                    .map((file: any) => {
                                        const parts = file.path.split('/');
                                        parts.pop(); // remove file name
                                        return parts.join('/');
                                    })
                            );
                            totalSolved = solutionDirs.size;
                        }

                        // 2. Parse commits to rebuild timeline
                        const history: any[] = [];
                        if (Array.isArray(commitsData)) {
                            for (const item of commitsData) {
                                const message = item.commit?.message || '';
                                const date = item.commit?.author?.date || item.commit?.committer?.date;
                                if (date && message.toLowerCase().startsWith('add solution')) {
                                    history.push({ date });
                                }
                            }
                        }

                        // 3. Calculate Day Streak
                        const streak = calculateStreak(history);

                        // Render UI
                        document.getElementById('total-solves')!.textContent = totalSolved.toString();
                        document.getElementById('current-streak')!.textContent = streak.toString();

                        // Sync history back to local storage as a cache
                        if (history.length > 0) {
                            chrome.storage.local.set({ synced_submissions: history });
                        }
                    })
                    .catch(err => {
                        console.error('Failed to update stats from GitHub APIs:', err);
                        // Local storage fallback
                        chrome.storage.local.get({ synced_submissions: [] }, (localRes) => {
                            const history = localRes.synced_submissions as any[];
                            const streak = calculateStreak(history);
                            
                            document.getElementById('total-solves')!.textContent = history.length.toString();
                            document.getElementById('current-streak')!.textContent = streak.toString();
                        });
                    });
            } else {
                document.getElementById('total-solves')!.textContent = '0';
                document.getElementById('current-streak')!.textContent = '0';
            }
        });
    }

    // Initialize stats
    updateStats();

    // Open settings page
    btnSettings.addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });

    // Open repository in new tab
    btnRepo.addEventListener('click', () => {
        chrome.storage.sync.get(['github_repo'], (items) => {
            if (items.github_repo) {
                window.open(`https://github.com/${items.github_repo}`, '_blank');
            } else {
                alert('Please configure a repository in Settings first.');
            }
        });
    });

    // Trigger real manual sync
    btnSync.addEventListener('click', () => {
        const originalText = btnSync.textContent;
        btnSync.textContent = 'Syncing...';
        btnSync.disabled = true;

        chrome.runtime.sendMessage({ type: 'FORCE_SYNC' }, (response) => {
            setTimeout(() => {
                btnSync.textContent = 'Synced!';
                btnSync.classList.add('success');
                
                const now = new Date();
                lastSyncEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                // Refresh stats
                updateStats();

                setTimeout(() => {
                    btnSync.textContent = originalText;
                    btnSync.disabled = false;
                    btnSync.classList.remove('success');
                }, 2000);
            }, 1000);
        });
    });
});
