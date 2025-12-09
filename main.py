# main.py
"""
TurboCompute backend - single-file production-ready template (referral model + payments)
Run:
  pip install fastapi uvicorn sqlmodel sqlalchemy razorpay requests passlib[bcrypt] python-multipart
  SOURCE your env variables then:
  uvicorn main:app --host 0.0.0.0 --port 8000 --workers 1

Notes:
 - This is a template. For real production: separate modules, DB migrations (Alembic), secrets manager, monitoring, TLS, improved rate-limiter & caching.
 - Ensure RAZORPAY_WEBHOOK_SECRET is set before enabling real webhooks.
"""

import os
import time
import json
import hmac
import hashlib
import logging
import asyncio
from typing import Optional, Dict, Any, List
from datetime import datetime

import requests
import razorpay
from fastapi import FastAPI, Request, HTTPException, Header, Depends, Body
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlmodel import SQLModel, Field, create_engine, Session, select
from passlib.context import CryptContext

# ---------------------------
# Basic logging
# ---------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger("turbo-backend")

# ---------------------------
# Config (env)
# ---------------------------
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./turbo.db")
RAZORPAY_KEY = os.getenv("RAZORPAY_KEY", "")
RAZORPAY_SECRET = os.getenv("RAZORPAY_SECRET", "")
RAZORPAY_WEBHOOK_SECRET = os.getenv("RAZORPAY_WEBHOOK_SECRET", "")
ADMIN_TOKEN = os.getenv("ADMIN_TOKEN", "admintoken123")
SIGNUP_FREE_CREDIT = float(os.getenv("SIGNUP_FREE_CREDIT", "20.0"))
REFERRAL_BONUS = float(os.getenv("REFERRAL_BONUS", "50.0"))
RATE_LIMIT_PER_MIN = int(os.getenv("RATE_LIMIT_PER_MIN", "30"))

# ---------------------------
# DB & password hasher
# ---------------------------
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, echo=False, connect_args=connect_args)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ---------------------------
# Models
# ---------------------------
class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str
    name: str = ""
    password_hash: str = ""
    referred_by: Optional[int] = None           # user id of referrer
    referral_bonus_given: bool = False          # whether referrer already awarded for this user
    referral_code: Optional[str] = None         # eg: TC-abc123

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

# create tables
SQLModel.metadata.create_all(engine)

# ---------------------------
# Razorpay client init
# ---------------------------
rz_client = None
if RAZORPAY_KEY and RAZORPAY_SECRET:
    try:
        rz_client = razorpay.Client(auth=(RAZORPAY_KEY, RAZORPAY_SECRET))
        logger.info("Razorpay client initialized")
    except Exception as e:
        logger.exception("Failed to init razorpay client: %s", e)
        rz_client = None

# ---------------------------
# FastAPI app + CORS
# ---------------------------
app = FastAPI(title="TurboCompute Backend (referral)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten for prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------
# Request schemas
# ---------------------------
class SignupRequest(BaseModel):
    email: str
    password: str
    name: Optional[str] = ""
    referral_code: Optional[str] = None

class LoginRequest(BaseModel):
    email: str
    password: str

class CreateInstanceRequest(BaseModel):
    plan_code: str
    hours: int = 1

# ---------------------------
# Helpers: auth token, password, referral code
# ---------------------------
def create_token(user_id: int) -> str:
    return f"user-{user_id}"

def decode_token(token: str) -> Optional[int]:
    if token and token.startswith("user-"):
        try:
            return int(token.split("-", 1)[1])
        except Exception:
            return None
    return None

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def generate_referral_code(user_id: int) -> str:
    # produce a short code: TC-<user_id>-<timehash(4)>
    stamp = str(int(time.time()))[-4:]
    return f"TC-{user_id}-{stamp}"

def get_user_by_token(authorization: Optional[str] = Header(None)) -> User:
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing authorization")
    token = authorization.replace("Bearer ", "")
    uid = decode_token(token)
    if not uid:
        raise HTTPException(status_code=401, detail="Invalid token")
    with Session(engine) as session:
        user = session.get(User, uid)
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user

# ---------------------------
# Verify razorpay signature
# ---------------------------
def verify_razorpay_signature(body: bytes, signature: str) -> bool:
    if not RAZORPAY_WEBHOOK_SECRET:
        logger.warning("RAZORPAY_WEBHOOK_SECRET not configured - skipping verify (not secure)")
        return False
    try:
        computed = hmac.new(RAZORPAY_WEBHOOK_SECRET.encode(), body, hashlib.sha256).hexdigest()
        return hmac.compare_digest(computed, signature)
    except Exception as e:
        logger.exception("verify signature error: %s", e)
        return False

# ---------------------------
# Simple in-memory rate limiter (per user key)
# ---------------------------
_rate_buckets: Dict[str, Dict[str, Any]] = {}
def rate_limit_key(user_identifier: str) -> str:
    return f"r:{user_identifier}"

def check_rate_limit(user_identifier: str) -> bool:
    key = rate_limit_key(user_identifier)
    bucket = _rate_buckets.get(key)
    now = datetime.utcnow()
    if not bucket:
        _rate_buckets[key] = {"count": 1, "reset": now}
        return True
    # reset every 60s
    if (now - bucket["reset"]).seconds >= 60:
        _rate_buckets[key] = {"count": 1, "reset": now}
        return True
    if bucket["count"] >= RATE_LIMIT_PER_MIN:
        return False
    bucket["count"] += 1
    return True

# ---------------------------
# Telegram helper (optional)
# ---------------------------
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "")

