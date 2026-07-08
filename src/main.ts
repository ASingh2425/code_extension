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
                // Fetch the live repo tree from GitHub to seed/get the absolute accurate total count
                fetch(`https://api.github.com/repos/${syncItems.github_repo}/git/trees/main?recursive=1`, {
                    headers: {
                        'Authorization': `token ${syncItems.github_token}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                })
                .then(res => {
                    if (res.status === 404) {
                        return fetch(`https://api.github.com/repos/${syncItems.github_repo}/git/trees/master?recursive=1`, {
                            headers: {
                                'Authorization': `token ${syncItems.github_token}`,
                                'Accept': 'application/vnd.github.v3+json'
                            }
                        });
                    }
                    return res;
                })
                .then(res => res.json())
                .then(data => {
                    let githubTotal = 0;
                    if (data.tree) {
                        // Count unique directories under platforms (each represents a challenge)
                        const solutionDirs = new Set(
                            data.tree
                                .filter((file: any) => {
                                    const path = file.path;
                                    const isPlatform = path.startsWith('LeetCode/') || 
                                                       path.startsWith('CodeChef/') || 
                                                       path.startsWith('GeeksforGeeks/') || 
                                                       path.startsWith('HackerRank/');
                                    return isPlatform && (path.includes('/Solution.') || path.endsWith('/metadata.json'));
                                })
                                .map((file: any) => {
                                    const parts = file.path.split('/');
                                    parts.pop(); // remove file name
                                    return parts.join('/');
                                })
                        );
                        githubTotal = solutionDirs.size;
                    }

                    chrome.storage.local.get({ synced_submissions: [] }, (localRes) => {
                        const history = localRes.synced_submissions as any[];
                        
                        // Today count
                        const todayStr = new Date().toLocaleDateString();
                        const todayCount = history.filter(h => new Date(h.date).toLocaleDateString() === todayStr).length;
                        
                        // Day streak
                        const streak = calculateStreak(history);
                        
                        // Total solved is the max of live GitHub count and local history
                        const totalSolved = Math.max(githubTotal, history.length);

                        // Render to UI
                        document.getElementById('today-solves')!.textContent = todayCount.toString();
                        document.getElementById('total-solves')!.textContent = totalSolved.toString();
                        document.getElementById('current-streak')!.textContent = streak.toString();
                    });
                })
                .catch(err => {
                    console.error('Failed to query GitHub tree API:', err);
                    // Fallback to local storage only if network call fails
                    chrome.storage.local.get({ synced_submissions: [] }, (localRes) => {
                        const history = localRes.synced_submissions as any[];
                        const todayStr = new Date().toLocaleDateString();
                        const todayCount = history.filter(h => new Date(h.date).toLocaleDateString() === todayStr).length;
                        const streak = calculateStreak(history);
                        
                        document.getElementById('today-solves')!.textContent = todayCount.toString();
                        document.getElementById('total-solves')!.textContent = history.length.toString();
                        document.getElementById('current-streak')!.textContent = streak.toString();
                    });
                });
            } else {
                // If not configured, set stats to 0
                document.getElementById('today-solves')!.textContent = '0';
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
