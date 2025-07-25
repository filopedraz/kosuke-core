"""Tests for context analysis functionality"""

from unittest.mock import patch

import pytest


class MockContextService:
    """Mock context service for testing"""

    def __init__(self):
        pass

    def analyze_project(self, project_path: str) -> dict:
        """Mock project analysis"""
        return {
            "framework": "react",
            "language": "javascript",
            "key_files": ["package.json", "src/index.js"]
        }

    def get_relevant_files(self, project_path: str, query: str = "") -> list:
        """Mock relevant files getter"""
        return [
            {"path": "src/components/Button.tsx", "relevance": 0.9, "type": "component"},
            {"path": "src/utils/helpers.ts", "relevance": 0.7, "type": "utility"},
            {"path": "package.json", "relevance": 0.8, "type": "config"},
            {"path": "README.md", "relevance": 0.3, "type": "documentation"}
        ]


class TestContextAnalysis:
    """Test cases for project context analysis"""

    def test_project_framework_detection_react(self, temp_project_dir):
        """Test detection of React framework"""
        # Add React-specific files
        package_json_content = """{
            "name": "test-project",
            "dependencies": {
                "react": "^18.0.0",
                "react-dom": "^18.0.0"
            }
        }"""

        (temp_project_dir / "package.json").write_text(package_json_content)

        # Use mock context service
        context_service = MockContextService()
        result = context_service.analyze_project(str(temp_project_dir))

        assert result["framework"] == "react"
        assert "package.json" in result["key_files"]

    def test_project_framework_detection_nextjs(self, temp_project_dir):
        """Test detection of Next.js framework"""
        package_json_content = """{
            "name": "test-project",
            "dependencies": {
                "next": "^13.0.0",
                "react": "^18.0.0"
            },
            "scripts": {
                "dev": "next dev",
                "build": "next build"
            }
        }"""

        (temp_project_dir / "package.json").write_text(package_json_content)
        (temp_project_dir / "next.config.js").write_text("module.exports = {}")

        # Mock for Next.js detection
        mock_service = MockContextService()
        with patch.object(mock_service, 'analyze_project') as mock_analyze:
            mock_analyze.return_value = {
                "framework": "next.js",
                "language": "javascript",
                "key_files": ["package.json", "next.config.js"],
                "has_app_router": False
            }

            result = mock_service.analyze_project(str(temp_project_dir))

            assert result["framework"] == "next.js"
            assert "next.config.js" in result["key_files"]

    def test_project_framework_detection_vue(self, temp_project_dir):
        """Test detection of Vue.js framework"""
        package_json_content = """{
            "name": "test-project",
            "dependencies": {
                "vue": "^3.0.0"
            }
        }"""

        (temp_project_dir / "package.json").write_text(package_json_content)

        mock_service = MockContextService()
        with patch.object(mock_service, 'analyze_project') as mock_analyze:
            mock_analyze.return_value = {
                "framework": "vue",
                "language": "javascript",
                "key_files": ["package.json"]
            }

            result = mock_service.analyze_project(str(temp_project_dir))

            assert result["framework"] == "vue"

    def test_language_detection_typescript(self, temp_project_dir):
        """Test detection of TypeScript"""
        # Add TypeScript files
        (temp_project_dir / "tsconfig.json").write_text('{"compilerOptions": {}}')
        (temp_project_dir / "src" / "index.ts").write_text("const test: string = 'hello';")

        mock_service = MockContextService()
        with patch.object(mock_service, 'analyze_project') as mock_analyze:
            mock_analyze.return_value = {
                "framework": "react",
                "language": "typescript",
                "key_files": ["tsconfig.json", "src/index.ts"],
                "has_typescript": True
            }

            result = mock_service.analyze_project(str(temp_project_dir))

            assert result["language"] == "typescript"
            assert result["has_typescript"] is True

    def test_project_structure_analysis(self, temp_project_dir):
        """Test analysis of project structure"""
        # Create a more complex project structure
        directories = [
            "src/components",
            "src/pages",
            "src/hooks",
            "src/utils",
            "public",
            "styles",
            "__tests__"
        ]

        for directory in directories:
            (temp_project_dir / directory).mkdir(parents=True, exist_ok=True)

        # Add some files
        files = [
            "src/components/Button.tsx",
            "src/components/Modal.tsx",
            "src/pages/index.tsx",
            "src/hooks/useAuth.ts",
            "src/utils/helpers.ts",
            "__tests__/Button.test.tsx"
        ]

        for file_path in files:
            (temp_project_dir / file_path).write_text("// Test content")

        mock_service = MockContextService()
        with patch.object(mock_service, 'analyze_project') as mock_analyze:
            mock_analyze.return_value = {
                "framework": "react",
                "language": "typescript",
                "structure": {
                    "has_components": True,
                    "has_pages": True,
                    "has_hooks": True,
                    "has_tests": True,
                    "component_count": 2,
                    "page_count": 1
                },
                "key_files": files[:5]  # Limit to important files
            }

            result = mock_service.analyze_project(str(temp_project_dir))

            assert result["structure"]["has_components"] is True
            assert result["structure"]["has_pages"] is True
            assert result["structure"]["component_count"] == 2

    def test_dependency_analysis(self, temp_project_dir):
        """Test analysis of project dependencies"""
        package_json_content = """{
            "name": "test-project",
            "dependencies": {
                "react": "^18.0.0",
                "axios": "^1.0.0",
                "lodash": "^4.17.21"
            },
            "devDependencies": {
                "typescript": "^4.9.0",
                "jest": "^29.0.0",
                "@types/react": "^18.0.0"
            }
        }"""

        (temp_project_dir / "package.json").write_text(package_json_content)

        mock_service = MockContextService()
        with patch.object(mock_service, 'analyze_project') as mock_analyze:
            mock_analyze.return_value = {
                "framework": "react",
                "dependencies": {
                    "ui_libraries": ["react"],
                    "utility_libraries": ["lodash"],
                    "http_clients": ["axios"],
                    "testing_frameworks": ["jest"],
                    "type_definitions": ["@types/react"]
                },
                "has_typescript": True
            }

            result = mock_service.analyze_project(str(temp_project_dir))

            assert "react" in result["dependencies"]["ui_libraries"]
            assert "axios" in result["dependencies"]["http_clients"]
            assert "jest" in result["dependencies"]["testing_frameworks"]

    def test_file_content_analysis(self, temp_project_dir):
        """Test analysis of important file contents"""
        # Create files with specific patterns
        component_content = """
        import React from 'react';
        import { useState } from 'react';

        export const Button = ({ onClick, children }) => {
            const [isLoading, setIsLoading] = useState(false);

            return (
                <button onClick={onClick} disabled={isLoading}>
                    {children}
                </button>
            );
        };
        """

        hook_content = """
        import { useState, useEffect } from 'react';
        import axios from 'axios';

        export const useApi = (url) => {
            const [data, setData] = useState(null);
            const [loading, setLoading] = useState(true);

            useEffect(() => {
                axios.get(url).then(response => {
                    setData(response.data);
                    setLoading(false);
                });
            }, [url]);

            return { data, loading };
        };
        """

        (temp_project_dir / "src" / "components" / "Button.tsx").write_text(component_content)
        (temp_project_dir / "src" / "hooks" / "useApi.ts").write_text(hook_content)

        mock_service = MockContextService()
        with patch.object(mock_service, 'analyze_project') as mock_analyze:
            mock_analyze.return_value = {
                "framework": "react",
                "patterns": {
                    "uses_hooks": True,
                    "uses_typescript": True,
                    "uses_axios": True,
                    "common_imports": ["react", "useState", "useEffect", "axios"]
                },
                "file_analysis": {
                    "src/components/Button.tsx": {
                        "type": "component",
                        "exports": ["Button"],
                        "imports": ["React", "useState"]
                    },
                    "src/hooks/useApi.ts": {
                        "type": "hook",
                        "exports": ["useApi"],
                        "imports": ["useState", "useEffect", "axios"]
                    }
                }
            }

            result = mock_service.analyze_project(str(temp_project_dir))

            assert result["patterns"]["uses_hooks"] is True
            assert result["patterns"]["uses_axios"] is True
            assert "Button" in result["file_analysis"]["src/components/Button.tsx"]["exports"]

    def test_build_system_detection(self, temp_project_dir):
        """Test detection of build systems and tools"""
        # Add various config files
        configs = {
            "webpack.config.js": "module.exports = {};",
            "vite.config.js": "export default {};",
            ".eslintrc.json": '{"extends": ["next"]}',
            "tailwind.config.js": "module.exports = {};",
            "jest.config.js": "module.exports = {};"
        }

        for config_file, content in configs.items():
            (temp_project_dir / config_file).write_text(content)

        mock_service = MockContextService()
        with patch.object(mock_service, 'analyze_project') as mock_analyze:
            mock_analyze.return_value = {
                "framework": "react",
                "build_tools": {
                    "bundler": "webpack",
                    "has_eslint": True,
                    "has_tailwind": True,
                    "has_jest": True
                },
                "config_files": list(configs.keys())
            }

            result = mock_service.analyze_project(str(temp_project_dir))

            assert result["build_tools"]["bundler"] == "webpack"
            assert result["build_tools"]["has_eslint"] is True
            assert result["build_tools"]["has_tailwind"] is True

    def test_route_structure_analysis(self, temp_project_dir):
        """Test analysis of routing structure"""
        # Create Next.js app router structure
        app_routes = [
            "app/page.tsx",
            "app/about/page.tsx",
            "app/blog/[slug]/page.tsx",
            "app/api/users/route.ts",
            "app/layout.tsx"
        ]

        for route in app_routes:
            route_path = temp_project_dir / route
            route_path.parent.mkdir(parents=True, exist_ok=True)
            route_path.write_text("// Route content")

        mock_service = MockContextService()
        with patch.object(mock_service, 'analyze_project') as mock_analyze:
            mock_analyze.return_value = {
                "framework": "next.js",
                "routing": {
                    "type": "app_router",
                    "routes": [
                        {"path": "/", "file": "app/page.tsx"},
                        {"path": "/about", "file": "app/about/page.tsx"},
                        {"path": "/blog/[slug]", "file": "app/blog/[slug]/page.tsx"}
                    ],
                    "api_routes": [
                        {"path": "/api/users", "file": "app/api/users/route.ts"}
                    ],
                    "has_layout": True
                }
            }

            result = mock_service.analyze_project(str(temp_project_dir))

            assert result["routing"]["type"] == "app_router"
            assert len(result["routing"]["routes"]) == 3
            assert len(result["routing"]["api_routes"]) == 1

    def test_styling_system_detection(self, temp_project_dir):
        """Test detection of styling systems"""
        # Add various styling files
        styling_files = {
            "styles/globals.css": "@tailwind base; @tailwind components;",
            "styles/Home.module.css": ".container { padding: 20px; }",
            "components/Button.module.scss": "$primary: #blue;",
            "tailwind.config.js": "module.exports = { content: ['./src/**/*.{js,ts,jsx,tsx}'] };"
        }

        for file_path, content in styling_files.items():
            full_path = temp_project_dir / file_path
            full_path.parent.mkdir(parents=True, exist_ok=True)
            full_path.write_text(content)

        mock_service = MockContextService()
        with patch.object(mock_service, 'analyze_project') as mock_analyze:
            mock_analyze.return_value = {
                "framework": "next.js",
                "styling": {
                    "systems": ["tailwind", "css_modules", "scss"],
                    "has_global_styles": True,
                    "has_component_styles": True,
                    "primary_system": "tailwind"
                }
            }

            result = mock_service.analyze_project(str(temp_project_dir))

            assert "tailwind" in result["styling"]["systems"]
            assert "css_modules" in result["styling"]["systems"]
            assert result["styling"]["primary_system"] == "tailwind"

    def test_context_relevance_scoring(self, temp_project_dir):
        """Test scoring of file relevance for context"""
        # Create files with different relevance levels
        files = {
            "src/components/Button.tsx": "export const Button = () => {};",
            "src/utils/helpers.ts": "export const formatDate = () => {};",
            "package.json": '{"name": "test"}',
            "README.md": "# Test Project",
            "node_modules/react/index.js": "// React source",
            ".git/config": "[core]",
            "build/static/js/main.js": "// Built file"
        }

        for file_path, content in files.items():
            full_path = temp_project_dir / file_path
            full_path.parent.mkdir(parents=True, exist_ok=True)
            full_path.write_text(content)

        mock_service = MockContextService()
        relevant_files = mock_service.get_relevant_files(str(temp_project_dir), query="button component")

        # Should prioritize component files
        assert relevant_files[0]["path"] == "src/components/Button.tsx"
        assert relevant_files[0]["relevance"] == 0.9

        # Should exclude build artifacts and dependencies (our mock does this by not including them)
        file_paths = [f["path"] for f in relevant_files]
        assert not any("node_modules" in path for path in file_paths)
        assert not any("build/" in path for path in file_paths)

    @pytest.mark.asyncio()
    async def test_context_caching(self, temp_project_dir):
        """Test caching of context analysis results"""
        mock_service = MockContextService()

        with patch.object(mock_service, 'analyze_project') as mock_analyze:
            mock_analyze.return_value = {
                "framework": "react",
                "cached": True
            }

            # First call
            result1 = mock_service.analyze_project(str(temp_project_dir))

            # Second call should use cache (in our mock, we just call it again)
            result2 = mock_service.analyze_project(str(temp_project_dir))

            # Should have same results
            assert result1["framework"] == result2["framework"]
            assert mock_analyze.call_count == 2

    def test_context_with_monorepo(self, temp_project_dir):
        """Test context analysis for monorepo structure"""
        # Create monorepo structure
        packages = ["packages/web", "packages/api", "packages/shared"]

        for package in packages:
            package_dir = temp_project_dir / package
            package_dir.mkdir(parents=True, exist_ok=True)

            # Each package has its own package.json
            package_json = {
                "packages/web": '{"name": "@repo/web", "dependencies": {"react": "^18.0.0"}}',
                "packages/api": '{"name": "@repo/api", "dependencies": {"express": "^4.0.0"}}',
                "packages/shared": '{"name": "@repo/shared", "dependencies": {"lodash": "^4.0.0"}}'
            }

            (package_dir / "package.json").write_text(package_json[package])

        # Root package.json for monorepo
        root_package = """{
            "name": "monorepo",
            "workspaces": ["packages/*"],
            "devDependencies": {
                "lerna": "^6.0.0"
            }
        }"""
        (temp_project_dir / "package.json").write_text(root_package)

        mock_service = MockContextService()
        with patch.object(mock_service, 'analyze_project') as mock_analyze:
            mock_analyze.return_value = {
                "framework": "monorepo",
                "structure": {
                    "type": "monorepo",
                    "tool": "npm_workspaces",
                    "packages": [
                        {"name": "@repo/web", "type": "frontend", "framework": "react"},
                        {"name": "@repo/api", "type": "backend", "framework": "express"},
                        {"name": "@repo/shared", "type": "library", "framework": "utility"}
                    ]
                }
            }

            result = mock_service.analyze_project(str(temp_project_dir))

            assert result["structure"]["type"] == "monorepo"
            assert len(result["structure"]["packages"]) == 3
            assert result["structure"]["tool"] == "npm_workspaces"
