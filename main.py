# backend/main.py
import os
import time
import json
from fastapi import FastAPI, BackgroundTasks, HTTPException, Depends, Header, Request
from pydantic import BaseModel
from sqlmodel import SQLModel, Session, create_engine, select
import razorpay

# local modules
from models import User, WalletBalance, WalletTransaction, Instance
from auth import hash_password, verify_password, create_access_token, decode_token
from provider.vast_adapter import VastAdapter

# -------------------------
# Environment / Config
# -------------------------
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./instances.db")
VAST_API_KEY = os.getenv("VAST_API_KEY", "")
RAZORPAY_KEY = os.getenv("RAZORPAY_KEY", "")
RAZORPAY_SECRET = os.getenv("RAZORPAY_SECRET", "")
RAZORPAY_WEBHOOK_SECRET = os.getenv("RAZORPAY_WEBHOOK_SECRET", "")

# -------------------------
# App + DB init
# -------------------------
app = FastAPI(title="TurboCompute Backend")

engine = create_engine(DATABASE_URL, echo=False)
SQLModel.metadata.create_all(engine)

# -------------------------
# Provider init
# -------------------------
vast = VastAdapter(api_key=VAST_API_KEY)

# Razorpay client (optional)
rz_client = None
if RAZORPAY_KEY and RAZORPAY_SECRET:
    try:
        rz_client = razorpay.Client(auth=(RAZORPAY_KEY, RAZORPAY_SECRET))
    except Exception:
        rz_client = None

