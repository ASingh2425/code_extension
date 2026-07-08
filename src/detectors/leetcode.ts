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
            // URL format: https://leetcode.com/problems/two-sum/submissions/xxx/
            const urlParts = window.location.pathname.split('/');
            const problemSlug = urlParts[2]; // 'two-sum'
            const problemName = problemSlug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

            // Extract difficulty, language, code, runtime, etc.
            // Since this is a SPA and the DOM changes dynamically, robust extraction often relies on querying specific classes
            // or even intercepting the GraphQL API. For this baseline, we will mock the extraction of the code.
            
            // Getting the code from the Monaco editor in LeetCode is complex, typically it requires injecting a script 
            // to access window.monaco or copying the text from the DOM lines.
            // Here, we provide a structured placeholder logic.
            const languageElement = document.querySelector('#editor button'); // Example selector
            const language = languageElement ? languageElement.textContent || 'Unknown' : 'Unknown';

            // Placeholder for the extracted code
            const code = `// Solution for ${problemName}\n// Extracted by CodeSync\n\nclass Solution {\n    // Implementation here\n}`;

            const submission: SubmissionData = {
                platform: this.getPlatformName(),
                problemName: problemName,
                difficulty: 'Unknown', // Need to extract from problem description page
                language: language.toLowerCase(),
                code: code,
                submissionDate: new Date().toISOString(),
                submissionUrl: window.location.href,
            };

            onAccepted(submission);
        } catch (error) {
            console.error('Error extracting LeetCode submission:', error);
        }
    }
}
