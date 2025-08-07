"""
Project Files API Routes
Provides HTTP endpoints for containers to access project files without filesystem mounting
"""
import logging
from typing import Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.services.project_api_service import project_api

logger = logging.getLogger(__name__)

router = APIRouter()


class WriteFileRequest(BaseModel):
    content: str


class GitCommandRequest(BaseModel):
    command: str
    github_token: Optional[str] = None


class SyncGitHubRequest(BaseModel):
    repo_url: str
    github_token: str


@router.get("/health")
async def health_check():
    """Health check for project API service"""
    return await project_api.health_check()


@router.get("/projects/{project_id}/sessions/{session_id}/files")
async def list_files(
    project_id: int, 
    session_id: str, 
    prefix: str = Query("", description="Filter files by path prefix")
) -> List[Dict]:
    """List files in a project session"""
    return await project_api.list_files(project_id, session_id, prefix)


@router.get("/projects/{project_id}/sessions/{session_id}/files/tree")
async def get_directory_tree(project_id: int, session_id: str) -> Dict:
    """Get directory tree structure for a project session"""
    return await project_api.create_directory_structure(project_id, session_id)


@router.get("/projects/{project_id}/sessions/{session_id}/files/{file_path:path}")
async def read_file(project_id: int, session_id: str, file_path: str) -> Dict:
    """Read a file from project storage"""
    content = await project_api.read_file(project_id, session_id, file_path)
    if content is None:
        raise HTTPException(status_code=404, detail="File not found")
    
    return {
        "path": file_path,
        "content": content,
        "project_id": project_id,
        "session_id": session_id
    }


@router.put("/projects/{project_id}/sessions/{session_id}/files/{file_path:path}")
async def write_file(
    project_id: int, 
    session_id: str, 
    file_path: str, 
    request: WriteFileRequest
) -> Dict:
    """Write a file to project storage"""
    file_obj = await project_api.write_file(project_id, session_id, file_path, request.content)
    
    return {
        "path": file_obj.file_path,
        "size": file_obj.size,
        "mime_type": file_obj.mime_type,
        "project_id": file_obj.project_id,
        "session_id": file_obj.session_id,
        "created_at": file_obj.created_at.isoformat() if file_obj.created_at else None,
        "updated_at": file_obj.updated_at.isoformat() if file_obj.updated_at else None
    }


@router.delete("/projects/{project_id}/sessions/{session_id}/files/{file_path:path}")
async def delete_file(project_id: int, session_id: str, file_path: str) -> Dict:
    """Delete a file from project storage"""
    success = await project_api.delete_file(project_id, session_id, file_path)
    
    if not success:
        raise HTTPException(status_code=404, detail="File not found or could not be deleted")
    
    return {"success": True, "message": f"File {file_path} deleted successfully"}


@router.post("/projects/{project_id}/sessions/{session_id}/initialize")
async def initialize_session(project_id: int, session_id: str) -> Dict:
    """Initialize a new session by copying from main session"""
    success = await project_api.initialize_session_from_main(project_id, session_id)
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to initialize session")
    
    return {
        "success": True,
        "message": f"Session {session_id} initialized from main",
        "project_id": project_id,
        "session_id": session_id
    }


@router.post("/projects/{project_id}/sessions/{session_id}/git")
async def execute_git_command(
    project_id: int, 
    session_id: str, 
    request: GitCommandRequest
) -> Dict:
    """Execute git commands in the session context"""
    return await project_api.execute_git_command(
        project_id, session_id, request.command, request.github_token
    )


@router.post("/projects/{project_id}/sessions/{session_id}/sync")
async def sync_with_github(
    project_id: int, 
    session_id: str, 
    request: SyncGitHubRequest
) -> Dict:
    """Sync session with GitHub repository"""
    return await project_api.sync_with_github(
        project_id, session_id, request.github_token, request.repo_url
    )


@router.get("/projects/{project_id}/sessions/{session_id}/env")
async def get_environment_variables(project_id: int, session_id: str) -> Dict[str, str]:
    """Get environment variables for the container"""
    return await project_api.get_environment_variables(project_id, session_id)


@router.delete("/projects/{project_id}/sessions/{session_id}")
async def cleanup_session(project_id: int, session_id: str) -> Dict:
    """Clean up session data"""
    success = await project_api.cleanup_session(project_id, session_id)
    
    return {
        "success": success,
        "message": f"Session {session_id} {'cleaned up' if success else 'cleanup failed'}",
        "project_id": project_id,
        "session_id": session_id
    }


# Container-specific convenience endpoints
@router.get("/container/init")
async def container_init(
    project_id: int = Query(..., description="Project ID"),
    session_id: str = Query(..., description="Session ID")
) -> Dict:
    """Initialize container with project data"""
    try:
        # Get environment variables
        env_vars = await project_api.get_environment_variables(project_id, session_id)
        
        # Get directory structure
        directory_tree = await project_api.create_directory_structure(project_id, session_id)
        
        # Get file list
        files = await project_api.list_files(project_id, session_id)
        
        return {
            "success": True,
            "project_id": project_id,
            "session_id": session_id,
            "environment": env_vars,
            "directory_tree": directory_tree,
            "file_count": len(files),
            "message": "Container initialized successfully"
        }
        
    except Exception as e:
        logger.error(f"Error initializing container: {e}")
        raise HTTPException(status_code=500, detail=f"Container initialization failed: {e}")


@router.get("/container/package-json")
async def get_package_json(
    project_id: int = Query(..., description="Project ID"),
    session_id: str = Query(..., description="Session ID")
) -> Dict:
    """Get package.json for container dependency installation"""
    content = await project_api.read_file(project_id, session_id, "package.json")
    
    if content is None:
        # Return default Next.js package.json if none exists
        default_package_json = {
            "name": f"project-{project_id}",
            "version": "0.1.0",
            "private": True,
            "scripts": {
                "dev": "next dev",
                "build": "next build",
                "start": "next start",
                "lint": "next lint"
            },
            "dependencies": {
                "next": "14.0.0",
                "react": "^18",
                "react-dom": "^18"
            },
            "devDependencies": {
                "typescript": "^5",
                "@types/node": "^20",
                "@types/react": "^18",
                "@types/react-dom": "^18",
                "eslint": "^8",
                "eslint-config-next": "14.0.0"
            }
        }
        
        import json
        content = json.dumps(default_package_json, indent=2)
    
    return {
        "content": content,
        "exists": content is not None
    }