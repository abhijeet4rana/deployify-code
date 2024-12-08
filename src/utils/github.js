import { Octokit } from '@octokit/rest';

// Replace these with your GitHub OAuth App credentials
const GITHUB_CLIENT_ID = 'YOUR_GITHUB_CLIENT_ID';
const GITHUB_REDIRECT_URI = 'http://localhost:5173/callback'; // Update this with your actual redirect URI

export const initiateGitHubOAuth = () => {
  const scope = 'repo'; // Permissions needed for repository operations
  const authUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${GITHUB_REDIRECT_URI}&scope=${scope}`;
  window.location.href = authUrl;
};

export const handleOAuthCallback = async (code) => {
  try {
    // Note: In a production environment, this should be handled by your backend
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        code: code,
        redirect_uri: GITHUB_REDIRECT_URI,
      }),
    });
    
    const data = await response.json();
    if (data.access_token) {
      localStorage.setItem('github_token', data.access_token);
      return data.access_token;
    }
    throw new Error('Failed to get access token');
  } catch (error) {
    console.error('OAuth error:', error);
    throw error;
  }
};

export const createRepository = async (accessToken, repoName) => {
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

export const pushCode = async (accessToken, repoName, branch, files) => {
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

export const createBranch = async (accessToken, repoName, newBranch, fromBranch = 'main') => {
  const octokit = new Octokit({ auth: accessToken });
  const owner = (await octokit.users.getAuthenticated()).data.login;

  try {
    const { data: ref } = await octokit.git.getRef({
      owner,
      repo: repoName,
      ref: `heads/${fromBranch}`,
    });

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