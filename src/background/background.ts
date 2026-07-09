import { SubmissionData } from '../detectors/interface';
import { SyncQueueManager } from './sync';

console.log('Synqora Background Service Worker Initialized');

const queueManager = new SyncQueueManager();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'SUBMISSION_ACCEPTED') {
        const payload = message.payload as SubmissionData;
        console.log('Background received submission:', payload);
        
        if (sender.tab?.id) {
            chrome.scripting.executeScript({
                target: { tabId: sender.tab.id },
                world: 'MAIN',
                func: () => {
                    const models = (window as any).monaco?.editor?.getModels();
                    if (models && models.length > 0) {
                        return models[0].getValue();
                    }
                    return null;
                }
            }).then((results) => {
                const extractedCode = results[0]?.result;
                if (extractedCode) {
                    console.log('Extracted code from Monaco editor in MAIN world');
                    payload.code = extractedCode;
                }
                queueManager.enqueue(payload);
            }).catch((err) => {
                console.error('Monaco code extraction failed:', err);
                queueManager.enqueue(payload);
            });
        } else {
            queueManager.enqueue(payload);
        }
        sendResponse({ status: 'queued' });
    } else if (message.type === 'FORCE_SYNC') {
        console.log('Background forcing sync...');
        queueManager.syncPending();
        sendResponse({ status: 'sync_started' });
    }
    return true;
});
