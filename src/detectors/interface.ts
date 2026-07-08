/**
 * IPlatformDetector defines the standard interface for any coding platform plugin.
 */
export interface IPlatformDetector {
    /**
     * Name of the platform (e.g., "LeetCode", "HackerRank")
     */
    getPlatformName(): string;

    /**
     * Called by the Content Script to start observing the page for accepted submissions.
     * When an accepted submission is detected, it should call the onAccepted callback.
     */
    startObserving(onAccepted: (submission: SubmissionData) => void): void;
}

export interface SubmissionData {
    platform: string;
    problemName: string;
    problemNumber?: string;
    difficulty: string;
    language: string;
    code: string;
    runtime?: string;
    memory?: string;
    submissionUrl?: string;
    submissionDate: string;
}
