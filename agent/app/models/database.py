from pydantic import BaseModel
from typing import List, Optional, Any, Dict

class Column(BaseModel):
    name: str
    type: str
    nullable: bool
    primary_key: bool
    foreign_key: Optional[str] = None

class TableSchema(BaseModel):
    name: str
    columns: List[Column]
    row_count: int

class DatabaseInfo(BaseModel):
    connected: bool
    database_path: str
    tables_count: int
    database_size: str

class DatabaseSchema(BaseModel):
    tables: List[TableSchema]

class TableData(BaseModel):
    table_name: str
    total_rows: int
    returned_rows: int
    limit: int
    offset: int
    data: List[Dict[str, Any]]

class QueryResult(BaseModel):
    columns: List[str]
    rows: int
    data: List[Dict[str, Any]]
    query: str

class QueryRequest(BaseModel):
    query: str