def telegram_send(text: str) -> bool:
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        return False
    try:
        url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
        payload = {"chat_id": TELEGRAM_CHAT_ID, "text": text}
        r = requests.post(url, json=payload, timeout=10)
        logger.debug("Telegram response: %s", r.text)
        return r.ok
    except Exception as e:
        logger.exception("telegram_send fail: %s", e)
        return False

# ---------------------------
# Startup: background poller placeholder
# ---------------------------
async def background_poll_loop():
    while True:
        try:
            with Session(engine) as session:
                instances = session.exec(select(Instance).where(Instance.provider_instance_id != None)).all()
                for inst in instances:
                    # placeholder: call provider API to get real status
                    # For now just log
                    logger.debug("poll instance %s (provider_id=%s)", inst.id, inst.provider_instance_id)
            await asyncio.sleep(60)
        except Exception as e:
            logger.exception("background poll error: %s", e)
            await asyncio.sleep(5)

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(background_poll_loop())
    logger.info("Background poller started")

# ---------------------------
# Auth endpoints
# ---------------------------
@app.post("/signup")
def signup(req: SignupRequest):
    with Session(engine) as session:
        exists = session.exec(select(User).where(User.email == req.email)).first()
        if exists:
            raise HTTPException(status_code=400, detail="Email already exists")
        hashed = hash_password(req.password)
        user = User(email=req.email, name=req.name or "", password_hash=hashed)
        # referral logic: if referral_code provided attempt to parse "TC-<refid>-..."
        if req.referral_code:
            try:
                # allow either "TC-<id>-..." or "user-<id>"
                if req.referral_code.startswith("TC-"):
                    parts = req.referral_code.split("-", 2)
                    ref_id = int(parts[1])
                elif req.referral_code.startswith("user-"):
                    ref_id = int(req.referral_code.split("-", 1)[1])
                else:
                    ref_id = None
                if ref_id:
                    ref_user = session.get(User, ref_id)
                    if ref_user:
                        user.referred_by = ref_id
            except Exception:
                user.referred_by = None

        session.add(user)
        session.commit()
        session.refresh(user)

        # create referral code for this user
        user.referral_code = generate_referral_code(user.id)
        session.add(user)

        # create wallet and give signup free credit
        wb = WalletBalance(user_id=user.id, balance=SIGNUP_FREE_CREDIT)
        session.add(wb)
        session.commit()
        session.refresh(wb)

        # transaction record
        wt = WalletTransaction(user_id=user.id, amount=SIGNUP_FREE_CREDIT, note="signup_credit")
        session.add(wt)
        session.commit()

        token = create_token(user.id)
        return {
            "token": token,
            "user_id": user.id,
            "referral_code": user.referral_code,
            "signup_credit": SIGNUP_FREE_CREDIT
        }

@app.post("/login")
def login(req: LoginRequest):
    with Session(engine) as session:
        user = session.exec(select(User).where(User.email == req.email)).first()
        if not user or not verify_password(req.password, user.password_hash):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        token = create_token(user.id)
        return {"token": token, "user_id": user.id, "referral_code": user.referral_code}

