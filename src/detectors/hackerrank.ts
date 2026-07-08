import { IPlatformDetector, SubmissionData } from './interface';

export class HackerRankDetector implements IPlatformDetector {
    getPlatformName(): string {
        return 'HackerRank';
    }

    startObserving(onAccepted: (submission: SubmissionData) => void): void {
        console.log('Started observing HackerRank...');

        // 1. Check immediately on load
        if (this.checkSuccess()) {
            console.log('HackerRank Congratulations detected immediately on load!');
            this.extractAndSend(onAccepted);
            setTimeout(() => this.startObserving(onAccepted), 5000);
            return;
        }

        // 2. Otherwise start MutationObserver
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    if (this.checkSuccess()) {
                        console.log('HackerRank Congratulations detected via mutation!');
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

    private checkSuccess(): boolean {
        const modal = document.querySelector('.congrats-wrapper, .success-msg, .congrats-heading');
        const hasCongrats = modal && modal.textContent?.toLowerCase().includes('congratulations');
        
        const textMatch = Array.from(document.querySelectorAll('div, h1, h2, h3, p')).some(el => {
            const text = el.textContent?.toLowerCase() || '';
            return text.includes('congratulations') || text.includes('congrats!');
        });

        return !!(hasCongrats || textMatch);
    }

    private extractAndSend(onAccepted: (submission: SubmissionData) => void): void {
        const titleEl = document.querySelector('.hr_tour-challenge-name, [class*="challenge-title"]');
        const problemName = titleEl ? titleEl.textContent || 'Unknown Problem' : 'Unknown Problem';

        const langDropdown = document.querySelector('.select2-selection__rendered, [class*="language-select"]');
        const language = langDropdown ? langDropdown.textContent || 'unknown' : 'unknown';

        // Try to find the problem difficulty if displayed in header
        let difficulty = 'Unknown';
        const diffBadge = Array.from(document.querySelectorAll('span, div')).find(el => {
            const text = el.textContent?.trim().toLowerCase();
            return text === 'easy' || text === 'medium' || text === 'hard';
        });
        if (diffBadge) {
            difficulty = diffBadge.textContent!.trim();
        }

        const submission: SubmissionData = {
            platform: this.getPlatformName(),
            problemName: problemName.trim(),
            difficulty: difficulty,
            language: language.toLowerCase().trim(),
            code: '// HackerRank code extraction placeholder', // Will be filled from Monaco/editor query
            submissionDate: new Date().toISOString(),
            submissionUrl: window.location.href,
        };

        onAccepted(submission);
    }
}
