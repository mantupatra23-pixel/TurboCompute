# main.py
import os
import time
import json
import logging
import asyncio
import functools
from typing import Optional, Dict, Any
from datetime import datetime, timedelta

import requests
import razorpay
from fastapi import FastAPI, Request, HTTPException, BackgroundTasks, Header, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlmodel import SQLModel, Field, create_engine, Session, select

# -----------------------
# Basic logging
# -----------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger("turbo-backend")

# -----------------------
# Environment / config
# -----------------------
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./db.sqlite3")
VAST_API_KEY = os.getenv("VAST_API_KEY", "")
RAZORPAY_KEY = os.getenv("RAZORPAY_KEY", "")
RAZORPAY_SECRET = os.getenv("RAZORPAY_SECRET", "")
RAZORPAY_WEBHOOK_SECRET = os.getenv("RAZORPAY_WEBHOOK_SECRET", "")
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "")
CHECK_INTERVAL_SECONDS = int(os.getenv("CHECK_INTERVAL_SECONDS", "30"))
RATE_LIMIT_PER_MIN = int(os.getenv("RATE_LIMIT_PER_MIN", "60"))

# -----------------------
# DB setup
# -----------------------
engine = create_engine(DATABASE_URL, echo=False, connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {})
# Models
class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str
    name: str = ""
    password_hash: str = ""