# ---------------------------
# Wallet endpoints
# ---------------------------
@app.get("/wallet")
def get_wallet(user: User = Depends(get_user_by_token)):
    if not check_rate_limit(f"user-{user.id}"):
        raise HTTPException(status_code=429, detail="Too many requests")
    with Session(engine) as session:
        wb = session.exec(select(WalletBalance).where(WalletBalance.user_id == user.id)).first()
        if not wb:
            wb = WalletBalance(user_id=user.id, balance=0.0)
            session.add(wb)
            session.commit()
            session.refresh(wb)
        return {"balance": wb.balance}

@app.post("/wallet/create-order")
def create_order(amount: float = Body(..., embed=True), user: User = Depends(get_user_by_token)):
    if not check_rate_limit(f"user-{user.id}"):
        raise HTTPException(status_code=429, detail="Too many requests")
    if not rz_client:
        raise HTTPException(status_code=500, detail="Payment gateway not configured")
    try:
        order = rz_client.order.create({
            "amount": int(amount * 100),
            "currency": "INR",
            "payment_capture": 1,
            "notes": {"user_id": str(user.id)}
        })
        return {"order": order}
    except Exception as e:
        logger.exception("create_order error: %s", e)
        raise HTTPException(status_code=500, detail="Failed to create order")

# ---------------------------
# Razorpay webhook handler
# ---------------------------
@app.post("/webhook/razorpay")
async def razorpay_webhook(request: Request):
    body = await request.body()
    sig = request.headers.get("X-Razorpay-Signature", "")
    # verify signature if configured
    if RAZORPAY_WEBHOOK_SECRET:
        if not verify_razorpay_signature(body, sig):
            logger.warning("Invalid razorpay signature")
            raise HTTPException(status_code=400, detail="Invalid signature")

    data = await request.json()
    try:
        event = data.get("event")
        if event == "payment.captured" or event == "payment.authorized" or event == "order.paid":
            # robust extraction
            payload = data.get("payload", {})
            payment = None
            if payload.get("payment") and payload["payment"].get("entity"):
                payment = payload["payment"]["entity"]
            elif payload.get("order") and payload["order"].get("entity"):
                # fallback - sometimes webhook shapes differ
                payment = payload["order"]["entity"]
            else:
                payment = data.get("payload", {}).get("payment", {}).get("entity") or data.get("payload", {}).get("order", {}).get("entity")

            if not payment:
                logger.warning("webhook: payment entity not found")
                return {"status": "ignored", "reason": "no-payment-entity"}

            notes = payment.get("notes", {}) or {}
            try:
                uid = int(notes.get("user_id")) if notes.get("user_id") else None
            except Exception:
                uid = None

            amt_paise = payment.get("amount", 0)
            amt = float(amt_paise) / 100.0

            if not uid:
                logger.warning("Webhook payment: user_id not in notes")
                return {"status": "ignored-no-user"}

            with Session(engine) as session:
                user = session.get(User, uid)
                if not user:
                    logger.warning("Webhook: user not found %s", uid)
                    return {"status": "ignored-user-not-found"}

                wb = session.exec(select(WalletBalance).where(WalletBalance.user_id == uid)).first()
                if not wb:
                    wb = WalletBalance(user_id=uid, balance=0.0)
                    session.add(wb); session.commit(); session.refresh(wb)

                # credit
                wb.balance += amt
                tx = WalletTransaction(user_id=uid, amount=amt, note="razorpay_payment")
                session.add(tx); session.add(wb); session.commit()

                logger.info("Credited user %s amount ₹%s via webhook", uid, amt)

                # find how many razorpay_payment tx exist for this user
                payments = session.exec(select(WalletTransaction).where(
                    WalletTransaction.user_id == uid,
                    WalletTransaction.note == "razorpay_payment"
                )).all()

                if len(payments) == 1:
                    # first successful paid payment
                    if user.referred_by:
                        ref = session.get(User, user.referred_by)
                        if ref and not user.referral_bonus_given:
                            rwb = session.exec(select(WalletBalance).where(WalletBalance.user_id == ref.id)).first()
                            if not rwb:
                                rwb = WalletBalance(user_id=ref.id, balance=0.0); session.add(rwb); session.commit(); session.refresh(rwb)
                            rwb.balance += REFERRAL_BONUS
                            session.add(WalletTransaction(user_id=ref.id, amount=REFERRAL_BONUS, note=f"referral_bonus_from_user_{user.id}"))
                            user.referral_bonus_given = True
                            session.add(user); session.add(rwb); session.commit()
                            logger.info("Awarded referral bonus ₹%s to user %s because %s paid", REFERRAL_BONUS, ref.id, user.id)
                return {"status": "ok"}
        else:
            return {"status": "ignored", "event": event}
    except Exception as e:
        logger.exception("webhook handler error: %s", e)
        raise HTTPException(status_code=500, detail="webhook error")

