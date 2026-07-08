import { GitHubAPI } from './api';
import { SubmissionData } from '../detectors/interface';

export class RepoManager {
    private api: GitHubAPI;
    private owner: string;
    private repo: string;

    constructor(token: string, owner: string, repo: string) {
        this.api = new GitHubAPI(token);
        this.owner = owner;
        this.repo = repo;
    }

    private getFileExtension(language: string): string {
        const extMap: Record<string, string> = {
            'c++': 'cpp', 'cpp': 'cpp', 'java': 'java', 'python': 'py', 'python3': 'py',
            'javascript': 'js', 'typescript': 'ts', 'c': 'c', 'c#': 'cs', 'go': 'go',
            'rust': 'rs', 'ruby': 'rb', 'swift': 'swift', 'kotlin': 'kt', 'sql': 'sql'
        };
        return extMap[language.toLowerCase()] || 'txt';
    }

    private buildPath(submission: SubmissionData): string {
        // e.g., LeetCode/Easy/0001 Two Sum/Solution.java
        const padNum = submission.problemNumber ? submission.problemNumber.padStart(4, '0') : '';
        const folderName = padNum ? `${padNum} ${submission.problemName}` : submission.problemName;
        const ext = this.getFileExtension(submission.language);
        if (submission.difficulty) {
            return `${submission.platform}/${submission.difficulty}/${folderName}/Solution.${ext}`;
        }
        return `${submission.platform}/${folderName}/Solution.${ext}`;
    }

    private buildMetadataPath(submission: SubmissionData): string {
        const padNum = submission.problemNumber ? submission.problemNumber.padStart(4, '0') : '';
        const folderName = padNum ? `${padNum} ${submission.problemName}` : submission.problemName;
        if (submission.difficulty) {
            return `${submission.platform}/${submission.difficulty}/${folderName}/metadata.json`;
        }
        return `${submission.platform}/${folderName}/metadata.json`;
    }

    async pushSubmission(submission: SubmissionData) {
        try {
            // 1. Get latest commit SHA on main
            const baseSha = await this.api.getBranchSha(this.owner, this.repo, 'main');
            
            // 2. Get tree of the base commit to use as base_tree
            const commitData = await this.api.request(`/repos/${this.owner}/${this.repo}/git/commits/${baseSha}`);
            const baseTreeSha = commitData.tree.sha;

            // 3. Create blobs for Code and Metadata
            const codeBlob = await this.api.createBlob(this.owner, this.repo, submission.code);
            const metadataJson = JSON.stringify(submission, null, 2);
            const metaBlob = await this.api.createBlob(this.owner, this.repo, metadataJson);

            // 4. Construct the tree array
            const codePath = this.buildPath(submission);
            const metaPath = this.buildMetadataPath(submission);
            
            const tree = [
                {
                    path: codePath,
                    mode: '100644',
                    type: 'blob',
                    sha: codeBlob.sha
                },
                {
                    path: metaPath,
                    mode: '100644',
                    type: 'blob',
                    sha: metaBlob.sha
                }
            ];

            // 5. Create new tree
            const newTree = await this.api.createTree(this.owner, this.repo, baseTreeSha, tree);

            // 6. Create new commit
            const message = `Add solution for ${submission.platform} - ${submission.problemName}`;
            const newCommit = await this.api.createCommit(this.owner, this.repo, message, newTree.sha, baseSha);

            // 7. Update branch ref
            await this.api.updateRef(this.owner, this.repo, 'main', newCommit.sha);
            
            console.log('Successfully pushed submission to GitHub');
            return true;
        } catch (error) {
            console.error('Failed to push submission:', error);
            throw error;
        }
    }
}
