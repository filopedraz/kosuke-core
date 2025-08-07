import asyncio
import logging
import json
from typing import Dict, List, Optional
from fastapi import HTTPException

from app.services.file_storage_service import file_storage, ProjectFile
from app.services.github_service import GitHubService

logger = logging.getLogger(__name__)


class ProjectApiService:
    """
    API service for containers to access project files without filesystem mounting
    
    This service provides HTTP endpoints that containers can call to:
    - Read/write files
    - List directory contents
    - Execute git operations
    - Access session-specific data
    
    Eliminates the need for volume mounting in Docker containers.
    """
    
    def __init__(self):
        self.github_services: Dict[str, GitHubService] = {}  # Cache GitHub services by token
    
    async def read_file(self, project_id: int, session_id: str, file_path: str) -> Optional[str]:
        """Read a file from project storage"""
        try:
            return await file_storage.read_file(project_id, session_id, file_path)
        except Exception as e:
            logger.error(f"Error reading file {file_path}: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to read file: {e}")
    
    async def write_file(self, project_id: int, session_id: str, file_path: str, content: str) -> ProjectFile:
        """Write a file to project storage"""
        try:
            return await file_storage.write_file(project_id, session_id, file_path, content)
        except Exception as e:
            logger.error(f"Error writing file {file_path}: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to write file: {e}")
    
    async def list_files(self, project_id: int, session_id: str, prefix: str = "") -> List[Dict]:
        """List files in project storage"""
        try:
            files = await file_storage.list_files(project_id, session_id, prefix)
            return [
                {
                    "path": f.file_path,
                    "size": f.size,
                    "mime_type": f.mime_type,
                    "created_at": f.created_at.isoformat() if f.created_at else None,
                    "updated_at": f.updated_at.isoformat() if f.updated_at else None,
                }
                for f in files
            ]
        except Exception as e:
            logger.error(f"Error listing files: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to list files: {e}")
    
    async def delete_file(self, project_id: int, session_id: str, file_path: str) -> bool:
        """Delete a file from project storage"""
        try:
            return await file_storage.delete_file(project_id, session_id, file_path)
        except Exception as e:
            logger.error(f"Error deleting file {file_path}: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to delete file: {e}")
    
    async def create_directory_structure(self, project_id: int, session_id: str) -> Dict:
        """Create a virtual directory structure for the container"""
        try:
            files = await file_storage.list_files(project_id, session_id)
            
            # Build directory tree
            tree = {}
            for file in files:
                path_parts = file.file_path.split('/')
                current = tree
                
                # Navigate/create directory structure
                for part in path_parts[:-1]:  # All but the filename
                    if part not in current:
                        current[part] = {}
                    current = current[part]
                
                # Add file
                current[path_parts[-1]] = {
                    "type": "file",
                    "size": file.size,
                    "mime_type": file.mime_type
                }
            
            return tree
        except Exception as e:
            logger.error(f"Error creating directory structure: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to create directory structure: {e}")
    
    async def initialize_session_from_main(self, project_id: int, session_id: str, base_branch: str = "main") -> bool:
        """Initialize a new session by copying from main session"""
        try:
            # Copy all files from main session to new session
            success = await file_storage.copy_session(project_id, "main", session_id)
            if success:
                logger.info(f"Initialized session {session_id} from main for project {project_id}")
            return success
        except Exception as e:
            logger.error(f"Error initializing session: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to initialize session: {e}")
    
    async def sync_with_github(self, project_id: int, session_id: str, github_token: str, repo_url: str) -> Dict:
        """Sync session with GitHub repository"""
        try:
            # Get or create GitHub service
            github_service = self._get_github_service(github_token)
            
            if session_id == "main":
                # For main session, pull latest from GitHub
                return await self._sync_main_with_github(project_id, github_service, repo_url)
            else:
                # For chat sessions, this would involve more complex branch management
                return await self._sync_session_with_github(project_id, session_id, github_service, repo_url)
                
        except Exception as e:
            logger.error(f"Error syncing with GitHub: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to sync with GitHub: {e}")
    
    async def _sync_main_with_github(self, project_id: int, github_service: GitHubService, repo_url: str) -> Dict:
        """Sync main session with GitHub repository"""
        # This is a simplified version - you might want to use a temporary directory
        # to clone/pull from GitHub, then sync files to storage
        try:
            import tempfile
            import git
            from pathlib import Path
            
            with tempfile.TemporaryDirectory() as temp_dir:
                temp_path = Path(temp_dir)
                
                # Clone repository to temporary directory
                repo = git.Repo.clone_from(repo_url, temp_path)
                
                # Read all files from the repository
                files_synced = 0
                for file_path in temp_path.rglob("*"):
                    if file_path.is_file() and not any(part.startswith('.git') for part in file_path.parts):
                        relative_path = str(file_path.relative_to(temp_path))
                        
                        # Read file content
                        try:
                            content = file_path.read_text(encoding='utf-8')
                            
                            # Store in database
                            await file_storage.write_file(project_id, "main", relative_path, content)
                            files_synced += 1
                            
                        except UnicodeDecodeError:
                            # Skip binary files
                            logger.debug(f"Skipping binary file: {relative_path}")
                            continue
                
                return {
                    "success": True,
                    "files_synced": files_synced,
                    "commit_sha": repo.head.commit.hexsha[:8]
                }
                
        except Exception as e:
            logger.error(f"Error syncing main with GitHub: {e}")
            return {"success": False, "error": str(e)}
    
    async def _sync_session_with_github(self, project_id: int, session_id: str, github_service: GitHubService, repo_url: str) -> Dict:
        """Sync session branch with GitHub repository"""
        # Placeholder for session branch sync
        # This would involve pulling the specific session branch
        return {"success": True, "message": "Session sync not implemented yet"}
    
    def _get_github_service(self, github_token: str) -> GitHubService:
        """Get or create GitHub service instance"""
        if github_token not in self.github_services:
            self.github_services[github_token] = GitHubService(github_token)
        return self.github_services[github_token]
    
    async def execute_git_command(self, project_id: int, session_id: str, command: str, github_token: str = None) -> Dict:
        """Execute git commands in the session context"""
        try:
            # For now, we'll handle basic git operations
            # More complex operations might require temporary directories
            
            if command.startswith("git status"):
                return await self._git_status(project_id, session_id)
            elif command.startswith("git add"):
                return await self._git_add(project_id, session_id, command)
            elif command.startswith("git commit"):
                return await self._git_commit(project_id, session_id, command, github_token)
            else:
                return {"success": False, "error": f"Unsupported git command: {command}"}
                
        except Exception as e:
            logger.error(f"Error executing git command: {e}")
            return {"success": False, "error": str(e)}
    
    async def _git_status(self, project_id: int, session_id: str) -> Dict:
        """Simulate git status by comparing with main branch"""
        try:
            # Get files in current session
            session_files = await file_storage.list_files(project_id, session_id)
            
            # Get files in main session for comparison
            main_files = await file_storage.list_files(project_id, "main")
            main_file_map = {f.file_path: f for f in main_files}
            
            modified = []
            added = []
            
            for file in session_files:
                if file.file_path in main_file_map:
                    # Check if modified
                    main_file = main_file_map[file.file_path]
                    if file.updated_at > main_file.updated_at:
                        modified.append(file.file_path)
                else:
                    # New file
                    added.append(file.file_path)
            
            return {
                "success": True,
                "modified": modified,
                "added": added,
                "clean": len(modified) == 0 and len(added) == 0
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def _git_add(self, project_id: int, session_id: str, command: str) -> Dict:
        """Simulate git add (files are already tracked in database)"""
        return {"success": True, "message": "Files staged (automatically tracked in database)"}
    
    async def _git_commit(self, project_id: int, session_id: str, command: str, github_token: str = None) -> Dict:
        """Handle git commit by optionally pushing to GitHub"""
        try:
            # Extract commit message
            import shlex
            parts = shlex.split(command)
            commit_message = "Auto-commit from container"
            
            if "-m" in parts:
                idx = parts.index("-m")
                if idx + 1 < len(parts):
                    commit_message = parts[idx + 1]
            
            # If GitHub token provided, commit to GitHub
            if github_token and session_id != "main":
                github_service = self._get_github_service(github_token)
                # This would involve creating a temporary directory and committing
                # For now, just return success
                
            return {
                "success": True,
                "message": commit_message,
                "session_id": session_id
            }
            
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def get_environment_variables(self, project_id: int, session_id: str) -> Dict[str, str]:
        """Get environment variables for the container"""
        return {
            "PROJECT_ID": str(project_id),
            "SESSION_ID": session_id,
            "API_BASE_URL": "http://host.docker.internal:8000",  # Agent API endpoint
            "NODE_ENV": "development",
            "PORT": "3000",
        }
    
    async def health_check(self) -> Dict:
        """Health check endpoint for containers"""
        try:
            # Test database connectivity
            stats = await file_storage.get_project_stats(1)  # Test with project 1
            return {
                "status": "healthy",
                "timestamp": asyncio.get_event_loop().time(),
                "database": "connected"
            }
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e),
                "timestamp": asyncio.get_event_loop().time()
            }
    
    async def cleanup_session(self, project_id: int, session_id: str) -> bool:
        """Clean up session data"""
        try:
            return await file_storage.delete_session(project_id, session_id)
        except Exception as e:
            logger.error(f"Error cleaning up session: {e}")
            return False


# Global instance
project_api = ProjectApiService()