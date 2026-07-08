document.addEventListener('DOMContentLoaded', () => {
    const repoNameEl = document.getElementById('repo-name') as HTMLParagraphElement;
    const lastSyncEl = document.getElementById('last-sync-time') as HTMLSpanElement;
    const btnSync = document.getElementById('btn-sync') as HTMLButtonElement;
    const btnRepo = document.getElementById('btn-repo') as HTMLButtonElement;
    const btnSettings = document.getElementById('btn-settings') as HTMLButtonElement;

    // Load data from storage
    chrome.storage.sync.get(['github_repo'], (items) => {
        if (items.github_repo) {
            repoNameEl.textContent = items.github_repo;
        } else {
            repoNameEl.textContent = 'Not Configured';
            repoNameEl.style.color = '#ef4444';
        }
    });

    // We'd typically load stats from local storage here
    // chrome.storage.local.get(['stats'], ...)

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

    // Trigger manual sync
    btnSync.addEventListener('click', () => {
        const originalText = btnSync.textContent;
        btnSync.textContent = 'Syncing...';
        btnSync.disabled = true;

        // Message background script to trigger sync
        // chrome.runtime.sendMessage({ type: 'MANUAL_SYNC' }, (response) => { ... });

        // Mock delay
        setTimeout(() => {
            btnSync.textContent = 'Synced!';
            btnSync.classList.add('success');
            
            const now = new Date();
            lastSyncEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            setTimeout(() => {
                btnSync.textContent = originalText;
                btnSync.disabled = false;
                btnSync.classList.remove('success');
            }, 2000);
        }, 1500);
    });
});
