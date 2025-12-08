# main.py
import os
import time
import hmac
import hashlib
import json
import asyncio
import logging
from typing import Optional
from datetime import datetime, timedelta

import requests
from fastapi import FastAPI, Request, HTTPException, Depends, Header, BackgroundTasks
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlmodel import SQLModel, Field, create_engine, Session, select
from jose import jwt
from passlib.context import CryptContext

# ---------- logging ----------
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("turbo-backend")

# ---------- env / config ----------
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./db.sqlite3")
JWT_SECRET = os.getenv("JWT_SECRET", "")
JWT_ALG = "HS256"
RAZORPAY_KEY = os.getenv("RAZORPAY_KEY", "")
RAZORPAY_SECRET = os.getenv("RAZORPAY_SECRET", "")
RAZORPAY_WEBHOOK_SECRET = os.getenv("RAZORPAY_WEBHOOK_SECRET", "")
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "")
VAST_API_KEY = os.getenv("VAST_API_KEY", "")
CHECK_INTERVAL_SECONDS = int(os.getenv("CHECK_INTERVAL_SECONDS", "300"))

if not JWT_SECRET:
    logger.warning("JWT_SECRET not set — auth tokens will be insecure.")

# ---------- app + db ----------
app = FastAPI(title="TurboCompute Backend (product-level)")

engine = create_engine(DATABASE_URL, echo=False, connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {})

# ---------- password helper ----------
pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(p: str) -> str:
    return pwd_ctx.hash(p)

def verify_password(p: str, h: str) -> bool:
    return pwd_ctx.verify(p, h)

def create_access_token(subject: str, expires_minutes: int = 60*24*7):
    payload = {"sub": str(subject), "exp": int((datetime.utcnow() + timedelta(minutes=expires_minutes)).timestamp())}
    return jwt.encode(payload, JWT_SECRET or "devsecret", algorithm=JWT_ALG)

def decode_token(token: str):
    try:
        data = jwt.decode(token, JWT_SECRET or "devsecret", algorithms=[JWT_ALG])
        return data.get("sub")
    except Exception:
        return None

# ---------- DB models ----------
class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str
    password_hash: str
    name: str = ""

