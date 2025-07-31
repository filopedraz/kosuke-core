import os
import shutil
from pathlib import Path
from typing import Any

import aiofiles

from app.utils.config import settings


class FileSystemService:
    """
    Async file system service that mirrors the TypeScript fs/operations.ts functionality
    """

    def __init__(self):
        self.projects_dir = Path(settings.projects_dir)

    def get_project_path(self, project_id: int) -> Path:
        """Get the absolute path to a project directory"""
        return self.projects_dir / str(project_id)

    async def ensure_projects_dir(self) -> None:
        """Ensure the projects directory exists"""
        self.projects_dir.mkdir(parents=True, exist_ok=True)

    async def file_exists(self, file_path: str) -> bool:
        """Check if a file exists"""
        return Path(file_path).exists()

    async def read_file(self, file_path: str) -> str:
        """
        Read a file's content

        Mirrors the TypeScript readFile function from lib/fs/operations.ts
        """
        try:
            async with aiofiles.open(file_path, "r", encoding="utf-8") as f:
                return await f.read()
        except Exception as error:
            print(f"Failed to read file {file_path}: {error}")
            raise error

    async def create_file(self, file_path: str, content: str) -> None:
        """
        Create a file with the given content

        Mirrors the TypeScript createFile function from lib/fs/operations.ts
        """
        try:
            file_path = Path(file_path)
            # Ensure the directory exists
            file_path.parent.mkdir(parents=True, exist_ok=True)

            async with aiofiles.open(file_path, "w", encoding="utf-8") as f:
                await f.write(content)
        except Exception as error:
            print(f"Failed to create file {file_path}: {error}")
            raise error

    async def update_file(self, file_path: str, content: str) -> None:
        """
        Update a file's content

        Mirrors the TypeScript updateFile function from lib/fs/operations.ts
        """
        try:
            async with aiofiles.open(file_path, "w", encoding="utf-8") as f:
                await f.write(content)
        except Exception as error:
            print(f"Failed to update file {file_path}: {error}")
            raise error

    async def delete_file(self, file_path: str) -> None:
        """
        Delete a file

        Mirrors the TypeScript deleteFile function from lib/fs/operations.ts
        """
        try:
            Path(file_path).unlink()
        except Exception as error:
            print(f"Failed to delete file {file_path}: {error}")
            raise error

    async def create_directory(self, dir_path: str) -> None:
        """Create a directory"""
        try:
            Path(dir_path).mkdir(parents=True, exist_ok=True)
        except Exception as error:
            print(f"Failed to create directory {dir_path}: {error}")
            raise error

    async def delete_directory(self, dir_path: str) -> None:
        """
        Delete a directory and all its contents

        Mirrors the TypeScript deleteDir function from lib/fs/operations.ts
        """
        try:
            shutil.rmtree(dir_path)
        except Exception as error:
            print(f"Failed to delete directory {dir_path}: {error}")
            raise error

    async def list_files(self, dir_path: str) -> list[str]:
        """
        List files in a directory

        Mirrors the TypeScript listFiles function from lib/fs/operations.ts
        """
        try:
            return list(os.listdir(dir_path))
        except Exception as error:
            print(f"Failed to list files in directory {dir_path}: {error}")
            raise error

    async def list_files_recursively(self, dir_path: str) -> list[str]:
        """
        List files in a directory recursively, excluding common build/dependency directories

        Mirrors the TypeScript listFilesRecursively function from lib/fs/operations.ts
        """
        files = []
        dir_path = Path(dir_path)

        # Directories to exclude from recursive search
        exclude_dirs = {".next", "node_modules", ".git", "dist", "build", "__pycache__", "venv", ".venv", "coverage"}

        try:
            for file_path in dir_path.rglob("*"):
                if file_path.is_file():
                    # Check if any parent directory is in the exclude list
                    should_exclude = False
                    for parent in file_path.parents:
                        if parent.name in exclude_dirs:
                            should_exclude = True
                            break

                    if not should_exclude:
                        relative_path = file_path.relative_to(dir_path)
                        files.append(str(relative_path))

            return files
        except Exception as error:
            print(f"Failed to list files recursively in directory {dir_path}: {error}")
            raise error

    def list_files_recursively_sync(self, dir_path: str) -> list[str]:
        """
        Synchronous version of list_files_recursively for initialization use

        List files in a directory recursively, excluding common build/dependency directories
        """
        files = []
        dir_path = Path(dir_path)

        # Directories to exclude from recursive search
        exclude_dirs = {".next", "node_modules", ".git", "dist", "build", "__pycache__", "venv", ".venv", "coverage"}

        try:
            for file_path in dir_path.rglob("*"):
                if file_path.is_file():
                    # Check if any parent directory is in the exclude list
                    should_exclude = False
                    for parent in file_path.parents:
                        if parent.name in exclude_dirs:
                            should_exclude = True
                            break

                    if not should_exclude:
                        relative_path = file_path.relative_to(dir_path)
                        files.append(str(relative_path))

            return files
        except Exception as error:
            print(f"Failed to list files recursively in directory {dir_path}: {error}")
            raise error

    async def copy_file(self, source_path: str, destination_path: str) -> None:
        """
        Copy a file

        Mirrors the TypeScript copyFile function from lib/fs/operations.ts
        """
        try:
            # Ensure the destination directory exists
            dest_dir = Path(destination_path).parent
            dest_dir.mkdir(parents=True, exist_ok=True)

            # Copy the file
            shutil.copy2(source_path, destination_path)
        except Exception as error:
            print(f"Failed to copy file from {source_path} to {destination_path}: {error}")
            raise error

    async def copy_directory(self, source_dir: str, destination_dir: str) -> None:
        """
        Copy a directory recursively

        Mirrors the TypeScript copyDir function from lib/fs/operations.ts
        """
        try:
            shutil.copytree(source_dir, destination_dir, dirs_exist_ok=True)
        except Exception as error:
            print(f"Failed to copy directory from {source_dir} to {destination_dir}: {error}")
            raise error

    async def get_file_content(self, project_id: int, file_path: str) -> str:
        """
        Get the content of a file in a project

        Mirrors the TypeScript getFileContent function from lib/fs/operations.ts
        """
        try:
            project_dir = self.get_project_path(project_id)
            full_path = project_dir / file_path

            # Check if the file exists
            if not full_path.exists():
                raise FileNotFoundError(f"File not found: {file_path}")

            return await self.read_file(str(full_path))
        except Exception as error:
            print(f"Error reading file {file_path} in project {project_id}: {error}")
            raise error

    def get_project_files_sync(self, project_id: int) -> list[dict[str, Any]]:
        """
        Synchronous version of getting project files for tree structure

        Mirrors the TypeScript getProjectFiles function from lib/fs/operations.ts
        """
        try:
            project_dir = self.get_project_path(project_id)

            if not project_dir.exists():
                print(f"Project directory not found: {project_dir}")
                return []

            return self._read_directory_recursive(project_dir, "")
        except Exception as error:
            print(f"Error getting project files for project {project_id}: {error}")
            return []

    def _read_directory_recursive(self, base_path: Path, relative_path: str) -> list[dict[str, Any]]:
        """
        Read a directory recursively and return file tree structure

        Mirrors the TypeScript readDirectoryRecursive function
        """
        full_path = base_path / relative_path

        # Skip excluded directories
        exclude_dirs = {".next", "node_modules", ".git", "dist", "build", "__pycache__"}

        try:
            entries = list(full_path.iterdir())
        except PermissionError:
            return []

        nodes = []

        for entry in entries:
            entry_relative_path = str(Path(relative_path) / entry.name) if relative_path else entry.name

            # Skip excluded directories
            if entry.is_dir() and entry.name in exclude_dirs:
                continue

            if entry.is_dir():
                children = self._read_directory_recursive(base_path, entry_relative_path)
                nodes.append(
                    {"name": entry.name, "path": entry_relative_path, "type": "directory", "children": children}
                )
            else:
                nodes.append({"name": entry.name, "path": entry_relative_path, "type": "file", "hasChanges": False})

        # Sort directories first, then files, both alphabetically
        nodes.sort(key=lambda x: (x["type"] == "file", x["name"].lower()))

        return nodes


# Global instance
fs_service = FileSystemService()