# ---------------------------
# Webhook simulator (testing only) - use to simulate payment captured without razorpay
# ---------------------------
@app.post("/webhook/simulate")
def webhook_simulate(user_id: int = Body(...), amount: float = Body(...)):
    # Dev/testing only - to be removed in prod or protected
    body = {"event": "payment.captured", "payload": {"payment": {"entity": {"amount": int(amount*100), "notes": {"user_id": str(user_id)}}}}}
    # call handler internal
    class DummyReq:
        async def body(self):
            return json.dumps(body).encode()
        async def json(self):
            return body
    loop = asyncio.get_event_loop()
    resp = loop.run_until_complete(razorpay_webhook(DummyReq()))
    return {"simulated": resp}

# ---------------------------
# Instances (simplified)
# ---------------------------
@app.post("/create-instance")
def create_instance(req: CreateInstanceRequest, user: User = Depends(get_user_by_token)):
    if not check_rate_limit(f"user-{user.id}"):
        raise HTTPException(status_code=429, detail="Too many requests")
    estimated_price = 10.0 * max(1, req.hours)
    with Session(engine) as session:
        wb = session.exec(select(WalletBalance).where(WalletBalance.user_id == user.id)).first()
        if not wb or wb.balance < estimated_price:
            inst = Instance(user_id=user.id, status="pending")
            session.add(inst); session.commit(); session.refresh(inst)
            return {"status": "insufficient_balance", "required": estimated_price, "instance_id": inst.id}
        # deduct estimated
        wb.balance -= estimated_price
        session.add(WalletTransaction(user_id=user.id, amount=-estimated_price, note="create_instance_estimated"))
        session.add(wb)
        # create instance record (provider placeholder)
        inst = Instance(user_id=user.id, status="running", provider_instance_id=f"virt-{int(time.time())}")
        session.add(inst)
        session.commit(); session.refresh(inst)
        return {"status": "created", "id": inst.id, "estimated_charged": estimated_price}

@app.get("/status/{instance_id}")
def get_status(instance_id: int, user: User = Depends(get_user_by_token)):
    with Session(engine) as session:
        inst = session.get(Instance, instance_id)
        if not inst:
            raise HTTPException(status_code=404, detail="Instance not found")
        if inst.user_id != user.id:
            raise HTTPException(status_code=403, detail="Forbidden")
        return {"id": inst.id, "status": inst.status, "ip": inst.ip}

@app.post("/terminate/{instance_id}")
def terminate_instance(instance_id: int, user: User = Depends(get_user_by_token)):
    with Session(engine) as session:
        inst = session.get(Instance, instance_id)
        if not inst:
            raise HTTPException(status_code=404, detail="Instance not found")
        if inst.user_id != user.id:
            raise HTTPException(status_code=403, detail="Forbidden")
        inst.status = "terminated"
        session.add(inst); session.commit()
        return {"status": "terminated"}

# ---------------------------
# Admin endpoints (token)
# ---------------------------
def admin_auth(token: Optional[str] = Header(None)):
    if token != ADMIN_TOKEN:
        raise HTTPException(status_code=401, detail="Invalid admin token")

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

# ---------------------------
# Global exception handler
# ---------------------------
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error: %s", exc)
    try:
        telegram_send(f"Server error: {str(exc)}")
    except Exception:
        pass
    return JSONResponse(status_code=500, content={"detail": "internal server error"})

# ---------------------------
# Health
# ---------------------------
@app.get("/health")
def health():
    return {"status": "ok"}

# ---------------------------
# Simple signup/login/wallet docs (quick)
# ---------------------------
@app.get("/")
def index():
    return {
        "info": "TurboCompute backend",
        "notes": [
            "POST /signup {email,password,name,referral_code?}",
            "POST /login {email,password}",
            "GET /wallet (auth Bearer user-<id>)",
            "POST /wallet/create-order {amount} (auth)",
            "POST /webhook/razorpay (RAZORPAY webhook)",
            "POST /webhook/simulate {user_id,amount} (dev only)"
        ]
    }
