import { SubmissionData } from '../detectors/interface';
import { SyncQueueManager } from './sync';

console.log('CodeSync Background Service Worker Initialized');

const queueManager = new SyncQueueManager();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'SUBMISSION_ACCEPTED') {
        const payload = message.payload as SubmissionData;
        console.log('Background received submission:', payload);
        queueManager.enqueue(payload);
    }
});
