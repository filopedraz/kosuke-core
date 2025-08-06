from fastapi import APIRouter, HTTPException, Query
from app.services.database_service import DatabaseService
from app.models.database import DatabaseInfo, DatabaseSchema, TableData, QueryResult, QueryRequest
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/database/info/{project_id}", response_model=DatabaseInfo)
async def get_database_info(project_id: int):
    """Get database information for a project"""
    try:
        db_service = DatabaseService(project_id)
        info = await db_service.get_database_info()
        return DatabaseInfo(**info)
    except Exception as e:
        logger.error(f"Error getting database info for project {project_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/database/schema/{project_id}", response_model=DatabaseSchema)
async def get_database_schema(project_id: int):
    """Get database schema for a project"""
    try:
        db_service = DatabaseService(project_id)
        schema = await db_service.get_schema()
        return DatabaseSchema(**schema)
    except Exception as e:
        logger.error(f"Error getting database schema for project {project_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/database/table/{project_id}/{table_name}", response_model=TableData)
async def get_table_data(
    project_id: int,
    table_name: str,
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0)
):
    """Get data from a specific table with pagination"""
    try:
        db_service = DatabaseService(project_id)
        table_data = await db_service.get_table_data(table_name, limit, offset)
        return TableData(**table_data)
    except Exception as e:
        logger.error(f"Error getting table data for project {project_id}, table {table_name}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/database/query/{project_id}", response_model=QueryResult)
async def execute_query(project_id: int, query_request: QueryRequest):
    """Execute a SELECT query on the database"""
    try:
        db_service = DatabaseService(project_id)
        result = await db_service.execute_query(query_request.query)
        return QueryResult(**result)
    except Exception as e:
        logger.error(f"Error executing query for project {project_id}: {e}")
        raise HTTPException(status_code=400, detail=str(e))