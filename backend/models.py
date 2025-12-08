# backend/models.py
from sqlmodel import SQLModel, Field
from typing import Optional
import time

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str
    name: Optional[str] = None
    hashed_password: str
    created_at: float = Field(default_factory=lambda: time.time())

class WalletBalance(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int
    balance: float = 0.0

class WalletTransaction(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int
    amount: float
    type: str   # 'credit' or 'debit'
    note: Optional[str] = None
    created_at: float = Field(default_factory=lambda: time.time())

class Instance(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: Optional[int] = None
    provider: str = "vast"
    provider_instance_id: Optional[str] = None
    plan: Optional[str] = None
    status: Optional[str] = None
    ip: Optional[str] = None
    created_at: float = Field(default_factory=lambda: time.time())
    raw: Optional[str] = None
