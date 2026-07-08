import { SubmissionData } from '../detectors/interface';

console.log('CodeSync Background Service Worker Initialized');

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'SUBMISSION_ACCEPTED') {
        const payload = message.payload as SubmissionData;
        console.log('Background received submission:', payload);
        // TODO: Enqueue to offline storage or push to GitHub immediately
        handleSubmission(payload);
    }
});

async function handleSubmission(submission: SubmissionData) {
    console.log(`Processing submission for ${submission.platform}: ${submission.problemName}`);
    // Implementation for GitHub API sync will go here
}
