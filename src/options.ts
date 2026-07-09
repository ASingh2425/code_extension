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
});
