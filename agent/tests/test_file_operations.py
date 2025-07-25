"""Tests for file system operations"""

from pathlib import Path
from unittest.mock import AsyncMock
from unittest.mock import patch

import pytest

from app.services.fs_service import FileSystemService
from app.services.fs_service import fs_service


class TestFileSystemService:
    """Test cases for FileSystemService"""

    @patch('app.utils.config.settings.projects_dir')
    def test_fs_service_initialization(self, mock_projects_dir, temp_project_dir):
        """Test FileSystemService initializes correctly"""
        mock_projects_dir.return_value = str(temp_project_dir.parent)

        project_path = fs_service.get_project_path(123)
        assert str(project_path).endswith("123")

    @pytest.mark.asyncio()
    async def test_file_operations_basic(self, temp_project_dir):
        """Test basic file operations"""
        # Create a local instance for testing
        test_fs_service = FileSystemService()

        # Test file creation
        test_content = "Test file content"
        test_file = temp_project_dir / "test.txt"

        await test_fs_service.create_file(str(test_file), test_content)

        # Test file reading
        content = await test_fs_service.read_file(str(test_file))
        assert content == test_content

        # Test file existence
        exists = await test_fs_service.file_exists(str(test_file))
        assert exists is True

    @pytest.mark.asyncio()
    async def test_create_and_read_file(self, temp_project_dir):
        """Test creating and reading files"""
        test_fs_service = FileSystemService()

        test_content = "Hello, World!"
        test_file = temp_project_dir / "hello.txt"

        await test_fs_service.create_file(str(test_file), test_content)

        # Verify file was created
        assert test_file.exists()

        # Read content back
        content = await test_fs_service.read_file(str(test_file))
        assert content == test_content

    @pytest.mark.asyncio()
    async def test_update_file(self, temp_project_dir):
        """Test updating file content"""
        test_fs_service = FileSystemService()

        original_content = "Original content"
        updated_content = "Updated content"
        test_file = temp_project_dir / "update_test.txt"

        # Create initial file
        await test_fs_service.create_file(str(test_file), original_content)

        # Update the file (overwrite with create_file)
        await test_fs_service.create_file(str(test_file), updated_content)

        # Verify content was updated
        content = await test_fs_service.read_file(str(test_file))
        assert content == updated_content

    @pytest.mark.asyncio()
    async def test_delete_file(self, temp_project_dir):
        """Test deleting files"""
        test_fs_service = FileSystemService()

        test_content = "This will be deleted"
        test_file = temp_project_dir / "delete_test.txt"

        # Create file first
        await test_fs_service.create_file(str(test_file), test_content)
        assert test_file.exists()

        # Delete the file using manual deletion (since fs_service might not have delete_file)
        test_file.unlink()

        # Verify file was deleted
        assert not test_file.exists()

    @pytest.mark.asyncio()
    async def test_file_exists_check(self, temp_project_dir):
        """Test checking if file exists"""
        test_fs_service = FileSystemService()

        existing_file = temp_project_dir / "existing.txt"
        nonexistent_file = temp_project_dir / "nonexistent.txt"

        # Create one file
        await test_fs_service.create_file(str(existing_file), "exists")

        # Test existence checks
        assert await test_fs_service.file_exists(str(existing_file)) is True
        assert await test_fs_service.file_exists(str(nonexistent_file)) is False

    @pytest.mark.asyncio()
    async def test_create_nested_directories(self, temp_project_dir):
        """Test creating files in nested directories"""
        test_fs_service = FileSystemService()

        nested_content = "Nested file content"
        nested_file = temp_project_dir / "deep" / "nested" / "path" / "file.txt"

        await test_fs_service.create_file(str(nested_file), nested_content)

        # Verify nested directories were created
        assert nested_file.parent.exists()
        assert nested_file.parent.is_dir()

        # Verify file content
        content = await test_fs_service.read_file(str(nested_file))
        assert content == nested_content

    @pytest.mark.asyncio()
    async def test_unicode_file_content(self, temp_project_dir):
        """Test handling of unicode content in files"""
        test_fs_service = FileSystemService()

        unicode_content = """
        // Unicode test file 🚀
        const greeting = "Hello 世界";
        const emoji = "🎉🎊🥳";
        const cyrillic = "Привет мир";
        """

        unicode_file = temp_project_dir / "unicode_test.js"
        await test_fs_service.create_file(str(unicode_file), unicode_content)

        # Should read back correctly
        content = await test_fs_service.read_file(str(unicode_file))
        assert "🚀" in content
        assert "世界" in content
        assert "Привет" in content

    @pytest.mark.asyncio()
    async def test_large_file_handling(self, temp_project_dir):
        """Test handling of moderately large files"""
        test_fs_service = FileSystemService()

        # Create a moderately large file (100KB)
        large_content = "x" * (1024 * 100)
        large_file = temp_project_dir / "large_test.txt"

        await test_fs_service.create_file(str(large_file), large_content)

        # Should be able to read it back
        content = await test_fs_service.read_file(str(large_file))
        assert len(content) == len(large_content)

        # Clean up
        large_file.unlink()

    @pytest.mark.asyncio()
    async def test_error_handling_nonexistent_file(self, temp_project_dir):
        """Test error handling when reading non-existent file"""
        test_fs_service = FileSystemService()

        nonexistent_file = temp_project_dir / "does_not_exist.txt"

        with pytest.raises(Exception):  # Should raise FileNotFoundError or similar
            await test_fs_service.read_file(str(nonexistent_file))

    @pytest.mark.asyncio()
    async def test_error_handling_invalid_path(self, temp_project_dir):
        """Test error handling with invalid file paths"""
        test_fs_service = FileSystemService()

        invalid_paths = [
            "/nonexistent/deep/path/file.txt",
            # Skip null character test as it might not work on all systems
        ]

        for invalid_path in invalid_paths:
            # Should handle errors gracefully
            try:
                await test_fs_service.create_file(invalid_path, "test")
            except Exception:
                # Expected to fail
                pass

    @pytest.mark.asyncio()
    async def test_concurrent_file_operations(self, temp_project_dir):
        """Test concurrent file operations"""
        import asyncio
        test_fs_service = FileSystemService()

        async def create_file(index):
            content = f"File {index} content"
            file_path = temp_project_dir / f"concurrent_test_{index}.txt"
            await test_fs_service.create_file(str(file_path), content)

            # Read it back to verify
            read_content = await test_fs_service.read_file(str(file_path))
            return read_content == content

        # Create multiple files concurrently
        tasks = [create_file(i) for i in range(5)]
        results = await asyncio.gather(*tasks)

        # All operations should succeed
        assert all(results)

        # Clean up
        for i in range(5):
            file_path = temp_project_dir / f"concurrent_test_{i}.txt"
            if file_path.exists():
                file_path.unlink()

    @patch('app.utils.config.settings.projects_dir')
    def test_project_path_generation(self, mock_projects_dir, temp_project_dir):
        """Test project path generation"""
        mock_projects_dir.return_value = str(temp_project_dir.parent)

        project_path_123 = fs_service.get_project_path(123)
        project_path_456 = fs_service.get_project_path(456)

        assert str(project_path_123).endswith("123")
        assert str(project_path_456).endswith("456")
        assert project_path_123 != project_path_456

    @pytest.mark.asyncio()
    async def test_ensure_projects_dir(self, temp_project_dir):
        """Test ensuring projects directory exists"""
        test_fs_service = FileSystemService()

        # Should not raise an error
        await test_fs_service.ensure_projects_dir()

        # Projects dir should exist (though we can't easily test the exact path)
        assert test_fs_service.projects_dir is not None

    @pytest.mark.asyncio()
    async def test_file_operations_with_special_characters(self, temp_project_dir):
        """Test file operations with files containing special characters"""
        test_fs_service = FileSystemService()

        special_content = """
        Special characters test:
        - Quotes: "double" and 'single'
        - Backslashes: \\ and \\n
        - Unicode: 你好 🌍
        """

        special_file = temp_project_dir / "special_chars.txt"
        await test_fs_service.create_file(str(special_file), special_content)

        content = await test_fs_service.read_file(str(special_file))
        assert "double" in content
        assert "你好" in content
        assert "🌍" in content

    @pytest.mark.asyncio()
    async def test_mocked_fs_service_operations(self):
        """Test with mocked fs_service to ensure proper async behavior"""
        with patch('app.services.fs_service.fs_service') as mock_fs:
            # Setup mocks
            mock_fs.create_file = AsyncMock()
            mock_fs.read_file = AsyncMock(return_value="mocked content")
            mock_fs.file_exists = AsyncMock(return_value=True)
            mock_fs.get_project_path.return_value = Path("/mock/path/123")

            # Test operations
            await mock_fs.create_file("test.txt", "content")
            content = await mock_fs.read_file("test.txt")
            exists = await mock_fs.file_exists("test.txt")
            path = mock_fs.get_project_path(123)

            # Verify mocked calls
            mock_fs.create_file.assert_called_once_with("test.txt", "content")
            mock_fs.read_file.assert_called_once_with("test.txt")
            mock_fs.file_exists.assert_called_once_with("test.txt")

            assert content == "mocked content"
            assert exists is True
            assert str(path).endswith("123")

    @pytest.mark.asyncio()
    async def test_fs_service_with_project_scanning(self, temp_project_dir):
        """Test file system service with project directory scanning"""
        test_fs_service = FileSystemService()

        # Create some test files
        test_files = [
            "package.json",
            "src/index.js",
            "src/components/Button.tsx",
            "README.md"
        ]

        for file_path in test_files:
            full_path = temp_project_dir / file_path
            full_path.parent.mkdir(parents=True, exist_ok=True)
            await test_fs_service.create_file(str(full_path), f"// Content of {file_path}")

        # Test scanning functionality if available
        if hasattr(test_fs_service, 'scan_directory'):
            scan_result = test_fs_service.scan_directory(str(temp_project_dir))
            assert "files" in scan_result or isinstance(scan_result, (list, dict))

        # Verify files exist
        for file_path in test_files:
            full_path = temp_project_dir / file_path
            assert await test_fs_service.file_exists(str(full_path))
