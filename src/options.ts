import { GitHubAPI } from './github/api';
import { GitHubAuth } from './github/auth';

const DEFAULT_PROXY = 'https://dsa-extension.vercel.app';
const DEFAULT_CLIENT_ID = 'Ov23lispAZRyPfHKOHGD';

document.addEventListener('DOMContentLoaded', () => {
    const proxyInput = document.getElementById('github-proxy') as HTMLInputElement;
    const clientIdInput = document.getElementById('github-client-id') as HTMLInputElement;
    const tokenInput = document.getElementById('github-token') as HTMLInputElement;
    const repoInput = document.getElementById('github-repo') as HTMLInputElement;
    const autoSyncCheckbox = document.getElementById('auto-sync') as HTMLInputElement;
    const updateReadmeCheckbox = document.getElementById('update-readme') as HTMLInputElement;
    const saveBtn = document.getElementById('btn-save') as HTMLButtonElement;
    const authBtn = document.getElementById('btn-auth') as HTMLButtonElement;
    const callbackEl = document.getElementById('oauth-callback') as HTMLElement;
    
    const advancedWrapper = document.getElementById('advanced-wrapper') as HTMLDivElement;

    // Display the dynamic callback URL for copy-pasting
    if (callbackEl) {
        callbackEl.textContent = chrome.identity.getRedirectURL();
    }

    // Load existing settings
    chrome.storage.sync.get(
        ['github_proxy', 'github_client_id', 'github_token', 'github_repo', 'auto_sync', 'update_readme', 'dev_mode'],
        (items) => {
            // Show developer settings only if dev_mode is set to true in storage
            if (items.dev_mode && advancedWrapper) {
                advancedWrapper.style.display = 'block';
            }
            proxyInput.value = (items.github_proxy as string) || DEFAULT_PROXY;
            clientIdInput.value = (items.github_client_id as string) || DEFAULT_CLIENT_ID;
            if (items.github_token) tokenInput.value = items.github_token as string;
            if (items.github_repo) repoInput.value = items.github_repo as string;
            if (items.auto_sync !== undefined) autoSyncCheckbox.checked = items.auto_sync as boolean;
            if (items.update_readme !== undefined) updateReadmeCheckbox.checked = items.update_readme as boolean;
        }
    );

    // Authenticate with GitHub (OAuth or Fallback PAT)
    authBtn.addEventListener('click', async () => {
        const proxyUrl = proxyInput.value.trim();
        const clientId = clientIdInput.value.trim();
        const fallbackToken = tokenInput.value.trim();

        const originalText = authBtn.textContent;
        authBtn.textContent = 'Authenticating...';
        authBtn.disabled = true;

        let authenticatedUser = null;
        let token = fallbackToken;

        try {
            // If OAuth settings are provided, run OAuth flow
            if (proxyUrl && clientId) {
                token = await GitHubAuth.authenticate(proxyUrl, clientId);
                tokenInput.value = token; // Populate token box with returned token
            }

            if (!token) {
                alert('Please enter a Personal Access Token or configure OAuth settings (Proxy URL and Client ID).');
                authBtn.textContent = originalText;
                authBtn.disabled = false;
                return;
            }

            const api = new GitHubAPI(token);
            authenticatedUser = await api.getUser();
            
            authBtn.textContent = `Authenticated as ${authenticatedUser.login}`;
            authBtn.classList.add('success');
            
            // Auto-save the credentials
            chrome.storage.sync.set({ 
                github_token: token,
                github_owner: authenticatedUser.login
            });
        } catch (error: any) {
            authBtn.textContent = 'Authentication Failed';
            authBtn.style.backgroundColor = '#ef4444';
            alert(`Authentication failed: ${error.message || error}`);
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
        const proxy = proxyInput.value.trim();
        const clientId = clientIdInput.value.trim();
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
                github_proxy: proxy,
                github_client_id: clientId,
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

    // Generate animated background icons (LeetCode, HackerRank, CodeChef)
    const bgContainer = document.getElementById('bg-animation');
    if (bgContainer) {
        const leetcodeSVG = `<svg class="bg-icon" viewBox="0 0 24 24"><path d="M16.102 17.93l-2.69 2.607c-.466.451-1.211.451-1.677 0l-2.69-2.607c-.466-.451-.466-1.171 0-1.622l8.847-8.56c.466-.451 1.212-.451 1.678 0l2.69 2.607c.466.451.466 1.17 0 1.622l-6.158 5.953zM10.825 8.167l2.69-2.607c.466-.451 1.211-.451 1.677 0l2.69 2.607c.466.451.466 1.171 0 1.622l-8.847 8.56c-.466.451-1.212.451-1.678 0l-2.69-2.607c-.466-.451-.466-1.17 0-1.622l6.158-5.953z"/></svg>`;
        const hackerrankSVG = `<svg class="bg-icon" viewBox="0 0 24 24"><path d="M5 3h4v7h6V3h4v18h-4v-7H9v7H5V3z"/></svg>`;
        const codechefSVG = `<svg class="bg-icon" viewBox="0 0 24 24"><path d="M12 2A10 10 0 002 12c0 4.42 2.87 8.17 6.84 9.49.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0012 2z"/></svg>`;
        
        const icons = [leetcodeSVG, hackerrankSVG, codechefSVG];
        const rowCount = 7;
        const iconsPerRow = 15;

        for (let r = 0; r < rowCount; r++) {
            const rowEl = document.createElement('div');
            rowEl.className = 'bg-row';
            
            let rowContent = '';
            for (let i = 0; i < iconsPerRow; i++) {
                rowContent += icons[(r + i) % icons.length];
            }
            rowEl.innerHTML = rowContent + rowContent;
            bgContainer.appendChild(rowEl);
        }
    }
});
