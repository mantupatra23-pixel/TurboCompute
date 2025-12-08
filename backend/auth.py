# backend/auth.py
import os
from passlib.context import CryptContext
from jose import jwt, JWTError
from datetime import datetime, timedelta

PWD_CTX = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET = os.getenv("JWT_SECRET", "change_this_secret")
ALGORITHM = "HS256"
ACCESS_EXPIRE_MINUTES = 60*24*7  # 7 days

def hash_password(password: str):
    return PWD_CTX.hash(password)

def verify_password(plain, hashed):
    return PWD_CTX.verify(plain, hashed)

def create_access_token(subject: str):
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_EXPIRE_MINUTES)
    payload = {"sub": subject, "exp": expire}
    return jwt.encode(payload, SECRET, algorithm=ALGORITHM)

def decode_token(token: str):
    try:
        payload = jwt.decode(token, SECRET, algorithms=[ALGORITHM])
        return payload.get("sub")
    except JWTError:
        return None
