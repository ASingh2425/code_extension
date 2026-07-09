# Synqora Privacy Policy

Effective Date: July 8, 2026

Synqora ("we", "our") values your privacy. This Privacy Policy describes how we handle information in connection with the Synqora Chrome Extension.

### 1. Information Collection and Storage
*   **Authentication Data**: Synqora does not collect, transmit, or store your GitHub credentials, passwords, or personal access tokens on any external servers. Your GitHub OAuth token is stored strictly locally inside your browser's secure `chrome.storage.sync` vault.
*   **User Code**: The extension extracts your code submissions from LeetCode, CodeChef, HackerRank, and GeeksforGeeks only when you request a sync. This code is pushed directly and securely via HTTPS to your chosen personal GitHub repository.
*   **No Third-Party Analytics**: We do not use trackers, analytics tools, or third-party cookies. We do not collect or monitor your browsing history.

### 2. Information Usage
All data accessed by Synqora is used solely for its core purpose: to synchronize your competitive programming solutions to your GitHub account.

### 3. Data Transfer and Security
Your data is transmitted securely from your local browser directly to the official GitHub API (`https://api.github.com`). If you utilize the optional OAuth Proxy token exchange serverless function, it is hosted on your personal Vercel deployment, and data is transferred securely over HTTPS.

### 4. Contact
For any questions regarding this privacy policy, please open an issue in the official repository:
`https://github.com/ASingh2425/code_extension`
