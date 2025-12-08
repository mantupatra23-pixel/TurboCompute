# backend/main.py
import os
import time
from fastapi import FastAPI, BackgroundTasks, HTTPException
from pydantic import BaseModel
from sqlmodel import SQLModel, Field, Session, create_engine, select
from provider.vast_adapter import VastAdapter

# Load env
VAST_API_KEY = os.getenv("VAST_API_KEY", "")  # set in Render
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./instances.db")

app = FastAPI(title="TurboCompute Backend")

# DB setup
engine = create_engine(DATABASE_URL, echo=False)
class Instance(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    provider: str
    provider_instance_id: str | None = None
    plan: str | None = None
    status: str | None = None
    ip: str | None = None
    created_at: float | None = None
    raw: str | None = None

SQLModel.metadata.create_all(engine)

# Provider init
vast = VastAdapter(api_key=VAST_API_KEY)

class CreateRequest(BaseModel):
    plan_code: str   # provider-specific plan id (eg: vast image/offering id)
    hours: int = 1

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/create-instance")
def create_instance(req: CreateRequest, background_tasks: BackgroundTasks):
    if not VAST_API_KEY:
        raise HTTPException(500, "VAST_API_KEY not configured")
    # Create DB record
    inst = Instance(provider="vast", plan=req.plan_code, status="creating", created_at=time.time())
    with Session(engine) as session:
        session.add(inst)
        session.commit()
        session.refresh(inst)

    # Launch at provider (background)
    background_tasks.add_task(_launch_and_update, inst.id, req)
    return {"id": inst.id, "status": inst.status}

def _launch_and_update(instance_db_id: int, req: CreateRequest):
    with Session(engine) as session:
        inst = session.get(Instance, instance_db_id)
        try:
            prov_resp = vast.create_instance(plan_code=req.plan_code, runtime_hours=req.hours)
            inst.provider_instance_id = prov_resp.get("id")
            inst.status = prov_resp.get("status", "running")
            inst.ip = prov_resp.get("ip")
            inst.raw = str(prov_resp)
            session.add(inst)
            session.commit()
            # Start polling usage in background loop (simple)
            # Poll for status every 20s for demo (replace with webhook if available)
            for _ in range(req.hours * 3):  # poll roughly every 20s * 3 * hours ~ hours
                time.sleep(20)
                try:
                    s = vast.get_instance_status(inst.provider_instance_id)
                    inst.status = s.get("status", inst.status)
                    inst.ip = s.get("ip", inst.ip)
                    inst.raw = str(s)
                    session.add(inst); session.commit()
                    if inst.status in ("terminated", "stopped", "failed"):
                        break
                except Exception:
                    pass
        except Exception as e:
            inst.status = "error"
            inst.raw = str(e)
            session.add(inst); session.commit()

@app.get("/status/{instance_id}")
def get_status(instance_id: int):
    with Session(engine) as session:
        inst = session.get(Instance, instance_id)
        if not inst:
            raise HTTPException(404, "Instance not found")
        return {
            "id": inst.id,
            "provider_instance_id": inst.provider_instance_id,
            "status": inst.status,
            "ip": inst.ip,
            "raw": inst.raw
        }

@app.post("/terminate/{instance_id}")
def terminate_instance(instance_id: int):
    with Session(engine) as session:
        inst = session.get(Instance, instance_id)
        if not inst:
            raise HTTPException(404, "Instance not found")
        if not inst.provider_instance_id:
            inst.status = "terminated"; session.add(inst); session.commit()
            return {"status": "terminated"}
        try:
            vast.terminate_instance(inst.provider_instance_id)
            inst.status = "terminated"
            session.add(inst); session.commit()
            return {"status": "terminated"}
        except Exception as e:
            raise HTTPException(500, str(e))
