import { IPlatformDetector, SubmissionData } from './interface';

export class LeetCodeDetector implements IPlatformDetector {
    getPlatformName(): string {
        return 'LeetCode';
    }

    startObserving(onAccepted: (submission: SubmissionData) => void): void {
        console.log('Started observing LeetCode...');

        // LeetCode is a SPA, so we need to observe DOM mutations for the "Accepted" state
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    // success banner or intercept the GraphQL submission response.
                    const successSelectors = '[data-e2e-locator="submission-result"], [data-e2e-locator="console-result"], .text-green-s, .text-success, [class*="success"]';
                    const successElements = document.querySelectorAll(successSelectors);
                    
                    let isAccepted = false;
                    successElements.forEach(el => {
                        if (el.textContent?.includes('Accepted')) {
                            isAccepted = true;
                        }
                    });

                    if (isAccepted) {
                        console.log('LeetCode Accepted submission detected!');
                        this.extractAndSend(onAccepted);
                        // Temporarily disconnect to prevent duplicate triggers for the same submission
                        observer.disconnect();
                        
                        // Reconnect after some time or on navigation
                        setTimeout(() => this.startObserving(onAccepted), 5000);
                        break;
                    }
                }
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    private extractAndSend(onAccepted: (submission: SubmissionData) => void): void {
        try {
            // Extract Problem Name from the URL or DOM
            const urlParts = window.location.pathname.split('/');
            const problemSlug = urlParts[2]; // 'two-sum'
            let problemName = problemSlug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

            // Extract problem number if available in DOM
            let problemNumber = '';
            const titleEl = document.querySelector('div.text-title-large, div.text-lg.text-label-1, h4, [class*="title"]');
            if (titleEl && titleEl.textContent) {
                const match = titleEl.textContent.trim().match(/^(\d+)\.\s*(.*)/);
                if (match) {
                    problemNumber = match[1];
                    problemName = match[2];
                }
            }

            // Extract difficulty robustly (proximity-based search relative to title, with global fallback)
            let difficulty = 'Unknown';
            const titleEl = document.querySelector('div.text-title-large, div.text-lg.text-label-1, h4, [class*="title"]');
            if (titleEl) {
                let parent = titleEl.parentElement;
                for (let i = 0; i < 4 && parent; i++) {
                    const badge = Array.from(parent.querySelectorAll('div, span')).find(el => {
                        const text = el.textContent?.trim();
                        return text === 'Easy' || text === 'Medium' || text === 'Hard';
                    });
                    if (badge) {
                        difficulty = badge.textContent!.trim();
                        break;
                    }
                    parent = parent.parentElement;
                }
            }

            if (difficulty === 'Unknown') {
                const easyEl = document.querySelector('.text-easy-s, .text-difficulty-easy, .text-green-s, .text-olive');
                const mediumEl = document.querySelector('.text-medium-s, .text-difficulty-medium, .text-yellow, .text-orange, .text-brand-orange');
                const hardEl = document.querySelector('.text-hard-s, .text-difficulty-hard, .text-pink, .text-red, .text-red-s');
                
                if (easyEl && easyEl.textContent?.trim() === 'Easy') difficulty = 'Easy';
                else if (mediumEl && mediumEl.textContent?.trim() === 'Medium') difficulty = 'Medium';
                else if (hardEl && hardEl.textContent?.trim() === 'Hard') difficulty = 'Hard';
            }

            // Extract language
            let language = 'Unknown';
            const buttons = Array.from(document.querySelectorAll('button'));
            const langButton = buttons.find(b => {
                const text = b.textContent?.trim().toLowerCase() || '';
                return ['cpp', 'c++', 'java', 'python', 'python3', 'javascript', 'typescript', 'c', 'c#', 'rust', 'golang', 'go'].includes(text);
            });
            if (langButton) {
                language = langButton.textContent?.trim() || 'Unknown';
            }

            // Fallback DOM code scraping (since Monaco virtualizes DOM, this might only get visible lines)
            const codeLines = Array.from(document.querySelectorAll('.view-line'));
            const fallbackCode = codeLines.map(line => line.textContent || '').join('\n');

            const submission: SubmissionData = {
                platform: this.getPlatformName(),
                problemName: problemName,
                problemNumber: problemNumber,
                difficulty: difficulty,
                language: language.toLowerCase(),
                code: fallbackCode || `// Solution for ${problemName}`, // Will be overwritten by background script using Monaco API if successful
                submissionDate: new Date().toISOString(),
                submissionUrl: window.location.href,
            };

            onAccepted(submission);
        } catch (error) {
            console.error('Error extracting LeetCode submission:', error);
        }
    }
}
