// Replace with actual Client ID when deploying
const GITHUB_CLIENT_ID = 'YOUR_GITHUB_CLIENT_ID';
const SCOPES = 'repo'; // We need repo access to push commits

export class GitHubAuth {
    static async authenticate(): Promise<string> {
        return new Promise((resolve, reject) => {
            const redirectUrl = chrome.identity.getRedirectURL();
            const authUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUrl)}&scope=${SCOPES}`;

            chrome.identity.launchWebAuthFlow(
                {
                    url: authUrl,
                    interactive: true
                },
                (responseUrl) => {
                    if (chrome.runtime.lastError || !responseUrl) {
                        return reject(chrome.runtime.lastError?.message || 'OAuth flow failed');
                    }
                    
                    const url = new URL(responseUrl);
                    const code = url.searchParams.get('code');
                    
                    if (!code) {
                        return reject('No auth code received');
                    }

                    // In a production app without a backend, we'd need a proxy to exchange the code for a token,
                    // OR we use a Personal Access Token (PAT) input by the user for simplicity.
                    // For now, we resolve the code.
                    resolve(code);
                }
            );
        });
    }
}
