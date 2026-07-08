import { SubmissionData } from '../detectors/interface';
// import { LeetCodeDetector } from '../detectors/leetcode';

console.log('CodeSync Content Script Initialized');

function handleAcceptedSubmission(submission: SubmissionData) {
    console.log('Accepted Submission Detected:', submission);
    // Send to background script
    chrome.runtime.sendMessage({
        type: 'SUBMISSION_ACCEPTED',
        payload: submission
    });
}

// Basic router to inject the right detector based on URL
const host = window.location.hostname;

if (host.includes('leetcode.com')) {
    console.log('Loading LeetCode Detector');
    // const detector = new LeetCodeDetector();
    // detector.startObserving(handleAcceptedSubmission);
} else if (host.includes('allcsnotes.com')) {
    console.log('Loading AllCSNotes Detector');
} else if (host.includes('geeksforgeeks.org')) {
    console.log('Loading GFG Detector');
}
