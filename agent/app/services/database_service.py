import sqlite3
import os
from typing import List, Dict, Any, Optional
from app.utils.config import settings
import logging

logger = logging.getLogger(__name__)

class DatabaseService:
    def __init__(self, project_id: int):
        self.project_id = project_id
        self.db_path = f"{settings.PROJECTS_DIR}/{project_id}/database.sqlite"

    def _get_connection(self) -> sqlite3.Connection:
        """Get database connection"""
        if not os.path.exists(self.db_path):
            # Create database if it doesn't exist
            os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
            conn = sqlite3.connect(self.db_path)
            conn.close()

        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    async def get_database_info(self) -> Dict[str, Any]:
        """Get basic database information"""
        try:
            conn = self._get_connection()
            cursor = conn.cursor()

            # Get table count
            cursor.execute("SELECT COUNT(*) FROM sqlite_master WHERE type='table'")
            tables_count = cursor.fetchone()[0]

            # Get database size
            db_size = os.path.getsize(self.db_path) if os.path.exists(self.db_path) else 0
            db_size_str = f"{db_size / 1024:.1f} KB" if db_size < 1024*1024 else f"{db_size / (1024*1024):.1f} MB"

            conn.close()

            return {
                "connected": True,
                "database_path": self.db_path,
                "tables_count": tables_count,
                "database_size": db_size_str
            }
        except Exception as e:
            logger.error(f"Error getting database info: {e}")
            return {
                "connected": False,
                "database_path": self.db_path,
                "tables_count": 0,
                "database_size": "0 KB"
            }

    async def get_schema(self) -> Dict[str, Any]:
        """Get database schema information"""
        try:
            conn = self._get_connection()
            cursor = conn.cursor()

            # Get all tables
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
            table_names = [row[0] for row in cursor.fetchall()]

            tables = []
            for table_name in table_names:
                # Get table info
                cursor.execute(f"PRAGMA table_info({table_name})")
                columns_info = cursor.fetchall()

                # Get row count
                cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
                row_count = cursor.fetchone()[0]

                # Get foreign keys
                cursor.execute(f"PRAGMA foreign_key_list({table_name})")
                foreign_keys = {row[3]: f"{row[2]}.{row[4]}" for row in cursor.fetchall()}

                columns = []
                for col in columns_info:
                    columns.append({
                        "name": col[1],
                        "type": col[2],
                        "nullable": not col[3],
                        "primary_key": bool(col[5]),
                        "foreign_key": foreign_keys.get(col[1])
                    })

                tables.append({
                    "name": table_name,
                    "columns": columns,
                    "row_count": row_count
                })

            conn.close()
            return {"tables": tables}

        except Exception as e:
            logger.error(f"Error getting database schema: {e}")
            raise Exception(f"Failed to get database schema: {str(e)}")

    async def get_table_data(self, table_name: str, limit: int = 100, offset: int = 0) -> Dict[str, Any]:
        """Get data from a specific table"""
        try:
            conn = self._get_connection()
            cursor = conn.cursor()

            # Validate table exists
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table_name,))
            if not cursor.fetchone():
                raise Exception(f"Table '{table_name}' does not exist")

            # Get total count
            cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
            total_rows = cursor.fetchone()[0]

            # Get data with pagination
            cursor.execute(f"SELECT * FROM {table_name} LIMIT ? OFFSET ?", (limit, offset))
            rows = cursor.fetchall()

            # Convert to list of dicts
            data = [dict(row) for row in rows]

            conn.close()

            return {
                "table_name": table_name,
                "total_rows": total_rows,
                "returned_rows": len(data),
                "limit": limit,
                "offset": offset,
                "data": data
            }

        except Exception as e:
            logger.error(f"Error getting table data: {e}")
            raise Exception(f"Failed to get table data: {str(e)}")

    async def execute_query(self, query: str) -> Dict[str, Any]:
        """Execute a SELECT query safely"""
        try:
            # Only allow SELECT queries for security
            query_upper = query.strip().upper()
            if not query_upper.startswith('SELECT'):
                raise Exception("Only SELECT queries are allowed")

            conn = self._get_connection()
            cursor = conn.cursor()

            cursor.execute(query)
            rows = cursor.fetchall()

            # Get column names
            columns = [description[0] for description in cursor.description] if cursor.description else []

            # Convert to list of dicts
            data = [dict(zip(columns, row)) for row in rows]

            conn.close()

            return {
                "columns": columns,
                "rows": len(data),
                "data": data,
                "query": query
            }

        except Exception as e:
            logger.error(f"Error executing query: {e}")
            raise Exception(f"Failed to execute query: {str(e)}")