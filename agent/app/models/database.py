from typing import Any

from pydantic import BaseModel


class Column(BaseModel):
    name: str
    type: str
    nullable: bool
    primary_key: bool
    foreign_key: str | None = None


class TableSchema(BaseModel):
    name: str
    columns: list[Column]
    row_count: int


class DatabaseInfo(BaseModel):
    connected: bool
    database_path: str
    tables_count: int
    database_size: str


class DatabaseSchema(BaseModel):
    tables: list[TableSchema]


class TableData(BaseModel):
    table_name: str
    total_rows: int
    returned_rows: int
    limit: int
    offset: int
    data: list[dict[str, Any]]


class QueryResult(BaseModel):
    columns: list[str]
    rows: int
    data: list[dict[str, Any]]
    query: str


class QueryRequest(BaseModel):
    query: str
