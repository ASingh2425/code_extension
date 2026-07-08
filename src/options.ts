import { GitHubAPI } from './github/api';

document.addEventListener('DOMContentLoaded', () => {
    const tokenInput = document.getElementById('github-token') as HTMLInputElement;
    const repoInput = document.getElementById('github-repo') as HTMLInputElement;
    const autoSyncCheckbox = document.getElementById('auto-sync') as HTMLInputElement;
    const updateReadmeCheckbox = document.getElementById('update-readme') as HTMLInputElement;
    const saveBtn = document.getElementById('btn-save') as HTMLButtonElement;
    const authBtn = document.getElementById('btn-auth') as HTMLButtonElement;

    // Load existing settings
    chrome.storage.sync.get(
        ['github_token', 'github_repo', 'auto_sync', 'update_readme'],
        (items) => {
            if (items.github_token) tokenInput.value = items.github_token as string;
            if (items.github_repo) repoInput.value = items.github_repo as string;
            if (items.auto_sync !== undefined) autoSyncCheckbox.checked = items.auto_sync as boolean;
            if (items.update_readme !== undefined) updateReadmeCheckbox.checked = items.update_readme as boolean;
        }
    );

    authBtn.addEventListener('click', async () => {
        const token = tokenInput.value.trim();
        if (!token) {
            alert('Please enter a Personal Access Token first.');
            return;
        }

        const originalText = authBtn.textContent;
        authBtn.textContent = 'Verifying...';
        authBtn.disabled = true;

        let authenticatedUser = null;

        try {
            const api = new GitHubAPI(token);
            authenticatedUser = await api.getUser();
            
            authBtn.textContent = `Authenticated as ${authenticatedUser.login}`;
            authBtn.classList.add('success');
            
            // Auto-save the token if successful
            chrome.storage.sync.set({ github_token: token });
        } catch (error) {
            authBtn.textContent = 'Authentication Failed';
            authBtn.style.backgroundColor = '#ef4444';
            console.error('Authentication error:', error);
        } finally {
            setTimeout(() => {
                if (authBtn.textContent !== `Authenticated as ${authenticatedUser?.login}`) {
                    authBtn.textContent = originalText;
                }
                authBtn.disabled = false;
                authBtn.classList.remove('success');
                authBtn.style.backgroundColor = '';
            }, 3000);
        }
    });

    // Save settings
    saveBtn.addEventListener('click', () => {
        const token = tokenInput.value.trim();
        const repo = repoInput.value.trim();
        const autoSync = autoSyncCheckbox.checked;
        const updateReadme = updateReadmeCheckbox.checked;

        // Extract owner and repo
        let owner = '';
        let repoName = repo;
        if (repo.includes('/')) {
            [owner, repoName] = repo.split('/');
        }

        chrome.storage.sync.set(
            {
                github_token: token,
                github_repo: repo,
                github_owner: owner,
                auto_sync: autoSync,
                update_readme: updateReadme
            },
            () => {
                const originalText = saveBtn.textContent;
                saveBtn.textContent = 'Saved!';
                saveBtn.classList.add('success');
                setTimeout(() => {
                    saveBtn.textContent = originalText;
                    saveBtn.classList.remove('success');
                }, 2000);
            }
        );
    });
});
