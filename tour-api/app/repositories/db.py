"""Read-only access to the Pynwheel database.

Every connection is opened with `default_transaction_read_only=on`, so the
API can never write to the CMS's data, whatever a query says. Queries use
psycopg's server-side parameters (no string interpolation of values).
"""
from __future__ import annotations

import logging
from contextlib import contextmanager
from typing import Any, Iterator

import psycopg
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

log = logging.getLogger("tour_api.db")


class Database:
    def __init__(self, dsn: str, min_size: int = 1, max_size: int = 8):
        self._pool = ConnectionPool(
            conninfo=dsn,
            min_size=min_size,
            max_size=max_size,
            kwargs={"options": "-c default_transaction_read_only=on -c statement_timeout=15000", "row_factory": dict_row, "autocommit": True},
            open=False,
            name="tour-api",
        )

    def open(self) -> None:
        self._pool.open(wait=True, timeout=10)

    def close(self) -> None:
        self._pool.close()

    @contextmanager
    def connection(self) -> Iterator[psycopg.Connection[Any]]:
        with self._pool.connection() as conn:
            yield conn

    def fetch_all(self, sql: str, params: Any = None) -> list[dict[str, Any]]:
        with self.connection() as conn:
            return conn.execute(sql, params).fetchall()

    def fetch_one(self, sql: str, params: Any = None) -> dict[str, Any] | None:
        with self.connection() as conn:
            return conn.execute(sql, params).fetchone()

    def ping(self) -> bool:
        try:
            return self.fetch_one("select 1 as ok") is not None
        except Exception:  # pragma: no cover - only on an outage
            log.exception("database ping failed")
            return False
