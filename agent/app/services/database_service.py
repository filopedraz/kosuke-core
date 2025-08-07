"""
Database service for fetching project information
"""
import logging
import os
from typing import Optional

logger = logging.getLogger(__name__)


class DatabaseService:
    """
    Simple database service for fetching project information.
    
    This service provides access to project data stored in PostgreSQL,
    specifically for getting repository URLs for the git clone approach.
    """

    def __init__(self):
        # Database connection parameters
        self.host = os.getenv("POSTGRES_HOST", "localhost")
        self.port = int(os.getenv("POSTGRES_PORT", "5432"))
        self.database = os.getenv("POSTGRES_DB", "kosuke")
        self.user = os.getenv("POSTGRES_USER", "postgres")
        self.password = os.getenv("POSTGRES_PASSWORD", "postgres")
        
        logger.info(f"DatabaseService initialized for {self.host}:{self.port}/{self.database}")

    async def get_project_repository_url(self, project_id: int) -> Optional[str]:
        """
        Get the repository URL for a project from the database.
        
        Args:
            project_id: The project ID to fetch
            
        Returns:
            The GitHub repository URL if found, None otherwise
        """
        try:
            import asyncpg
            
            # Connect to database
            conn = await asyncpg.connect(
                host=self.host,
                port=self.port,
                user=self.user,
                password=self.password,
                database=self.database
            )
            
            try:
                # Query for the repository URL
                query = "SELECT github_repo_url FROM projects WHERE id = $1"
                result = await conn.fetchval(query, project_id)
                
                if result:
                    logger.info(f"Found repository URL for project {project_id}: {result}")
                    return result
                else:
                    logger.warning(f"No repository URL found for project {project_id}")
                    return None
                    
            finally:
                await conn.close()
                
        except Exception as e:
            logger.error(f"Error fetching repository URL for project {project_id}: {e}")
            return None

    async def get_project_info(self, project_id: int) -> Optional[dict]:
        """
        Get comprehensive project information from the database.
        
        Args:
            project_id: The project ID to fetch
            
        Returns:
            Project information dictionary if found, None otherwise
        """
        try:
            import asyncpg
            
            # Connect to database
            conn = await asyncpg.connect(
                host=self.host,
                port=self.port,
                user=self.user,
                password=self.password,
                database=self.database
            )
            
            try:
                # Query for project information
                query = """
                    SELECT id, name, description, github_repo_url, github_owner, 
                           github_repo_name, github_branch, default_branch, auto_commit
                    FROM projects 
                    WHERE id = $1
                """
                result = await conn.fetchrow(query, project_id)
                
                if result:
                    project_info = dict(result)
                    logger.info(f"Found project info for project {project_id}: {project_info['name']}")
                    return project_info
                else:
                    logger.warning(f"No project found with ID {project_id}")
                    return None
                    
            finally:
                await conn.close()
                
        except Exception as e:
            logger.error(f"Error fetching project info for project {project_id}: {e}")
            return None

    async def health_check(self) -> bool:
        """
        Check if the database connection is working.
        
        Returns:
            True if database is accessible, False otherwise
        """
        try:
            import asyncpg
            
            conn = await asyncpg.connect(
                host=self.host,
                port=self.port,
                user=self.user,
                password=self.password,
                database=self.database
            )
            
            try:
                # Simple health check query
                await conn.fetchval("SELECT 1")
                logger.debug("Database health check passed")
                return True
                
            finally:
                await conn.close()
                
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            return False
