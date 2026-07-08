export class GitHubAPI {
    private token: string;
    private baseUrl = 'https://api.github.com';

    constructor(token: string) {
        this.token = token;
    }

    private async request(endpoint: string, options: RequestInit = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const headers = {
            'Authorization': `Bearer ${this.token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
            ...options.headers,
        };

        const response = await fetch(url, { ...options, headers });
        if (!response.ok) {
            throw new Error(`GitHub API Error: ${response.statusText} (${response.status}) - ${await response.text()}`);
        }
        return response.json();
    }

    async getUser() {
        return this.request('/user');
    }

    async getRepo(owner: string, repo: string) {
        return this.request(`/repos/${owner}/${repo}`);
    }

    async createRepo(name: string, description: string = 'CodeSync Repository') {
        return this.request('/user/repos', {
            method: 'POST',
            body: JSON.stringify({
                name,
                description,
                private: false, // Defaulting to public as requested for portfolio, but can be configured
                auto_init: true
            })
        });
    }

    async getBranchSha(owner: string, repo: string, branch: string = 'main') {
        const data = await this.request(`/repos/${owner}/${repo}/git/ref/heads/${branch}`);
        return data.object.sha;
    }

    async createBlob(owner: string, repo: string, content: string, encoding: 'utf-8' | 'base64' = 'utf-8') {
        return this.request(`/repos/${owner}/${repo}/git/blobs`, {
            method: 'POST',
            body: JSON.stringify({ content, encoding })
        });
    }

    async createTree(owner: string, repo: string, baseTree: string, tree: Array<{path: string, mode: string, type: string, sha: string}>) {
        return this.request(`/repos/${owner}/${repo}/git/trees`, {
            method: 'POST',
            body: JSON.stringify({
                base_tree: baseTree,
                tree
            })
        });
    }

    async createCommit(owner: string, repo: string, message: string, treeSha: string, parentSha: string) {
        return this.request(`/repos/${owner}/${repo}/git/commits`, {
            method: 'POST',
            body: JSON.stringify({
                message,
                tree: treeSha,
                parents: [parentSha]
            })
        });
    }

    async updateRef(owner: string, repo: string, branch: string, commitSha: string) {
        return this.request(`/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
            method: 'PATCH',
            body: JSON.stringify({
                sha: commitSha,
                force: true
            })
        });
    }
}
