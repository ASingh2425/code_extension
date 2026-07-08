const SCOPES = 'repo'; // We need repo access to push commits

export class GitHubAuth {
    static async authenticate(proxyUrl: string, clientId: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const redirectUrl = chrome.identity.getRedirectURL();
            const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUrl)}&scope=${SCOPES}`;

            chrome.identity.launchWebAuthFlow(
                {
                    url: authUrl,
                    interactive: true
                },
                async (responseUrl) => {
                    if (chrome.runtime.lastError || !responseUrl) {
                        return reject(new Error(chrome.runtime.lastError?.message || 'OAuth flow failed'));
                    }
                    
                    try {
                        const url = new URL(responseUrl);
                        const code = url.searchParams.get('code');
                        
                        if (!code) {
                            return reject(new Error('No auth code received'));
                        }

                        // Exchange code for token via Vercel Serverless Proxy
                        const tokenResponse = await fetch(`${proxyUrl}/api/token`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ code })
                        });

                        if (!tokenResponse.ok) {
                            throw new Error(`Token exchange failed: ${tokenResponse.statusText}`);
                        }

                        const tokenData = await tokenResponse.json();
                        if (tokenData.access_token) {
                            resolve(tokenData.access_token);
                        } else {
                            reject(new Error(tokenData.error_description || 'Failed to exchange token'));
                        }
                    } catch (error: any) {
                        reject(error);
                    }
                }
            );
        });
    }
}
