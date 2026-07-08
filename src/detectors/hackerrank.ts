import { IPlatformDetector, SubmissionData } from './interface';

export class HackerRankDetector implements IPlatformDetector {
    getPlatformName(): string {
        return 'HackerRank';
    }

    startObserving(onAccepted: (submission: SubmissionData) => void): void {
        console.log('Started observing HackerRank...');

        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    // HackerRank displays "Congratulations!" on success
                    const successModal = document.querySelector('.congrats-wrapper, .success-msg');
                    if (successModal && successModal.textContent?.toLowerCase().includes('congratulations')) {
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
        const titleEl = document.querySelector('.hr_tour-challenge-name');
        const problemName = titleEl ? titleEl.textContent || 'Unknown Problem' : 'Unknown Problem';

        const langDropdown = document.querySelector('.select2-selection__rendered');
        const language = langDropdown ? langDropdown.textContent || 'unknown' : 'unknown';

        const submission: SubmissionData = {
            platform: this.getPlatformName(),
            problemName: problemName.trim(),
            difficulty: 'Unknown', // HackerRank difficulty is typically listed elsewhere on the page
            language: language.toLowerCase().trim(),
            code: '// HackerRank code extraction placeholder',
            submissionDate: new Date().toISOString(),
            submissionUrl: window.location.href,
        };

        onAccepted(submission);
    }
}
