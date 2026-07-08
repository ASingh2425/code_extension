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
        const text = document.body.innerText?.toLowerCase() || '';
        return text.includes('congratulations') || 
               text.includes('congrats') || 
               text.includes('you solved this challenge');
    }

    private extractAndSend(onAccepted: (submission: SubmissionData) => void): void {
        const urlParts = window.location.pathname.split('/');
        const challengeIdx = urlParts.indexOf('challenges');
        let problemSlug = 'Unknown';
        if (challengeIdx !== -1 && urlParts[challengeIdx + 1]) {
            problemSlug = urlParts[challengeIdx + 1];
        }

        // Fallback title parsed from the URL (e.g. "arrays-ds" -> "Arrays Ds")
        let problemName = problemSlug.replace(/_/g, ' ').split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

        // Overwrite with actual heading if we can find it in the DOM
        const titleEl = document.querySelector('h1, h2, .hr_tour-challenge-name, [class*="challenge-title"]');
        if (titleEl && titleEl.textContent && !titleEl.textContent.includes('Solution') && !titleEl.textContent.includes('Prepare')) {
            problemName = titleEl.textContent.trim();
        }

        const langDropdown = document.querySelector('.select2-selection__rendered, [class*="language-select"]');
        const language = langDropdown ? langDropdown.textContent || 'unknown' : 'unknown';

        const submission: SubmissionData = {
            platform: this.getPlatformName(),
            problemName: problemName.trim(),
            difficulty: '', // Disabled difficulty categorisation for HackerRank as requested
            language: language.toLowerCase().trim(),
            code: '// HackerRank code extraction placeholder', // Will be filled from Monaco/editor query
            submissionDate: new Date().toISOString(),
            submissionUrl: window.location.href,
        };

        onAccepted(submission);
    }
}
