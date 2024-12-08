import { Octokit } from '@octokit/rest';

// These should be your GitHub OAuth App credentials
const GITHUB_CLIENT_ID = 'your_client_id';
const GITHUB_REDIRECT_URI = 'http://localhost:8080/callback';

export const initiateGitHubOAuth = () => {
  const authUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${GITHUB_REDIRECT_URI}&scope=repo`;
  window.location.href = authUrl;
};

export const createRepository = async (accessToken: string, repoName: string) => {
  const octokit = new Octokit({ auth: accessToken });
  
  try {
    const response = await octokit.repos.createForAuthenticatedUser({
      name: repoName,
      private: false,
      auto_init: true,
    });
    return response.data;
  } catch (error) {
    console.error('Error creating repository:', error);
    throw error;
  }
};

export const pushCode = async (
  accessToken: string,
  repoName: string,
  branch: string,
  files: { path: string; content: string }[]
) => {
  const octokit = new Octokit({ auth: accessToken });
  const owner = (await octokit.users.getAuthenticated()).data.login;

  try {
    // Get the default branch's latest commit SHA
    const { data: ref } = await octokit.git.getRef({
      owner,
      repo: repoName,
      ref: `heads/${branch}`,
    });

    // Create blobs for each file
    const fileBlobs = await Promise.all(
      files.map((file) =>
        octokit.git.createBlob({
          owner,
          repo: repoName,
          content: Buffer.from(file.content).toString('base64'),
          encoding: 'base64',
        })
      )
    );

    // Create tree
    const { data: tree } = await octokit.git.createTree({
      owner,
      repo: repoName,
      base_tree: ref.object.sha,
      tree: files.map((file, index) => ({
        path: file.path,
        mode: '100644',
        type: 'blob',
        sha: fileBlobs[index].data.sha,
      })),
    });

    // Create commit
    const { data: commit } = await octokit.git.createCommit({
      owner,
      repo: repoName,
      message: 'Update from application',
      tree: tree.sha,
      parents: [ref.object.sha],
    });

    // Update reference
    await octokit.git.updateRef({
      owner,
      repo: repoName,
      ref: `heads/${branch}`,
      sha: commit.sha,
    });

    return commit;
  } catch (error) {
    console.error('Error pushing code:', error);
    throw error;
  }
};

export const createBranch = async (
  accessToken: string,
  repoName: string,
  newBranch: string,
  fromBranch: string = 'main'
) => {
  const octokit = new Octokit({ auth: accessToken });
  const owner = (await octokit.users.getAuthenticated()).data.login;

  try {
    // Get the SHA of the current branch
    const { data: ref } = await octokit.git.getRef({
      owner,
      repo: repoName,
      ref: `heads/${fromBranch}`,
    });

    // Create new branch
    await octokit.git.createRef({
      owner,
      repo: repoName,
      ref: `refs/heads/${newBranch}`,
      sha: ref.object.sha,
    });

    return true;
  } catch (error) {
    console.error('Error creating branch:', error);
    throw error;
  }
};