class WalletBalance(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int
    balance: float = 0.0

class WalletTransaction(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int
    amount: float
    note: str = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Instance(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int
    provider_instance_id: Optional[str] = None
    status: str = "pending"
    ip: Optional[str] = None
    raw: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

SQLModel.metadata.create_all(engine)

# -----------------------
# Providers / clients
# -----------------------
rz_client = None
if RAZORPAY_KEY and RAZORPAY_SECRET:
    try:
        rz_client = razorpay.Client(auth=(RAZORPAY_KEY, RAZORPAY_SECRET))
        logger.info("Razorpay client initialised")
    except Exception as e:
        logger.exception("Failed to init razorpay client: %s", e)
        rz_client = None

# Simple Vast adapter placeholder
class VastAdapter:
    def __init__(self, api_key: str):
        self.api_key = api_key

    def create_instance(self, plan_code: str, hours: int):
        # Implement integration with Vast API (this is pseudocode)
        logger.info("VastAdapter.create_instance called plan=%s hours=%s", plan_code, hours)
        # simulate provider response
        return {"id": f"vast-{int(time.time())}", "status": "running", "ip": "1.2.3.4"}

    def terminate_instance(self, provider_id: str):
        logger.info("VastAdapter.terminate_instance %s", provider_id)
        return {"status": "terminated"}

    def get_instance_status(self, provider_id: str):
        # return {"status": "running", "ip":"1.2.3.4", ...}
        return {"status": "running", "ip": "1.2.3.4"}

vast = VastAdapter(api_key=VAST_API_KEY)

# -----------------------
# FastAPI app
# -----------------------
app = FastAPI(title="TurboCompute Backend")

# -----------------------
# Simple in-memory rate limiter (per-user)
# -----------------------
_rate_buckets: Dict[str, Dict[str, Any]] = {}
def rate_limit_key(user_identifier: str):
    return f"rl:{user_identifier}"

def check_rate_limit(user_id: str):
    key = rate_limit_key(user_id)
    bucket = _rate_buckets.get(key)
    now = datetime.utcnow()
    if not bucket:
        _rate_buckets[key] = {"count": 1, "reset": now + timedelta(minutes=1)}
        return True
    if now >= bucket["reset"]:
        _rate_buckets[key] = {"count": 1, "reset": now + timedelta(minutes=1)}
        return True
    if bucket["count"] >= RATE_LIMIT_PER_MIN:
        return False
    bucket["count"] += 1
    return True

# -----------------------
# Helpers - Telegram
# -----------------------
def telegram_send(text: str):
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        logger.warning("Telegram not configured")
        return False
    try:
        url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
        payload = {"chat_id": TELEGRAM_CHAT_ID, "text": text}
        r = requests.post(url, json=payload, timeout=8)
        logger.debug("Telegram response: %s %s", r.status_code, r.text)
        return r.ok
    except Exception as e:
        logger.exception("telegram_send fail: %s", e)
        return False

# -----------------------
# Helpers - Razorpay verify webhook
# -----------------------
def verify_razorpay_signature(body: bytes, signature: str) -> bool:
    if not RAZORPAY_WEBHOOK_SECRET:
        logger.warning("RAZORPAY_WEBHOOK_SECRET not set")
        return False
    try:
        # razorpay has utility, but avoid dependency: compute HMAC-SHA256
        import hmac, hashlib
        computed = hmac.new(RAZORPAY_WEBHOOK_SECRET.encode(), body, hashlib.sha256).hexdigest()
        return hmac.compare_digest(computed, signature)
    except Exception as e:
        logger.exception("verify signature error: %s", e)
        return False

# -----------------------
# Request schemas
# -----------------------
class SignupRequest(BaseModel):
    email: str
    password: str
    name: Optional[str] = ""

class LoginRequest(BaseModel):
    email: str
    password: str

class CreateInstanceRequest(BaseModel):
    plan_code: str
    hours: int = 1

# -----------------------
# Auth (very simple token)
# -----------------------
# For demo: token is "user-{id}" ; in prod replace with JWT
def create_token(user_id: int) -> str:
    return f"user-{user_id}"

def decode_token(token: str) -> Optional[int]:
    if token and token.startswith("user-"):
        try:
            return int(token.split("-", 1)[1])
        except:
            return None
    return None

async def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="No authorization header")
    token = authorization.replace("Bearer ", "")
    user_id = decode_token(token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")
    with Session(engine) as session:
        user = session.get(User, user_id)
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user

# -----------------------
# Auth endpoints
# -----------------------
@app.post("/signup")
def signup(req: SignupRequest):
    with Session(engine) as session:
        exists = session.exec(select(User).where(User.email == req.email)).first()
        if exists:
            raise HTTPException(status_code=400, detail="Already exists")
        # NOTE: store hashed passwords in prod
        user = User(email=req.email, password_hash=req.password, name=req.name)
        session.add(user)
        session.commit()
        session.refresh(user)
        # create wallet
        wb = WalletBalance(user_id=user.id, balance=0.0)
        session.add(wb)
        session.commit()
        token = create_token(user.id)
        return {"token": token, "user_id": user.id}

@app.post("/login")
def login(req: LoginRequest):
    with Session(engine) as session:
        user = session.exec(select(User).where(User.email == req.email)).first()
        if not user or user.password_hash != req.password:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        token = create_token(user.id)
        return {"token": token, "user_id": user.id}

# -----------------------
# Wallet endpoints
# -----------------------
@app.get("/wallet")
def get_wallet(user = Depends(get_current_user)):
    with Session(engine) as session:
        wb = session.exec(select(WalletBalance).where(WalletBalance.user_id == user.id)).first()
        if not wb:
            wb = WalletBalance(user_id=user.id, balance=0.0)
            session.add(wb); session.commit(); session.refresh(wb)
        return {"balance": wb.balance}

@app.post("/wallet/create-order")
def create_order(amount: float, user = Depends(get_current_user)):
    if not rz_client:
        raise HTTPException(status_code=500, detail="Razorpay not configured")
    try:
        order = rz_client.order.create({
            "amount": int(amount * 100),
            "currency": "INR",
            "payment_capture": 1,
            "notes": {"user_id": str(user.id)}
        })
        return {"order": order}
    except Exception as e:
        logger.exception("create_order error")
        raise HTTPException(status_code=500, detail=str(e))

# -----------------------
# Razorpay webhook
# -----------------------
@app.post("/webhook/razorpay")
async def razorpay_webhook(request: Request):
    body = await request.body()
    sig = request.headers.get("X-Razorpay-Signature", "")
    if not RAZORPAY_WEBHOOK_SECRET:
        raise HTTPException(status_code=500, detail="Webhook secret not configured")
    if not verify_razorpay_signature(body, sig):
        raise HTTPException(status_code=400, detail="Invalid signature")
    data = await request.json()
    try:
        # process payment captured events
        if data.get("event") == "payment.captured":
            payload = data.get("payload", {})
            p = payload.get("payment", {}).get("entity", {})
            notes = p.get("notes", {}) or {}
            try:
                user_id = int(notes.get("user_id", 0))
            except:
                user_id = 0
            amt = p.get("amount", 0) / 100.0
            if user_id and amt > 0:
                with Session(engine) as session:
                    wb = session.exec(select(WalletBalance).where(WalletBalance.user_id == user_id)).first()
                    if not wb:
                        wb = WalletBalance(user_id=user_id, balance=0.0)
                        session.add(wb)
                    wb.balance += float(amt)
                    session.add(WalletTransaction(user_id=user_id, amount=amt, note="rzp payment"))
                    session.add(wb)
                    session.commit()
                msg = f"Payment received: ₹{amt:.2f} for user {user_id} — wallet updated."
                telegram_send(msg)
        return {"status": "ok"}
    except Exception as e:
        logger.exception("webhook handler error")
        raise HTTPException(status_code=500, detail=str(e))

# -----------------------
# Instance creation + lifecycle
# -----------------------
@app.post("/create-instance")
def create_instance(req: CreateInstanceRequest, background_tasks: BackgroundTasks, user = Depends(get_current_user)):
    # basic rate limit
    if not check_rate_limit(str(user.id)):
        raise HTTPException(status_code=429, detail="Rate limit exceeded")

    with Session(engine) as session:
        wb = session.exec(select(WalletBalance).where(WalletBalance.user_id == user.id)).first()
        if not wb or wb.balance <= 0:
            raise HTTPException(status_code=402, detail="Insufficient wallet balance")
        inst = Instance(user_id=user.id, status="pending")
        session.add(inst)
        session.commit()
        session.refresh(inst)
        # Launch background task
        background_tasks.add_task(_launch_and_update, inst.id, req)
        return {"id": inst.id, "status": inst.status}

async def _launch_and_update(instance_db_id: int, req: CreateInstanceRequest):
    # Runs in background (async) - create provider instance, poll for status, deduct estimated price
    # This is best-effort: in production use task queue (RQ/Celery)
    try:
        with Session(engine) as session:
            inst = session.get(Instance, instance_db_id)
            if not inst:
                logger.error("instance missing")
                return
            # create on provider
            try:
                prov_resp = vast.create_instance(req.plan_code, req.hours)
                inst.provider_instance_id = prov_resp.get("id")
                inst.status = prov_resp.get("status", "starting")
                inst.ip = prov_resp.get("ip")
                inst.raw = json.dumps(prov_resp)
                session.add(inst); session.commit(); session.refresh(inst)
                telegram_send(f"Instance {inst.id} created: provider_id={inst.provider_instance_id}")
            except Exception as e:
                inst.status = "error"
                inst.raw = str(e)
                session.add(inst); session.commit()
                telegram_send(f"Instance create failed: {e}")
                return

            # simple billing: deduct estimated price upfront (example: 10 * hours)
            estimated_price = 10.0 * max(1, req.hours)
            wb = session.exec(select(WalletBalance).where(WalletBalance.user_id == inst.user_id)).first()
            if wb and wb.balance >= estimated_price:
                wb.balance -= estimated_price
                session.add(WalletTransaction(user_id=inst.user_id, amount=-estimated_price, note="estimated charge"))
                session.add(wb); session.commit()
                telegram_send(f"Deducted estimated ₹{estimated_price:.2f} for instance {inst.id}. New balance: ₹{wb.balance:.2f}")
            else:
                # insufficient: mark pending payment and still continue optionally
                telegram_send(f"Insufficient balance to deduct estimated price for instance {inst.id} — current balance: ₹{wb.balance if wb else 0:.2f}")

    except Exception as e:
        logger.exception("background _launch_and_update error")

# status check endpoint
@app.get("/status/{instance_id}")
def get_status(instance_id: int, user = Depends(get_current_user)):
    with Session(engine) as session:
        inst = session.get(Instance, instance_id)
        if not inst:
            raise HTTPException(status_code=404, detail="Not found")
        if inst.user_id != user.id:
            raise HTTPException(status_code=403, detail="Forbidden")
        return {"id": inst.id, "status": inst.status, "ip": inst.ip, "raw": inst.raw}

@app.post("/terminate/{instance_id}")
def terminate_instance(instance_id: int, user = Depends(get_current_user)):
    with Session(engine) as session:
        inst = session.get(Instance, instance_id)
        if not inst:
            raise HTTPException(status_code=404, detail="Not found")
        if inst.user_id != user.id:
            raise HTTPException(status_code=403, detail="Forbidden")
        if not inst.provider_instance_id:
            inst.status = "terminated"
            session.add(inst); session.commit()
            return {"status": "terminated"}
        try:
            resp = vast.terminate_instance(inst.provider_instance_id)
            inst.status = "terminated"
            session.add(inst); session.commit()
            telegram_send(f"Instance {inst.id} terminated.")
            return {"status": "terminated", "provider": resp}
        except Exception as e:
            logger.exception("terminate error")
            raise HTTPException(status_code=500, detail=str(e))

# -----------------------
# Background poller: fee reconciliation, auto-stop & low-balance alerts
# -----------------------
async def background_poll_loop():
    while True:
        try:
            with Session(engine) as session:
                # check running instances and update status from provider
                instances = session.exec(select(Instance).where(Instance.status != "terminated")).all()
                for inst in instances:
                    if not inst.provider_instance_id:
                        continue
                    try:
                        sdata = vast.get_instance_status(inst.provider_instance_id)
                        inst.status = sdata.get("status", inst.status)
                        inst.ip = sdata.get("ip", inst.ip)
                        inst.raw = json.dumps(sdata)
                        session.add(inst)
                        session.commit()
                        # if running -> compute hourly charge per check interval
                        if inst.status == "running":
                            # simple pro-rata deduction per interval
                            charge_per_hour = 10.0  # configurable per plan in prod
                            charge_per_interval = charge_per_hour * (CHECK_INTERVAL_SECONDS / 3600.0)
                            wb = session.exec(select(WalletBalance).where(WalletBalance.user_id == inst.user_id)).first()
                            if wb:
                                if wb.balance >= charge_per_interval:
                                    wb.balance -= charge_per_interval
                                    session.add(WalletTransaction(user_id=inst.user_id, amount=-charge_per_interval, note=f"usage instance {inst.id}"))
                                    session.add(wb); session.commit()
                                else:
                                    # low balance -> notify and terminate
                                    telegram_send(f"Low balance (₹{wb.balance:.2f}) for user {inst.user_id}, terminating instance {inst.id}.")
                                    try:
                                        vast.terminate_instance(inst.provider_instance_id)
                                    except Exception:
                                        pass
                                    inst.status = "terminated"
                                    session.add(inst); session.commit()
                    except Exception as e:
                        logger.exception("poll update instance error")
                # optionally send daily summary or low-balance alerts
            await asyncio.sleep(CHECK_INTERVAL_SECONDS)
        except Exception:
            logger.exception("background poll loop exception")
            await asyncio.sleep(5)

@app.on_event("startup")
async def startup_event():
    # start background poller
    asyncio.create_task(background_poll_loop())
    logger.info("Background poller started")

# -----------------------
# Admin endpoints (simple token)
# -----------------------
ADMIN_TOKEN = os.getenv("ADMIN_TOKEN", "admintoken123")
def admin_auth(token: Optional[str] = Header(None)):
    if token != ADMIN_TOKEN:
        raise HTTPException(status_code=401, detail="Unauthorized")

@app.get("/admin/instances")
def admin_list_instances(_=Depends(admin_auth)):
    with Session(engine) as session:
        rows = session.exec(select(Instance)).all()
        return {"instances": [r.dict() for r in rows]}

@app.get("/admin/wallets")
def admin_wallets(_=Depends(admin_auth)):
    with Session(engine) as session:
        rows = session.exec(select(WalletBalance)).all()
        return {"wallets": [r.dict() for r in rows]}

# -----------------------
# Global exception handler
# -----------------------
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error: %s", exc)
    try:
        telegram_send(f"Server error: {str(exc)}")
    except:
        pass
    return JSONResponse(status_code=500, content={"detail": "Internal Server Error"})

# -----------------------
# Simple health
# -----------------------
@app.get("/health")
def health():
    return {"status": "ok"}
