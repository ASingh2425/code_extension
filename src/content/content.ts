import { SubmissionData } from '../detectors/interface';
import { LeetCodeDetector } from '../detectors/leetcode';
import { HackerRankDetector } from '../detectors/hackerrank';
import { CodeChefDetector } from '../detectors/codechef';

console.log('Synqora Content Script Initialized');

function handleAcceptedSubmission(submission: SubmissionData) {
    console.log('Accepted Submission Detected:', submission);
    chrome.runtime.sendMessage({
        type: 'SUBMISSION_ACCEPTED',
        payload: submission
    });
}

const host = window.location.hostname;

chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'SYNC_ERROR') {
        console.error('Synqora GitHub Push Error:', message.error);
        alert('Synqora GitHub Push Error:\n' + message.error + '\n\nPlease check your repository settings and try again.');
    }
});

if (host.includes('leetcode.com')) {
    console.log('Loading LeetCode Detector');
    new LeetCodeDetector().startObserving(handleAcceptedSubmission);
} else if (host.includes('hackerrank.com')) {
    console.log('Loading HackerRank Detector');
    new HackerRankDetector().startObserving(handleAcceptedSubmission);
} else if (host.includes('codechef.com')) {
    console.log('Loading CodeChef Detector');
    new CodeChefDetector().startObserving(handleAcceptedSubmission);
}
