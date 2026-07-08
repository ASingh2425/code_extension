import { IPlatformDetector, SubmissionData } from './interface';

export class GfgDetector implements IPlatformDetector {
    getPlatformName(): string {
        return 'GeeksForGeeks';
    }

    startObserving(onAccepted: (submission: SubmissionData) => void): void {
        console.log('Started observing GeeksForGeeks...');

        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    // GeeksForGeeks typically shows a modal or text "Problem Solved Successfully"
                    const successText = document.querySelector('.problem-solved-msg, .success');
                    if (successText && successText.textContent?.toLowerCase().includes('successfully solved')) {
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
        const problemTitleEl = document.querySelector('.problem-tab__name');
        const problemName = problemTitleEl ? problemTitleEl.textContent || 'Unknown Problem' : 'Unknown Problem';
        
        const langEl = document.querySelector('.divider.text');
        const language = langEl ? langEl.textContent?.trim() || 'unknown' : 'unknown';

        const submission: SubmissionData = {
            platform: this.getPlatformName(),
            problemName: problemName.trim(),
            difficulty: 'Unknown',
            language: language.toLowerCase(),
            code: '// GFG code extraction placeholder',
            submissionDate: new Date().toISOString(),
            submissionUrl: window.location.href,
        };

        onAccepted(submission);
    }
}