class WalletBalance(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int
    balance: float = 0.0
    notify_threshold: float = 20.0

class WalletTransaction(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int
    amount: float
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    status: str = "created"
    created_at: float = Field(default_factory=lambda: time.time())

class Instance(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int
    provider: str = "vast"
    provider_instance_id: Optional[str] = None
    status: str = "creating"
    ip: Optional[str] = None
    plan: Optional[str] = None
    hours: int = 1
    created_at: float = Field(default_factory=lambda: time.time())
    raw: Optional[str] = None

# create tables
SQLModel.metadata.create_all(engine)

# ---------- Helpers ----------
def send_telegram(text: str):
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        logger.debug("Telegram not configured; skipping notification.")
        return
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    data = {"chat_id": TELEGRAM_CHAT_ID, "text": text}
    try:
        r = requests.post(url, json=data, timeout=10)
        logger.debug("Telegram send status: %s", r.status_code)
    except Exception as e:
        logger.exception("Telegram send failed: %s", e)

def razorpay_create_order(amount_in_inr: float, notes: dict = None):
    if not (RAZORPAY_KEY and RAZORPAY_SECRET):
        raise RuntimeError("Razorpay keys not configured")
    url = "https://api.razorpay.com/v1/orders"
    amt_paise = int(round(amount_in_inr * 100))
    payload = {"amount": amt_paise, "currency": "INR", "payment_capture": 1}
    if notes:
        payload["notes"] = notes
    r = requests.post(url, json=payload, auth=(RAZORPAY_KEY, RAZORPAY_SECRET), timeout=15)
    r.raise_for_status()
    return r.json()

def verify_razorpay_signature(body: bytes, signature: str) -> bool:
    if not RAZORPAY_WEBHOOK_SECRET:
        logger.warning("Webhook secret not configured.")
        return False
    computed = hmac.new(RAZORPAY_WEBHOOK_SECRET.encode(), body, hashlib.sha256).hexdigest()
    # Razorpay sometimes returns base64 signature; but most doc shows hex. We'll compare both.
    if hmac.compare_digest(computed, signature):
        return True
    # try base64:
    try:
        b64 = base64.b64encode(bytes.fromhex(computed)).decode()
        if hmac.compare_digest(b64, signature):
            return True
    except Exception:
        pass
    return False

# ---------- Auth dependency ----------
def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization header")
    token = authorization.replace("Bearer ", "")
    sub = decode_token(token)
    if not sub:
        raise HTTPException(status_code=401, detail="Invalid token")
    with Session(engine) as session:
        user = session.get(User, int(sub))
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user

# ---------- Request Schemas ----------
class SignupRequest(BaseModel):
    email: str
    password: str
    name: Optional[str] = ""

class LoginRequest(BaseModel):
    email: str
    password: str

class TopupRequest(BaseModel):
    amount: float

class CreateInstanceRequest(BaseModel):
    plan_code: str
    hours: int = 1

# ---------- Endpoints ----------
@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/signup")
def signup(req: SignupRequest):
    with Session(engine) as session:
        exists = session.exec(select(User).where(User.email == req.email)).first()
        if exists:
            raise HTTPException(status_code=400, detail="Email already registered")
        user = User(email=req.email, password_hash=hash_password(req.password), name=req.name)
        session.add(user)
        session.commit()
        session.refresh(user)
        # create wallet
        wb = WalletBalance(user_id=user.id, balance=0.0)
        session.add(wb)
        session.commit()
        token = create_access_token(str(user.id))
        return {"token": token, "user_id": user.id}

@app.post("/login")
def login(req: LoginRequest):
    with Session(engine) as session:
        user = session.exec(select(User).where(User.email == req.email)).first()
        if not user or not verify_password(req.password, user.password_hash):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        token = create_access_token(str(user.id))
        return {"token": token, "user_id": user.id}

@app.get("/wallet")
def get_wallet(user = Depends(get_current_user)):
    with Session(engine) as session:
        wb = session.exec(select(WalletBalance).where(WalletBalance.user_id == user.id)).first()
        if not wb:
            wb = WalletBalance(user_id=user.id, balance=0.0)
            session.add(wb); session.commit(); session.refresh(wb)
        return {"balance": wb.balance, "notify_threshold": wb.notify_threshold}

@app.post("/wallet/topup")
def wallet_topup(req: TopupRequest, user = Depends(get_current_user)):
    # Create razorpay order and store transaction
    if req.amount <= 0:
        raise HTTPException(status_code=400, detail="Invalid amount")
    with Session(engine) as session:
        tx = WalletTransaction(user_id=user.id, amount=req.amount, status="creating")
        session.add(tx); session.commit(); session.refresh(tx)
        try:
            order = razorpay_create_order(req.amount, notes={"user_id": str(user.id), "tx_id": str(tx.id)})
            tx.razorpay_order_id = order.get("id")
            tx.status = "order_created"
            session.add(tx); session.commit()
            return {"order": order, "razorpay_key": RAZORPAY_KEY, "tx_id": tx.id}
        except Exception as e:
            tx.status = "order_failed"
            session.add(tx); session.commit()
            logger.exception("Razorpay order creation failed")
            raise HTTPException(status_code=500, detail=str(e))

@app.post("/webhook/razorpay")
async def razorpay_webhook(request: Request):
    body = await request.body()
    sig = request.headers.get("X-Razorpay-Signature", "")
    # Verify signature (simple hmac)
    if RAZORPAY_WEBHOOK_SECRET:
        expected = hmac.new(RAZORPAY_WEBHOOK_SECRET.encode(), body, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected, sig):
            # try alternate (SDK style) fallback: use SDK if available
            logger.warning("Webhook signature mismatch")
            raise HTTPException(status_code=400, detail="Invalid signature")
    else:
        logger.warning("No webhook secret configured; rejecting")
        raise HTTPException(status_code=500, detail="Webhook secret not configured")
    data = await request.json()
    event = data.get("event")
    logger.info("Razorpay webhook received: %s", event)
    if event == "payment.captured":
        entity = data.get("payload", {}).get("payment", {}).get("entity", {})
        order_id = entity.get("order_id")
        payment_id = entity.get("id")
        amount = entity.get("amount", 0) / 100.0
        notes = entity.get("notes", {})
        user_id = int(notes.get("user_id") or 0)
        tx_id_note = notes.get("tx_id")
        with Session(engine) as session:
            # update transaction
            tx = None
            if order_id:
                tx = session.exec(select(WalletTransaction).where(WalletTransaction.razorpay_order_id == order_id)).first()
            if not tx and tx_id_note:
                tx = session.get(WalletTransaction, int(tx_id_note))
            if tx:
                tx.razorpay_payment_id = payment_id
                tx.status = "paid"
                session.add(tx)
            # update wallet
            if user_id:
                wb = session.exec(select(WalletBalance).where(WalletBalance.user_id == user_id)).first()
                if not wb:
                    wb = WalletBalance(user_id=user_id, balance=0.0)
                    session.add(wb); session.commit(); session.refresh(wb)
                wb.balance += amount
                session.add(wb)
                # record separate tx
                wtx = WalletTransaction(user_id=user_id, amount=amount, razorpay_order_id=order_id, razorpay_payment_id=payment_id, status="paid")
                session.add(wtx)
                session.commit()
                send_telegram(f"Payment received ₹{amount:.2f} for user {user_id}. New balance: ₹{wb.balance:.2f}")
    return JSONResponse({"ok": True})

# ---------- Instance / provider integration ----------
# Minimal VastAdapter stub: if you have provider.vast_adapter, replace this class and import it.
class VastAdapter:
    def __init__(self, api_key: str):
        self.api_key = api_key

    def create_instance(self, plan_code: str, hours: int):
        # This is a stub placeholder. Replace with real API calls to vast.ai or your provider.
        # Return dict with status, provider_instance_id, ip
        return {"status": "running", "provider_instance_id": f"vm-{int(time.time())}", "ip": "1.2.3.4", "raw": {"plan": plan_code, "hours": hours}}

    def terminate_instance(self, provider_instance_id: str):
        return True

vast = VastAdapter(VAST_API_KEY) if VAST_API_KEY else None

@app.post("/create-instance")
def create_instance(req: CreateInstanceRequest, background_tasks: BackgroundTasks, user = Depends(get_current_user)):
    # Check wallet balance quick check & reserve estimated cost
    EST_PRICE_PER_HOUR = 10.0  # product-level default; replace per plan
    est_price = EST_PRICE_PER_HOUR * req.hours
    with Session(engine) as session:
        wb = session.exec(select(WalletBalance).where(WalletBalance.user_id == user.id)).first()
        if not wb or wb.balance < est_price:
            raise HTTPException(status_code=402, detail="Insufficient wallet balance")
        # reserve (deduct estimate)
        wb.balance -= est_price
        session.add(wb)
        inst = Instance(user_id=user.id, status="creating", plan=req.plan_code, hours=req.hours)
        session.add(inst)
        session.commit(); session.refresh(inst)
        # launch in background
        background_tasks.add_task(_launch_and_update, inst.id, req.plan_code, req.hours, est_price)
        return {"id": inst.id, "status": inst.status}

def _launch_and_update(instance_db_id: int, plan_code: str, hours: int, reserved_price: float):
    with Session(engine) as session:
        inst = session.get(Instance, instance_db_id)
        if not inst:
            return
        try:
            if not vast:
                raise RuntimeError("Provider (vast) not configured")
            prov = vast.create_instance(plan_code, hours)
            inst.provider_instance_id = prov.get("provider_instance_id")
            inst.status = prov.get("status", "running")
            inst.ip = prov.get("ip")
            inst.raw = json.dumps(prov.get("raw", prov))
            session.add(inst)
            session.commit()
            # Basic billing: keep reserved, you may later reconcile actual usage and refund/charge extra.
            logger.info("Launched instance %s for user %s", inst.id, inst.user_id)
        except Exception as e:
            inst.status = "error"
            inst.raw = str(e)
            session.add(inst)
            session.commit()
            # refund reserved price on failure
            wb = session.exec(select(WalletBalance).where(WalletBalance.user_id == inst.user_id)).first()
            if wb:
                wb.balance += reserved_price
                session.add(wb); session.commit()
            send_telegram(f"Instance launch failed for user {inst.user_id}: {e}")

@app.get("/status/{instance_id}")
def get_status(instance_id: int, user = Depends(get_current_user)):
    with Session(engine) as session:
        inst = session.get(Instance, instance_id)
        if not inst:
            raise HTTPException(status_code=404, detail="Instance not found")
        if inst.user_id != user.id:
            raise HTTPException(status_code=403, detail="Forbidden")
        return {"id": inst.id, "status": inst.status, "ip": inst.ip, "raw": inst.raw}

@app.post("/terminate/{instance_id}")
def terminate_instance(instance_id: int, user = Depends(get_current_user)):
    with Session(engine) as session:
        inst = session.get(Instance, instance_id)
        if not inst:
            raise HTTPException(status_code=404, detail="Instance not found")
        if inst.user_id != user.id:
            raise HTTPException(status_code=403, detail="Forbidden")
        if not inst.provider_instance_id:
            inst.status = "terminated"
            session.add(inst); session.commit()
            return {"status": "terminated"}
        try:
            if not vast:
                raise RuntimeError("Provider adapter not configured")
            ok = vast.terminate_instance(inst.provider_instance_id)
            inst.status = "terminated"
            session.add(inst); session.commit()
            return {"status": "terminated"}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

# ---------- Background wallet checker ----------
async def wallet_checker_loop():
    while True:
        try:
            with Session(engine) as session:
                wallets = session.exec(select(WalletBalance)).all()
                for w in wallets:
                    if w.balance <= w.notify_threshold:
                        send_telegram(f"⚠️ Low balance for user {w.user_id}: ₹{w.balance:.2f}. Please top-up to continue running instances.")
        except Exception as e:
            logger.exception("Checker error: %s", e)
        await asyncio.sleep(CHECK_INTERVAL_SECONDS)

@app.on_event("startup")
def on_startup():
    logger.info("Starting backend, DB at %s", DATABASE_URL)
    # start background loop
    loop = asyncio.get_event_loop()
    loop.create_task(wallet_checker_loop())

# ---------- simple root ----------
@app.get("/")
def root():
    return {"ok": True, "note": "TurboCompute Backend"}

# ---------- run with uvicorn or gunicorn -k uvicorn.workers.UvicornWorker main:app ----------