# -------------------------
# Helpers / Auth dependency
# -------------------------
def get_current_user(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing auth header")
    token = authorization.replace("Bearer ", "")
    sub = decode_token(token)
    if not sub:
        raise HTTPException(status_code=401, detail="Invalid token")
    with Session(engine) as session:
        user = session.get(User, int(sub))
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user

# -------------------------
# Request Schemas
# -------------------------
class SignupRequest(BaseModel):
    email: str
    password: str
    name: str = ""

class LoginRequest(BaseModel):
    email: str
    password: str

class CreateInstanceRequest(BaseModel):
    plan_code: str
    hours: int = 1

# -------------------------
# Health
# -------------------------
@app.get("/health")
def health():
    return {"status": "ok"}

# -------------------------
# Auth endpoints
# -------------------------
@app.post("/signup")
def signup(req: SignupRequest):
    with Session(engine) as session:
        exists = session.exec(select(User).where(User.email == req.email)).first()
        if exists:
            raise HTTPException(status_code=400, detail="User already exists")
        user = User(email=req.email, name=req.name, hashed_password=hash_password(req.password))
        session.add(user)
        session.commit()
        session.refresh(user)
        # create wallet record
        wb = WalletBalance(user_id=user.id, balance=0.0)
        session.add(wb)
        session.commit()
        token = create_access_token(str(user.id))
        return {"token": token, "user_id": user.id}

@app.post("/login")
def login(req: LoginRequest):
    with Session(engine) as session:
        user = session.exec(select(User).where(User.email == req.email)).first()
        if not user or not verify_password(req.password, user.hashed_password):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        token = create_access_token(str(user.id))
        return {"token": token, "user_id": user.id}

# -------------------------
# Wallet endpoints
# -------------------------
@app.get("/wallet")
def get_wallet(user = Depends(get_current_user)):
    with Session(engine) as session:
        wb = session.exec(select(WalletBalance).where(WalletBalance.user_id == user.id)).first()
        if not wb:
            wb = WalletBalance(user_id=user.id, balance=0.0)
            session.add(wb)
            session.commit()
            session.refresh(wb)
        return {"balance": wb.balance}

@app.post("/wallet/create-order")
def create_order(amount: float, user = Depends(get_current_user)):
    """
    Create Razorpay order. amount = rupees (float)
    Returns order object from Razorpay.
    """
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
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/webhook/razorpay")
async def razorpay_webhook(request: Request):
    body = await request.body()
    sig = request.headers.get("X-Razorpay-Signature", "")
    if not RAZORPAY_WEBHOOK_SECRET:
        raise HTTPException(status_code=500, detail="Webhook secret not configured")
    try:
        rz_client.utility.verify_webhook_signature(body.decode(), sig, RAZORPAY_WEBHOOK_SECRET)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid signature: {e}")
    data = await request.json()
    # handle payment captured event
    if data.get("event") == "payment.captured":
        entity = data["payload"]["payment"]["entity"]
        notes = entity.get("notes", {})
        try:
            user_id = int(notes.get("user_id", 0) or 0)
        except Exception:
            user_id = 0
        amt = entity.get("amount", 0) / 100.0
        if user_id > 0 and amt > 0:
            with Session(engine) as session:
                wb = session.exec(select(WalletBalance).where(WalletBalance.user_id == user_id)).first()
                if not wb:
                    wb = WalletBalance(user_id=user_id, balance=0.0)
                    session.add(wb); session.commit(); session.refresh(wb)
                wb.balance += amt
                session.add(wb)
                tx = WalletTransaction(user_id=user_id, amount=amt, type="credit", note="razorpay")
                session.add(tx)
                session.commit()
    return {"status": "ok"}

# -------------------------
# Instance management
# -------------------------
@app.post("/create-instance")
def create_instance(req: CreateInstanceRequest, background_tasks: BackgroundTasks, user = Depends(get_current_user)):
    # Check wallet balance (simple check)
    with Session(engine) as session:
        wb = session.exec(select(WalletBalance).where(WalletBalance.user_id == user.id)).first()
        if not wb or wb.balance <= 0:
            raise HTTPException(status_code=402, detail="Insufficient wallet balance")
        inst = Instance(user_id=user.id, provider="vast", plan=req.plan_code, status="creating")
        session.add(inst)
        session.commit()
        session.refresh(inst)
    # Launch in background
    background_tasks.add_task(_launch_and_update, inst.id, req, user.id)
    return {"id": inst.id, "status": inst.status}

def _launch_and_update(instance_db_id: int, req: CreateInstanceRequest, user_id: int):
    with Session(engine) as session:
        inst = session.get(Instance, instance_db_id)
        if not inst:
            return
        try:
            prov_resp = vast.create_instance(plan_code=req.plan_code, runtime_hours=req.hours)
            inst.provider_instance_id = prov_resp.get("id")
            inst.status = prov_resp.get("status", "running")
            inst.ip = prov_resp.get("ip")
            inst.raw = json.dumps(prov_resp)
            session.add(inst); session.commit()
            # Basic billing: deduct estimated price (example)
            estimated_price = 10.0 * req.hours  # replace with real provider price
            wb = session.exec(select(WalletBalance).where(WalletBalance.user_id == user_id)).first()
            if wb and wb.balance >= estimated_price:
                wb.balance -= estimated_price
                session.add(wb)
                tx = WalletTransaction(user_id=user_id, amount=estimated_price, type="debit", note="reservation")
                session.add(tx)
                session.commit()
            # Poll for status (simple loop)
            for _ in range(max(3, req.hours * 3)):
                time.sleep(20)
                try:
                    sdata = vast.get_instance_status(inst.provider_instance_id)
                    inst.status = sdata.get("status", inst.status)
                    inst.ip = sdata.get("ip", inst.ip)
                    inst.raw = json.dumps(sdata)
                    session.add(inst); session.commit()
                    if inst.status in ("terminated", "stopped", "failed"):
                        break
                except Exception:
                    continue
        except Exception as e:
            inst.status = "error"
            inst.raw = str(e)
            session.add(inst); session.commit()

@app.get("/status/{instance_id}")
def get_status(instance_id: int, user = Depends(get_current_user)):
    with Session(engine) as session:
        inst = session.get(Instance, instance_id)
        if not inst:
            raise HTTPException(status_code=404, detail="Instance not found")
        if inst.user_id != user.id:
            raise HTTPException(status_code=403, detail="Not your instance")
        return {
            "id": inst.id,
            "provider_instance_id": inst.provider_instance_id,
            "status": inst.status,
            "ip": inst.ip,
            "raw": inst.raw
        }

@app.post("/terminate/{instance_id}")
def terminate_instance(instance_id: int, user = Depends(get_current_user)):
    with Session(engine) as session:
        inst = session.get(Instance, instance_id)
        if not inst:
            raise HTTPException(status_code=404, detail="Instance not found")
        if inst.user_id != user.id:
            raise HTTPException(status_code=403, detail="Not your instance")
        if not inst.provider_instance_id:
            inst.status = "terminated"
            session.add(inst); session.commit()
            return {"status": "terminated"}
        try:
            vast.terminate_instance(inst.provider_instance_id)
            inst.status = "terminated"
            session.add(inst); session.commit()
            return {"status": "terminated"}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
