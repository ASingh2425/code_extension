import { SubmissionData } from '../detectors/interface';
import { RepoManager } from '../github/repo-manager';

export class SyncQueueManager {
    private queueKey = 'offline_submissions';
    private repoManager: RepoManager | null = null;
    private isSyncing = false;

    constructor() {
        // Initialize RepoManager from sync storage where settings are saved
        this.loadSettings();

        // Listen for settings changes
        chrome.storage.onChanged.addListener((changes, area) => {
            if (area === 'sync' && (changes.github_token || changes.github_owner || changes.github_repo)) {
                console.log('GitHub settings updated, reloading RepoManager...');
                this.loadSettings();
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

    private loadSettings() {
        chrome.storage.sync.get(['github_token', 'github_owner', 'github_repo'], (result) => {
            if (result.github_token && result.github_owner && result.github_repo) {
                this.repoManager = new RepoManager(result.github_token as string, result.github_owner as string, result.github_repo as string);
                console.log('RepoManager initialized successfully.');
                // Try syncing if we had items pending before settings were set
                this.syncPending();
            } else {
                console.log('Missing GitHub credentials in settings.');
                this.repoManager = null;
            }
        });
    }

    async enqueue(submission: SubmissionData) {
        const data = await chrome.storage.local.get({ [this.queueKey]: [] });
        const queue: SubmissionData[] = data[this.queueKey] as SubmissionData[];
        
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
            let queue: SubmissionData[] = data[this.queueKey] as SubmissionData[];

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
