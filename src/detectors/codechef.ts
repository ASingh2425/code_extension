import { IPlatformDetector, SubmissionData } from './interface';

export class CodeChefDetector implements IPlatformDetector {
    getPlatformName(): string {
        return 'CodeChef';
    }

    startObserving(onAccepted: (submission: SubmissionData) => void): void {
        console.log('Started observing CodeChef...');

        // 1. Check immediately on load (crucial if CodeChef redirects to a static solution page)
        if (this.checkSuccess()) {
            console.log('CodeChef Correct Answer detected immediately on load!');
            this.extractAndSend(onAccepted);
            // Re-trigger observer in 5 seconds to observe future actions
            setTimeout(() => this.startObserving(onAccepted), 5000);
            return;
        }

        // 2. Fall back to MutationObserver if success state isn't already present
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    if (this.checkSuccess()) {
                        console.log('CodeChef Correct Answer detected via mutation!');
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
        // Selectors look for common submission success statuses on CodeChef
        const successBadge = document.querySelector('.submission-status, .correct-answer, [class*="correct-answer"], [class*="status-ac"]');
        const hasCorrectAnswer = successBadge && successBadge.textContent?.toLowerCase().includes('correct');
        
        const textMatch = Array.from(document.querySelectorAll('div, span, h2, p, h3')).some(el => {
            const text = el.textContent?.trim().toLowerCase();
            return text === 'correct answer' || 
                   text === 'ac' || 
                   text === 'accepted' || 
                   text?.includes('great job, keep it up') || 
                   text?.includes('total score = 100%') ||
                   text === 'result - correct';
        });

        return !!(hasCorrectAnswer || textMatch);
    }

    private extractAndSend(onAccepted: (submission: SubmissionData) => void): void {
        try {
            const urlParts = window.location.pathname.split('/');
            const problemSlug = urlParts[urlParts.length - 1] || 'Unknown';
            let problemName = problemSlug.replace(/_/g, ' ').split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
            // Find a clean title from the DOM, filtering out site headers, promotional banners, and AI Tutors
            const titleEl = Array.from(document.querySelectorAll('h1, h2, h3, .problem-title, [class*="problem-title"]')).find(el => {
                const text = el.textContent?.trim() || '';
                return text.length > 0 &&
                       text.length < 80 && 
                       !text.includes('\n') && 
                       !text.toLowerCase().includes('tutor') &&
                       !text.toLowerCase().includes('codechef') &&
                       !text.toLowerCase().includes('switch') &&
                       !text.toLowerCase().includes('ai') &&
                       !text.toLowerCase().includes('sign') &&
                       !text.toLowerCase().includes('log') &&
                       !text.toLowerCase().includes('register');
            });

            if (titleEl && titleEl.textContent) {
                problemName = titleEl.textContent.trim();
            }

            // Extract language
            let language = 'Unknown';
            const langSelector = document.querySelector('[class*="language-select"], [class*="lang-select"]');
            if (langSelector && langSelector.textContent) {
                language = langSelector.textContent.trim();
            } else {
                // Fallback: search for language button containing common names
                const buttons = Array.from(document.querySelectorAll('button, div'));
                const foundLang = buttons.find(b => {
                    const text = b.textContent?.trim().toLowerCase() || '';
                    return ['c++', 'cpp', 'java', 'python', 'python3', 'c', 'c#', 'rust', 'go', 'golang'].includes(text);
                });
                if (foundLang) {
                    language = foundLang.textContent?.trim() || 'Unknown';
                }
            }

            // Extract difficulty from CodeChef rating (e.g. "Difficulty Rating: 1450" -> Medium)
            let difficulty = 'Uncategorized';
            const diffEl = Array.from(document.querySelectorAll('div, span, p')).find(el => {
                const text = el.textContent?.toLowerCase() || '';
                return text.includes('difficulty rating') || text.includes('difficulty:') || text.includes('rating:');
            });
            if (diffEl && diffEl.textContent) {
                const match = diffEl.textContent.match(/\d+/);
                if (match) {
                    const rating = parseInt(match[0], 10);
                    if (rating < 1000) difficulty = 'Beginner';
                    else if (rating < 1400) difficulty = 'Easy';
                    else if (rating < 1800) difficulty = 'Medium';
                    else if (rating < 2200) difficulty = 'Hard';
                    else difficulty = 'Challenging';
                }
            }

            // Fallback DOM code scraping (in case Monaco API call fails)
            const codeLines = Array.from(document.querySelectorAll('.view-line'));
            const fallbackCode = codeLines.map(line => line.textContent || '').join('\n');

            const submission: SubmissionData = {
                platform: this.getPlatformName(),
                problemName: problemName,
                problemNumber: problemSlug, // CodeChef uses problem codes like FLOW001 as identifier
                difficulty: difficulty,
                language: language.toLowerCase(),
                code: fallbackCode || `// Solution for ${problemName} on CodeChef`,
                submissionDate: new Date().toISOString(),
                submissionUrl: window.location.href,
            };

            onAccepted(submission);
        } catch (error) {
            console.error('Error extracting CodeChef submission:', error);
        }
    }
}
