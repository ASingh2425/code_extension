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

    private async fetchProblemMeta(problemSlug: string): Promise<{ difficulty: string, problemNumber: string, title: string } | null> {
        try {
            const query = `
                query questionTitle($titleSlug: String!) {
                    question(titleSlug: $titleSlug) {
                        questionFrontendId
                        title
                        difficulty
                    }
                }
            `;
            const response = await fetch('https://leetcode.com/graphql', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    query,
                    variables: { titleSlug: problemSlug }
                })
            });
            if (!response.ok) return null;
            const res = await response.json();
            const q = res.data?.question;
            if (q) {
                return {
                    difficulty: q.difficulty, // "Easy", "Medium", "Hard"
                    problemNumber: q.questionFrontendId, // "4"
                    title: q.title // "Median of Two Sorted Arrays"
                };
            }
            return null;
        } catch (e) {
            console.error('Failed to fetch LeetCode metadata from GraphQL:', e);
            return null;
        }
    }

    private async extractAndSend(onAccepted: (submission: SubmissionData) => void): Promise<void> {
        try {
            // Extract Problem Name from the URL or DOM
            const urlParts = window.location.pathname.split('/');
            const problemSlug = urlParts[2]; // 'two-sum'
            
            // 1. Try querying LeetCode's GraphQL API for bulletproof metadata
            const meta = await this.fetchProblemMeta(problemSlug);

            let problemName = meta?.title || problemSlug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
            let problemNumber = meta?.problemNumber || '';
            let difficulty = meta?.difficulty || 'Unknown';

            // 2. Fallback to DOM Scraper only if GraphQL fails
            if (!meta) {
                const titleEl = document.querySelector('div.text-title-large, div.text-lg.text-label-1, h4, [class*="title"]');
                if (titleEl && titleEl.textContent) {
                    const match = titleEl.textContent.trim().match(/^(\d+)\.\s*(.*)/);
                    if (match) {
                        problemNumber = match[1];
                        problemName = match[2];
                    }
                }

                // Proximity-based search relative to title
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

                // Global CSS fallback
                if (difficulty === 'Unknown') {
                    const easyEl = document.querySelector('.text-easy-s, .text-difficulty-easy, .text-green-s, .text-olive');
                    const mediumEl = document.querySelector('.text-medium-s, .text-difficulty-medium, .text-yellow, .text-orange, .text-brand-orange');
                    const hardEl = document.querySelector('.text-hard-s, .text-difficulty-hard, .text-pink, .text-red, .text-red-s');
                    
                    if (easyEl && easyEl.textContent?.trim() === 'Easy') difficulty = 'Easy';
                    else if (mediumEl && mediumEl.textContent?.trim() === 'Medium') difficulty = 'Medium';
                    else if (hardEl && hardEl.textContent?.trim() === 'Hard') difficulty = 'Hard';
                }
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
