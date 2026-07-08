import { IPlatformDetector, SubmissionData } from './interface';

export class CodeChefDetector implements IPlatformDetector {
    getPlatformName(): string {
        return 'CodeChef';
    }

    startObserving(onAccepted: (submission: SubmissionData) => void): void {
        console.log('Started observing CodeChef...');

        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    // CodeChef shows "Correct Answer" in a badge or popup upon success
                    // Selectors look for common submission success statuses on CodeChef
                    const successBadge = document.querySelector('.submission-status, .correct-answer, [class*="correct-answer"]');
                    const hasCorrectAnswer = successBadge && successBadge.textContent?.toLowerCase().includes('correct answer');
                    
                    // Fallback: Check if global text contains "Correct Answer" in a newly added element
                    const textMatch = Array.from(document.querySelectorAll('div, span, h2')).some(el => 
                        el.textContent?.trim() === 'Correct Answer'
                    );

                    if (hasCorrectAnswer || textMatch) {
                        console.log('CodeChef Correct Answer detected!');
                        this.extractAndSend(onAccepted);
                        observer.disconnect();
                        
                        // Reconnect observer after 5 seconds to catch future submissions
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
            // URL format: https://www.codechef.com/problems/FLOW001 or similar
            const urlParts = window.location.pathname.split('/');
            const problemSlug = urlParts[urlParts.length - 1] || 'Unknown';
            let problemName = problemSlug.replace(/_/g, ' ').split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

            // Try to extract a clean title from the DOM
            const titleEl = document.querySelector('h1, h2, .problem-title');
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
