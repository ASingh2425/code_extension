import { SubmissionData } from '../detectors/interface';
import { RepoManager } from '../github/repo-manager';

export class SyncQueueManager {
    private queueKey = 'offline_submissions';
    private repoManager: RepoManager | null = null;
    private isSyncing = false;

    constructor() {
        // We'll initialize the RepoManager later once OAuth is handled
        chrome.storage.local.get(['github_token', 'github_owner', 'github_repo'], (result) => {
            if (result.github_token && result.github_owner && result.github_repo) {
                this.repoManager = new RepoManager(result.github_token, result.github_owner, result.github_repo);
            }
        });

        // Listen for online events to trigger sync
        self.addEventListener('online', () => {
            this.syncPending();
        });
    }

    setRepoManager(manager: RepoManager) {
        this.repoManager = manager;
    }

    async enqueue(submission: SubmissionData) {
        const data = await chrome.storage.local.get({ [this.queueKey]: [] });
        const queue: SubmissionData[] = data[this.queueKey];
        
        // Check for duplicates
        const exists = queue.some(s => s.problemName === submission.problemName && s.platform === submission.platform && s.submissionDate === submission.submissionDate);
        if (!exists) {
            queue.push(submission);
            await chrome.storage.local.set({ [this.queueKey]: queue });
            console.log(`Queued submission for ${submission.platform}: ${submission.problemName}`);
        }

        // Try syncing immediately
        this.syncPending();
    }

    async syncPending() {
        if (this.isSyncing || !navigator.onLine || !this.repoManager) {
            return;
        }

        this.isSyncing = true;
        try {
            const data = await chrome.storage.local.get({ [this.queueKey]: [] });
            let queue: SubmissionData[] = data[this.queueKey];

            while (queue.length > 0) {
                const submission = queue[0];
                
                try {
                    await this.repoManager.pushSubmission(submission);
                    // Successfully pushed, remove from queue
                    queue.shift();
                    await chrome.storage.local.set({ [this.queueKey]: queue });
                } catch (error) {
                    console.error('Failed to sync submission:', error);
                    // Stop syncing on first error (e.g., API limit, auth error)
                    break;
                }
            }
        } finally {
            this.isSyncing = false;
        }
    }
}
