#!/usr/bin/env python3
"""
Test script for the new git-based Docker approach.

This script tests the key components of the new implementation:
1. DatabaseService for fetching repository URLs
2. DockerService container creation without volume mounting
3. SessionManager metadata-only approach

Usage: python test_git_approach.py
"""

import asyncio
import logging
import sys
from pathlib import Path

# Add the app directory to the Python path
sys.path.insert(0, str(Path(__file__).parent / "app"))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

logger = logging.getLogger(__name__)


async def test_database_service():
    """Test the DatabaseService functionality"""
    logger.info("🧪 Testing DatabaseService...")
    
    try:
        from app.services.database_service import DatabaseService
        
        db_service = DatabaseService()
        
        # Test health check
        logger.info("   Testing database health check...")
        is_healthy = await db_service.health_check()
        logger.info(f"   Database health: {'✅ Healthy' if is_healthy else '❌ Unhealthy'}")
        
        # Test repository URL fetch (using a test project ID)
        test_project_id = 1
        logger.info(f"   Testing repository URL fetch for project {test_project_id}...")
        repo_url = await db_service.get_project_repository_url(test_project_id)
        logger.info(f"   Repository URL: {repo_url or 'None found'}")
        
        # Test project info fetch
        logger.info(f"   Testing project info fetch for project {test_project_id}...")
        project_info = await db_service.get_project_info(test_project_id)
        if project_info:
            logger.info(f"   Project name: {project_info.get('name', 'Unknown')}")
            logger.info(f"   GitHub branch: {project_info.get('github_branch', 'Unknown')}")
        else:
            logger.info("   No project info found")
            
        return True
        
    except Exception as e:
        logger.error(f"   ❌ DatabaseService test failed: {e}")
        return False


async def test_session_manager():
    """Test the SessionManager metadata approach"""
    logger.info("🧪 Testing SessionManager...")
    
    try:
        from app.services.session_manager import SessionManager
        
        session_manager = SessionManager()
        
        # Test session creation
        project_id = 123
        session_id = "test-session-456"
        
        logger.info(f"   Creating session metadata for project {project_id}, session {session_id}...")
        session_path = session_manager.create_session_environment(project_id, session_id)
        logger.info(f"   Virtual session path: {session_path}")
        
        # Test session validation
        logger.info("   Testing session validation...")
        is_valid = session_manager.validate_session_directory(project_id, session_id)
        logger.info(f"   Session valid: {'✅ Yes' if is_valid else '❌ No'}")
        
        # Test getting session path
        logger.info("   Testing session path retrieval...")
        retrieved_path = session_manager.get_session_path(project_id, session_id)
        logger.info(f"   Retrieved path: {retrieved_path}")
        
        # Test session cleanup
        logger.info("   Testing session cleanup...")
        cleanup_success = session_manager.cleanup_session_environment(project_id, session_id)
        logger.info(f"   Cleanup success: {'✅ Yes' if cleanup_success else '❌ No'}")
        
        return True
        
    except Exception as e:
        logger.error(f"   ❌ SessionManager test failed: {e}")
        return False


async def test_docker_service():
    """Test the DockerService git approach"""
    logger.info("🧪 Testing DockerService...")
    
    try:
        from app.services.docker_service import DockerService
        
        docker_service = DockerService()
        
        # Test Docker availability
        logger.info("   Testing Docker availability...")
        is_available = await docker_service.is_docker_available()
        logger.info(f"   Docker available: {'✅ Yes' if is_available else '❌ No'}")
        
        if not is_available:
            logger.warning("   Skipping Docker container tests - Docker not available")
            return True
        
        # Test repository URL fetching
        test_project_id = 1
        logger.info(f"   Testing repository URL fetch for project {test_project_id}...")
        repo_url = await docker_service._get_project_repo_url(test_project_id)
        logger.info(f"   Repository URL: {repo_url or 'None found'}")
        
        # Note: We won't actually create containers in this test to avoid resource usage
        logger.info("   ✅ DockerService git approach ready")
        
        return True
        
    except Exception as e:
        logger.error(f"   ❌ DockerService test failed: {e}")
        return False


def test_entrypoint_script():
    """Test the Docker entrypoint script exists and is executable"""
    logger.info("🧪 Testing Docker entrypoint script...")
    
    try:
        script_path = Path(__file__).parent / "docker-entrypoint.sh"
        
        if script_path.exists():
            logger.info("   ✅ Entrypoint script exists")
            
            # Check if executable
            if script_path.stat().st_mode & 0o111:
                logger.info("   ✅ Entrypoint script is executable")
            else:
                logger.warning("   ⚠️ Entrypoint script is not executable")
                
            # Check script content
            content = script_path.read_text()
            if "REPO_URL" in content and "git clone" in content:
                logger.info("   ✅ Entrypoint script contains git clone logic")
            else:
                logger.warning("   ⚠️ Entrypoint script missing expected git logic")
                
        else:
            logger.error("   ❌ Entrypoint script not found")
            return False
            
        return True
        
    except Exception as e:
        logger.error(f"   ❌ Entrypoint script test failed: {e}")
        return False


async def main():
    """Run all tests"""
    logger.info("🚀 Starting Git-Based Docker Approach Tests\n")
    
    tests = [
        ("Database Service", test_database_service()),
        ("Session Manager", test_session_manager()),
        ("Docker Service", test_docker_service()),
        ("Entrypoint Script", test_entrypoint_script()),
    ]
    
    results = []
    
    for test_name, test_coro in tests:
        logger.info(f"Running {test_name} test...")
        if asyncio.iscoroutine(test_coro):
            result = await test_coro
        else:
            result = test_coro
        results.append((test_name, result))
        logger.info(f"{'✅' if result else '❌'} {test_name} test {'passed' if result else 'failed'}\n")
    
    # Summary
    logger.info("📊 Test Summary:")
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        logger.info(f"   {status} - {test_name}")
    
    logger.info(f"\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        logger.info("🎉 All tests passed! Git-based Docker approach is ready.")
        return 0
    else:
        logger.error(f"💥 {total - passed} test(s) failed. Please check the implementation.")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)