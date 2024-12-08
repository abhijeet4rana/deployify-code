import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import {
  initiateGitHubOAuth,
  handleOAuthCallback,
  createRepository,
  pushCode,
  createBranch,
} from '@/utils/github';

const GitHubIntegration = () => {
  const [repoName, setRepoName] = useState('');
  const [branchName, setBranchName] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Check for OAuth callback code
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    if (code) {
      handleOAuthCallback(code)
        .then((token) => {
          setIsAuthenticated(true);
          toast({
            title: "Success",
            description: "Successfully authenticated with GitHub!",
          });
          // Clean up URL
          window.history.replaceState({}, document.title, window.location.pathname);
        })
        .catch((error) => {
          toast({
            title: "Error",
            description: "Failed to authenticate with GitHub",
            variant: "destructive",
          });
        });
    }
  }, []);

  const handleCreateRepo = async () => {
    try {
      const accessToken = localStorage.getItem('github_token');
      if (!accessToken) {
        initiateGitHubOAuth();
        return;
      }

      await createRepository(accessToken, repoName);
      toast({
        title: "Success",
        description: "Repository created successfully!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create repository",
        variant: "destructive",
      });
    }
  };

  const handlePushCode = async () => {
    try {
      const accessToken = localStorage.getItem('github_token');
      if (!accessToken) {
        initiateGitHubOAuth();
        return;
      }

      if (branchName) {
        await createBranch(accessToken, repoName, branchName);
      }

      // Example files to push - modify this based on your needs
      const files = [
        {
          path: 'example.txt',
          content: 'Hello World',
        },
      ];

      await pushCode(accessToken, repoName, branchName || 'main', files);
      toast({
        title: "Success",
        description: "Code pushed successfully!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to push code",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4 p-4">
      <div className="space-y-2">
        <Input
          placeholder="Repository name"
          value={repoName}
          onChange={(e) => setRepoName(e.target.value)}
        />
        <Input
          placeholder="Branch name (optional)"
          value={branchName}
          onChange={(e) => setBranchName(e.target.value)}
        />
      </div>
      <div className="space-x-2">
        <Button onClick={handleCreateRepo}>
          {isAuthenticated ? 'Create Repository' : 'Login with GitHub'}
        </Button>
        {isAuthenticated && (
          <Button onClick={handlePushCode}>Push Code</Button>
        )}
      </div>
    </div>
  );
};

export default GitHubIntegration;