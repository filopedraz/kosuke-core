import asyncio
import asyncpg
import boto3
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional
from dataclasses import dataclass

from app.utils.config import settings

logger = logging.getLogger(__name__)


@dataclass
class ProjectFile:
    """Represents a file in the project storage system"""
    project_id: int
    session_id: str
    file_path: str
    content: Optional[str] = None
    blob_key: Optional[str] = None  # For large files stored in blob storage
    size: int = 0
    mime_type: str = "text/plain"
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class FileStorageService:
    """
    Production-ready file storage service using PostgreSQL + Digital Ocean Spaces
    
    - Small files (< 1MB): Stored directly in PostgreSQL
    - Large files (>= 1MB): Stored in Digital Ocean Spaces with metadata in PostgreSQL
    - No filesystem mounting required
    - Full CRUD operations via API
    """
    
    def __init__(self):
        self.db_pool: Optional[asyncpg.Pool] = None
        self.spaces_client = None
        self.bucket_name = settings.DO_SPACES_BUCKET
        self.max_db_file_size = 1024 * 1024  # 1MB threshold
        
        # Initialize Digital Ocean Spaces client (S3-compatible)
        if settings.DO_SPACES_ACCESS_KEY:
            self.spaces_client = boto3.client(
                's3',
                endpoint_url=f'https://{settings.DO_SPACES_REGION}.digitaloceanspaces.com',
                aws_access_key_id=settings.DO_SPACES_ACCESS_KEY,
                aws_secret_access_key=settings.DO_SPACES_SECRET_KEY,
                region_name=settings.DO_SPACES_REGION
            )
    
    async def initialize(self):
        """Initialize database connection pool and create tables"""
        try:
            # Create connection pool
            self.db_pool = await asyncpg.create_pool(
                host=settings.DB_HOST,
                port=settings.DB_PORT,
                user=settings.DB_USER,
                password=settings.DB_PASSWORD,
                database=settings.DB_NAME,
                min_size=5,
                max_size=20
            )
            
            # Create tables if they don't exist
            await self._create_tables()
            logger.info("FileStorageService initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize FileStorageService: {e}")
            raise
    
    async def _create_tables(self):
        """Create project files table"""
        async with self.db_pool.acquire() as conn:
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS project_files (
                    id SERIAL PRIMARY KEY,
                    project_id INTEGER NOT NULL,
                    session_id VARCHAR(255) NOT NULL,
                    file_path TEXT NOT NULL,
                    content TEXT,
                    blob_key VARCHAR(500),
                    size INTEGER DEFAULT 0,
                    mime_type VARCHAR(100) DEFAULT 'text/plain',
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    UNIQUE(project_id, session_id, file_path)
                );
                
                CREATE INDEX IF NOT EXISTS idx_project_files_project_session 
                ON project_files(project_id, session_id);
                
                CREATE INDEX IF NOT EXISTS idx_project_files_path 
                ON project_files(file_path);
            """)
    
    async def write_file(self, project_id: int, session_id: str, file_path: str, content: str) -> ProjectFile:
        """Write a file to storage (database or blob storage based on size)"""
        try:
            content_bytes = content.encode('utf-8')
            file_size = len(content_bytes)
            blob_key = None
            stored_content = content
            
            # Store large files in blob storage
            if file_size >= self.max_db_file_size and self.spaces_client:
                blob_key = f"projects/{project_id}/sessions/{session_id}/{file_path}"
                
                # Upload to Digital Ocean Spaces
                self.spaces_client.put_object(
                    Bucket=self.bucket_name,
                    Key=blob_key,
                    Body=content_bytes,
                    ContentType=self._get_mime_type(file_path)
                )
                stored_content = None  # Don't store in database
                logger.info(f"Stored large file in blob storage: {blob_key}")
            
            # Store metadata (and content for small files) in database
            async with self.db_pool.acquire() as conn:
                result = await conn.fetchrow("""
                    INSERT INTO project_files 
                    (project_id, session_id, file_path, content, blob_key, size, mime_type)
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    ON CONFLICT (project_id, session_id, file_path) 
                    DO UPDATE SET 
                        content = EXCLUDED.content,
                        blob_key = EXCLUDED.blob_key,
                        size = EXCLUDED.size,
                        mime_type = EXCLUDED.mime_type,
                        updated_at = NOW()
                    RETURNING *
                """, project_id, session_id, file_path, stored_content, blob_key, file_size, self._get_mime_type(file_path))
                
                return ProjectFile(
                    project_id=result['project_id'],
                    session_id=result['session_id'],
                    file_path=result['file_path'],
                    content=result['content'],
                    blob_key=result['blob_key'],
                    size=result['size'],
                    mime_type=result['mime_type'],
                    created_at=result['created_at'],
                    updated_at=result['updated_at']
                )
                
        except Exception as e:
            logger.error(f"Error writing file {file_path}: {e}")
            raise
    
    async def read_file(self, project_id: int, session_id: str, file_path: str) -> Optional[str]:
        """Read a file from storage"""
        try:
            async with self.db_pool.acquire() as conn:
                result = await conn.fetchrow("""
                    SELECT content, blob_key FROM project_files 
                    WHERE project_id = $1 AND session_id = $2 AND file_path = $3
                """, project_id, session_id, file_path)
                
                if not result:
                    return None
                
                # Return content from database if available
                if result['content'] is not None:
                    return result['content']
                
                # Fetch from blob storage if needed
                if result['blob_key'] and self.spaces_client:
                    response = self.spaces_client.get_object(
                        Bucket=self.bucket_name,
                        Key=result['blob_key']
                    )
                    return response['Body'].read().decode('utf-8')
                
                return None
                
        except Exception as e:
            logger.error(f"Error reading file {file_path}: {e}")
            return None
    
    async def list_files(self, project_id: int, session_id: str, prefix: str = "") -> List[ProjectFile]:
        """List files in a project session"""
        try:
            async with self.db_pool.acquire() as conn:
                query = """
                    SELECT * FROM project_files 
                    WHERE project_id = $1 AND session_id = $2
                """
                params = [project_id, session_id]
                
                if prefix:
                    query += " AND file_path LIKE $3"
                    params.append(f"{prefix}%")
                
                query += " ORDER BY file_path"
                
                results = await conn.fetch(query, *params)
                
                return [
                    ProjectFile(
                        project_id=row['project_id'],
                        session_id=row['session_id'],
                        file_path=row['file_path'],
                        content=row['content'],
                        blob_key=row['blob_key'],
                        size=row['size'],
                        mime_type=row['mime_type'],
                        created_at=row['created_at'],
                        updated_at=row['updated_at']
                    )
                    for row in results
                ]
                
        except Exception as e:
            logger.error(f"Error listing files: {e}")
            return []
    
    async def delete_file(self, project_id: int, session_id: str, file_path: str) -> bool:
        """Delete a file from storage"""
        try:
            async with self.db_pool.acquire() as conn:
                # Get blob key before deletion
                result = await conn.fetchrow("""
                    SELECT blob_key FROM project_files 
                    WHERE project_id = $1 AND session_id = $2 AND file_path = $3
                """, project_id, session_id, file_path)
                
                # Delete from blob storage if needed
                if result and result['blob_key'] and self.spaces_client:
                    try:
                        self.spaces_client.delete_object(
                            Bucket=self.bucket_name,
                            Key=result['blob_key']
                        )
                    except Exception as blob_error:
                        logger.warning(f"Failed to delete blob {result['blob_key']}: {blob_error}")
                
                # Delete from database
                rows_deleted = await conn.execute("""
                    DELETE FROM project_files 
                    WHERE project_id = $1 AND session_id = $2 AND file_path = $3
                """, project_id, session_id, file_path)
                
                return rows_deleted == "DELETE 1"
                
        except Exception as e:
            logger.error(f"Error deleting file {file_path}: {e}")
            return False
    
    async def copy_session(self, project_id: int, source_session: str, target_session: str) -> bool:
        """Copy all files from one session to another"""
        try:
            async with self.db_pool.acquire() as conn:
                # Get all files from source session
                source_files = await conn.fetch("""
                    SELECT * FROM project_files 
                    WHERE project_id = $1 AND session_id = $2
                """, project_id, source_session)
                
                # Copy each file to target session
                for file_row in source_files:
                    # Handle blob storage files
                    new_blob_key = None
                    if file_row['blob_key'] and self.spaces_client:
                        old_blob_key = file_row['blob_key']
                        new_blob_key = old_blob_key.replace(f"/sessions/{source_session}/", f"/sessions/{target_session}/")
                        
                        # Copy blob
                        self.spaces_client.copy_object(
                            Bucket=self.bucket_name,
                            CopySource={'Bucket': self.bucket_name, 'Key': old_blob_key},
                            Key=new_blob_key
                        )
                    
                    # Insert into database
                    await conn.execute("""
                        INSERT INTO project_files 
                        (project_id, session_id, file_path, content, blob_key, size, mime_type)
                        VALUES ($1, $2, $3, $4, $5, $6, $7)
                        ON CONFLICT (project_id, session_id, file_path) DO NOTHING
                    """, project_id, target_session, file_row['file_path'], 
                         file_row['content'], new_blob_key, file_row['size'], file_row['mime_type'])
                
                logger.info(f"Copied {len(source_files)} files from {source_session} to {target_session}")
                return True
                
        except Exception as e:
            logger.error(f"Error copying session: {e}")
            return False
    
    async def delete_session(self, project_id: int, session_id: str) -> bool:
        """Delete all files in a session"""
        try:
            async with self.db_pool.acquire() as conn:
                # Get all blob keys before deletion
                blob_files = await conn.fetch("""
                    SELECT blob_key FROM project_files 
                    WHERE project_id = $1 AND session_id = $2 AND blob_key IS NOT NULL
                """, project_id, session_id)
                
                # Delete from blob storage
                if self.spaces_client:
                    for row in blob_files:
                        try:
                            self.spaces_client.delete_object(
                                Bucket=self.bucket_name,
                                Key=row['blob_key']
                            )
                        except Exception as blob_error:
                            logger.warning(f"Failed to delete blob {row['blob_key']}: {blob_error}")
                
                # Delete from database
                rows_deleted = await conn.execute("""
                    DELETE FROM project_files 
                    WHERE project_id = $1 AND session_id = $2
                """, project_id, session_id)
                
                logger.info(f"Deleted session {session_id}: {rows_deleted}")
                return True
                
        except Exception as e:
            logger.error(f"Error deleting session: {e}")
            return False
    
    def _get_mime_type(self, file_path: str) -> str:
        """Get MIME type based on file extension"""
        ext = Path(file_path).suffix.lower()
        mime_types = {
            '.js': 'application/javascript',
            '.ts': 'application/typescript',
            '.tsx': 'application/typescript',
            '.jsx': 'application/javascript',
            '.json': 'application/json',
            '.css': 'text/css',
            '.html': 'text/html',
            '.md': 'text/markdown',
            '.py': 'text/x-python',
            '.txt': 'text/plain',
            '.yml': 'application/x-yaml',
            '.yaml': 'application/x-yaml',
        }
        return mime_types.get(ext, 'text/plain')
    
    async def get_project_stats(self, project_id: int) -> Dict:
        """Get storage statistics for a project"""
        try:
            async with self.db_pool.acquire() as conn:
                result = await conn.fetchrow("""
                    SELECT 
                        COUNT(*) as file_count,
                        SUM(size) as total_size,
                        COUNT(DISTINCT session_id) as session_count
                    FROM project_files 
                    WHERE project_id = $1
                """, project_id)
                
                return {
                    'file_count': result['file_count'],
                    'total_size': result['total_size'] or 0,
                    'session_count': result['session_count']
                }
                
        except Exception as e:
            logger.error(f"Error getting project stats: {e}")
            return {'file_count': 0, 'total_size': 0, 'session_count': 0}
    
    async def close(self):
        """Close database connections"""
        if self.db_pool:
            await self.db_pool.close()


# Global instance
file_storage = FileStorageService()