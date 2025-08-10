import logging
import re
from typing import Any

import asyncpg

from app.utils.config import settings

logger = logging.getLogger(__name__)


def _validate_table_name(table_name: str) -> str:
    """Validate and sanitize table name to prevent SQL injection"""
    # Only allow alphanumeric characters, underscores, and hyphens
    if not re.match(r"^[a-zA-Z0-9_-]+$", table_name):
        raise ValueError(f"Invalid table name: {table_name}")
    return table_name


class DatabaseService:
    def __init__(self, project_id: int, session_id: str | None = None):
        self.project_id = project_id
        self.session_id = session_id

        # Always use session-specific database pattern; require explicit session_id
        if not session_id:
            raise ValueError("session_id is required for DatabaseService")
        self.db_name = f"kosuke_project_{project_id}_session_{session_id}"

    async def _get_connection(self) -> asyncpg.Connection:
        """Get database connection; creates the database if it does not exist."""
        try:
            return await asyncpg.connect(
                host=settings.postgres_host,
                port=settings.postgres_port,
                user=settings.postgres_user,
                password=settings.postgres_password,
                database=self.db_name,
            )
        except asyncpg.InvalidCatalogNameError:
            # Create the preferred database when it does not exist
            await self._create_database()
            # Try connecting again to the preferred DB
            return await asyncpg.connect(
                host=settings.postgres_host,
                port=settings.postgres_port,
                user=settings.postgres_user,
                password=settings.postgres_password,
                database=self.db_name,
            )

    async def _create_database(self):
        """Create the database if it doesn't exist"""
        # Connect to postgres database to create the new one
        conn = await asyncpg.connect(
            host=settings.postgres_host,
            port=settings.postgres_port,
            user=settings.postgres_user,
            password=settings.postgres_password,
            database="postgres",
        )

        try:
            await conn.execute(f'CREATE DATABASE "{self.db_name}"')
            logger.info(f"Created database: {self.db_name}")
        except asyncpg.exceptions.DuplicateDatabaseError:
            logger.debug(f"Database {self.db_name} already exists")
        finally:
            await conn.close()

    async def _get_database_size(self) -> str:
        """Get database size"""
        try:
            conn = await asyncpg.connect(
                host=settings.postgres_host,
                port=settings.postgres_port,
                user=settings.postgres_user,
                password=settings.postgres_password,
                database="postgres",
            )

            # Query database size
            size_query = """
                SELECT pg_size_pretty(pg_database_size($1)) as size
            """
            result = await conn.fetchval(size_query, self.db_name)
            await conn.close()
            return result or "0 KB"
        except Exception:
            return "0 KB"

    async def get_database_info(self) -> dict[str, Any]:
        """Get basic database information"""
        try:
            conn = await self._get_connection()

            # Get table count
            tables_query = """
                SELECT COUNT(*)
                FROM information_schema.tables
                WHERE table_schema = 'public'
            """
            tables_count = await conn.fetchval(tables_query)

            # Get database size
            db_size = await self._get_database_size()

            await conn.close()

            return {
                "connected": True,
                "database_path": f"postgres://{settings.postgres_host}:{settings.postgres_port}/{self.db_name}",
                "tables_count": tables_count,
                "database_size": db_size,
            }
        except Exception as e:
            logger.error(f"Error getting database info: {e}")
            return {
                "connected": False,
                "database_path": f"postgres://{settings.postgres_host}:{settings.postgres_port}/{self.db_name}",
                "tables_count": 0,
                "database_size": "0 KB",
            }

    async def get_schema(self) -> dict[str, Any]:
        """Get database schema information"""
        try:
            conn = await self._get_connection()

            # Get all tables in public schema
            tables_query = """
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public'
                ORDER BY table_name
            """
            table_rows = await conn.fetch(tables_query)
            table_names = [row[0] for row in table_rows]

            tables = []
            for table_name in table_names:
                # Get table columns
                columns_query = """
                    SELECT
                        column_name,
                        data_type,
                        is_nullable,
                        column_default
                    FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = $1
                    ORDER BY ordinal_position
                """
                columns_info = await conn.fetch(columns_query, table_name)

                # Get primary keys
                pk_query = """
                    SELECT column_name
                    FROM information_schema.table_constraints tc
                    JOIN information_schema.key_column_usage kcu
                        ON tc.constraint_name = kcu.constraint_name
                    WHERE tc.table_name = $1
                        AND tc.constraint_type = 'PRIMARY KEY'
                """
                pk_rows = await conn.fetch(pk_query, table_name)
                primary_keys = {row[0] for row in pk_rows}

                # Get foreign keys
                fk_query = """
                    SELECT
                        kcu.column_name,
                        ccu.table_name AS foreign_table_name,
                        ccu.column_name AS foreign_column_name
                    FROM information_schema.table_constraints AS tc
                    JOIN information_schema.key_column_usage AS kcu
                        ON tc.constraint_name = kcu.constraint_name
                    JOIN information_schema.constraint_column_usage AS ccu
                        ON ccu.constraint_name = tc.constraint_name
                    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = $1
                """
                fk_rows = await conn.fetch(fk_query, table_name)
                foreign_keys = {row[0]: f"{row[1]}.{row[2]}" for row in fk_rows}

                # Get row count
                validated_table_name = _validate_table_name(table_name)
                # nosemgrep: python.sqlalchemy.security.sqlalchemy-execute-raw-query.sqlalchemy-execute-raw-query
                count_query = f'SELECT COUNT(*) FROM "{validated_table_name}"'  # noqa: S608
                row_count = await conn.fetchval(count_query)

                columns = []
                for col in columns_info:
                    columns.append(
                        {
                            "name": col[0],
                            "type": col[1],
                            "nullable": col[2] == "YES",
                            "primary_key": col[0] in primary_keys,
                            "foreign_key": foreign_keys.get(col[0]),
                        }
                    )

                tables.append(
                    {
                        "name": table_name,
                        "columns": columns,
                        "row_count": row_count,
                    }
                )

            await conn.close()
            return {"tables": tables}

        except Exception as e:
            logger.error(f"Error getting database schema: {e}")
            raise Exception(f"Failed to get database schema: {e!s}") from e

    async def get_table_data(self, table_name: str, limit: int = 100, offset: int = 0) -> dict[str, Any]:
        """Get data from a specific table"""
        try:
            # Validate table name first to prevent SQL injection
            validated_table_name = _validate_table_name(table_name)
            conn = await self._get_connection()

            # Validate table exists
            table_check_query = """
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public' AND table_name = $1
            """
            table_exists = await conn.fetchval(table_check_query, validated_table_name)
            if not table_exists:
                raise Exception(f"Table '{validated_table_name}' does not exist")

            # Get total count
            count_query = f'SELECT COUNT(*) FROM "{validated_table_name}"'  # noqa: S608
            total_rows = await conn.fetchval(count_query)

            # Get data with pagination
            data_query = f'SELECT * FROM "{validated_table_name}" LIMIT $1 OFFSET $2'  # noqa: S608
            rows = await conn.fetch(data_query, limit, offset)

            # Convert to list of dicts
            data = [dict(row) for row in rows]

            await conn.close()

            return {
                "table_name": table_name,
                "total_rows": total_rows,
                "returned_rows": len(data),
                "limit": limit,
                "offset": offset,
                "data": data,
            }

        except Exception as e:
            logger.error(f"Error getting table data: {e}")
            raise Exception(f"Failed to get table data: {e!s}") from e

    async def execute_query(self, query: str) -> dict[str, Any]:
        """Execute a SELECT query safely"""
        try:
            # Only allow SELECT queries for security
            query_upper = query.strip().upper()
            if not query_upper.startswith("SELECT"):
                raise Exception("Only SELECT queries are allowed")

            conn = await self._get_connection()

            rows = await conn.fetch(query)

            # Get column names from the first row if available
            columns = list(rows[0].keys()) if rows else []

            # Convert to list of dicts
            data = [dict(row) for row in rows]

            await conn.close()

            return {
                "columns": columns,
                "rows": len(data),
                "data": data,
                "query": query,
            }

        except Exception as e:
            logger.error(f"Error executing query: {e}")
            raise Exception(f"Failed to execute query: {e!s}") from e
