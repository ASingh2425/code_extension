import { IPlatformDetector, SubmissionData } from './interface';

export class AllCSNotesDetector implements IPlatformDetector {
    getPlatformName(): string {
        return 'AllCSNotes';
    }

    startObserving(onAccepted: (submission: SubmissionData) => void): void {
        console.log('Started observing AllCSNotes...');

        // Mock implementation for AllCSNotes
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    // Check for a success banner or text indicating problem is solved
                    const successMessage = document.querySelector('.success-alert, .solved-badge');
                    if (successMessage && successMessage.textContent?.toLowerCase().includes('success')) {
                        this.extractAndSend(onAccepted);
                        observer.disconnect();
                        setTimeout(() => this.startObserving(onAccepted), 5000);
                        break;
                    }
                }
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    private extractAndSend(onAccepted: (submission: SubmissionData) => void): void {
        const problemTitleEl = document.querySelector('h1, .problem-title');
        const problemName = problemTitleEl ? problemTitleEl.textContent || 'Unknown Problem' : 'Unknown Problem';
        
        const codeEditor = document.querySelector('.monaco-editor'); 
        const code = codeEditor ? '// Code extracted from AllCSNotes\\n' : '// Code extraction requires deep Monaco integration\\n';

        const submission: SubmissionData = {
            platform: this.getPlatformName(),
            problemName: problemName.trim(),
            difficulty: 'Unknown',
            language: 'unknown',
            code: code,
            submissionDate: new Date().toISOString(),
            submissionUrl: window.location.href,
        };

        onAccepted(submission);
    }
}
