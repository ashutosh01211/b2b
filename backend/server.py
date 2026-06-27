from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import uuid
import logging
import asyncio
import bcrypt
import jwt
import requests
import resend
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict
from fastapi import (
    FastAPI, APIRouter, HTTPException, Depends, Request, Response,
    UploadFile, File, WebSocket, WebSocketDisconnect, Header, Query
)
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field

# ===== Config =====
MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']
JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALG = "HS256"
APP_NAME = os.environ.get('APP_NAME', 'b2bhub')
STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get('EMERGENT_LLM_KEY')
RESEND_API_KEY = os.environ.get('RESEND_API_KEY', '')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')
if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI()
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("b2b")

# ===== Storage =====
storage_key: Optional[str] = None

def init_storage():
    global storage_key
    if storage_key:
        return storage_key
    try:
        resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
        resp.raise_for_status()
        storage_key = resp.json()["storage_key"]
        return storage_key
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
        return None

def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    if not key:
        raise HTTPException(500, "Storage unavailable")
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=120
    )
    if resp.status_code == 403:
        global storage_key
        storage_key = None
        key = init_storage()
        resp = requests.put(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key, "Content-Type": content_type},
            data=data, timeout=120
        )
    resp.raise_for_status()
    return resp.json()

def get_object(path: str):
    key = init_storage()
    resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    if resp.status_code == 403:
        global storage_key
        storage_key = None
        key = init_storage()
        resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")

# ===== Helpers =====
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False

def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id, "email": email, "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "access"
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)

def now_iso():
    return datetime.now(timezone.utc).isoformat()

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        user = await db.users.find_one({"id": payload["sub"]})
        if not user:
            raise HTTPException(401, "User not found")
        user.pop("_id", None)
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")

def require_role(*roles):
    async def dep(user: dict = Depends(get_current_user)):
        if user["role"] not in roles:
            raise HTTPException(403, "Forbidden")
        return user
    return dep

# ===== Models =====
class RegisterIn(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str  # buyer | supplier
    company_name: Optional[str] = None

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class CompanyIn(BaseModel):
    name: str
    description: str = ""
    website: str = ""
    country: str = ""
    industry: str = ""
    year_established: Optional[int] = None
    logo: str = ""

class ProductIn(BaseModel):
    title: str
    description: str = ""
    category: str = "General"
    price: float = 0.0
    moq: int = 1  # minimum order qty
    unit: str = "piece"
    images: List[str] = []  # storage paths
    status: str = "active"

class InquiryIn(BaseModel):
    product_id: str
    message: str
    quantity: int = 1

class MessageIn(BaseModel):
    thread_id: str
    body: str

# ===== Auth =====
def serialize_user(u):
    return {
        "id": u["id"], "email": u["email"], "name": u["name"],
        "role": u["role"], "company_id": u.get("company_id"),
        "approved": u.get("approved", True),
        "created_at": u.get("created_at"),
    }

def set_auth_cookie(response: Response, token: str):
    response.set_cookie(
        key="access_token", value=token, httponly=True, secure=True,
        samesite="none", max_age=7*24*3600, path="/"
    )

@api.post("/auth/register")
async def register(data: RegisterIn, response: Response):
    if data.role not in ("buyer", "supplier"):
        raise HTTPException(400, "Invalid role")
    email = data.email.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(400, "Email already registered")

    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id, "email": email, "name": data.name,
        "password_hash": hash_password(data.password), "role": data.role,
        "approved": True, "created_at": now_iso(),
    }

    company_id = None
    if data.role == "supplier":
        company_id = str(uuid.uuid4())
        company_doc = {
            "id": company_id, "name": data.company_name or f"{data.name}'s Company",
            "owner_id": user_id, "description": "", "website": "",
            "country": "", "industry": "", "logo": "",
            "verified": False, "created_at": now_iso(),
        }
        await db.companies.insert_one(company_doc)
        user_doc["company_id"] = company_id

    await db.users.insert_one(user_doc)
    token = create_access_token(user_id, email, data.role)
    set_auth_cookie(response, token)
    return {"user": serialize_user(user_doc), "token": token}

@api.post("/auth/login")
async def login(data: LoginIn, response: Response):
    email = data.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(401, "Invalid credentials")
    token = create_access_token(user["id"], user["email"], user["role"])
    set_auth_cookie(response, token)
    return {"user": serialize_user(user), "token": token}

@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}

@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return serialize_user(user)

# ===== Companies =====
@api.get("/companies")
async def list_companies(q: str = "", limit: int = 50):
    query = {}
    if q:
        query["name"] = {"$regex": q, "$options": "i"}
    docs = await db.companies.find(query, {"_id": 0}).limit(limit).to_list(limit)
    return docs

@api.get("/companies/{company_id}")
async def get_company(company_id: str):
    doc = await db.companies.find_one({"id": company_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Not found")
    # include products count
    products = await db.products.find({"company_id": company_id, "status": "active"}, {"_id": 0}).to_list(100)
    doc["products"] = products
    return doc

@api.put("/companies/me")
async def update_my_company(data: CompanyIn, user: dict = Depends(require_role("supplier"))):
    cid = user.get("company_id")
    if not cid:
        raise HTTPException(404, "No company")
    update = data.model_dump()
    await db.companies.update_one({"id": cid}, {"$set": update})
    doc = await db.companies.find_one({"id": cid}, {"_id": 0})
    return doc

@api.get("/companies/me/profile")
async def my_company(user: dict = Depends(require_role("supplier"))):
    cid = user.get("company_id")
    doc = await db.companies.find_one({"id": cid}, {"_id": 0})
    return doc

# ===== Products =====
@api.get("/products")
async def list_products(q: str = "", category: str = "", limit: int = 60):
    query: Dict = {"status": "active"}
    if q:
        query["title"] = {"$regex": q, "$options": "i"}
    if category and category != "all":
        query["category"] = category
    docs = await db.products.find(query, {"_id": 0}).limit(limit).to_list(limit)
    # attach company name
    cids = list({d["company_id"] for d in docs if d.get("company_id")})
    cmap = {}
    if cids:
        async for c in db.companies.find({"id": {"$in": cids}}, {"_id": 0, "id": 1, "name": 1, "country": 1}):
            cmap[c["id"]] = c
    for d in docs:
        d["company"] = cmap.get(d.get("company_id"), {})
    return docs

@api.get("/products/categories")
async def categories():
    cats = await db.products.distinct("category", {"status": "active"})
    return sorted(cats)

@api.get("/products/{product_id}")
async def get_product(product_id: str):
    p = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not p:
        raise HTTPException(404, "Not found")
    company = await db.companies.find_one({"id": p.get("company_id")}, {"_id": 0}) if p.get("company_id") else None
    p["company"] = company
    return p

@api.post("/products")
async def create_product(data: ProductIn, user: dict = Depends(require_role("supplier"))):
    cid = user.get("company_id")
    if not cid:
        raise HTTPException(400, "No company")
    pid = str(uuid.uuid4())
    doc = {"id": pid, "company_id": cid, "supplier_id": user["id"],
           "created_at": now_iso(), **data.model_dump()}
    await db.products.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.put("/products/{product_id}")
async def update_product(product_id: str, data: ProductIn, user: dict = Depends(require_role("supplier"))):
    p = await db.products.find_one({"id": product_id})
    if not p:
        raise HTTPException(404, "Not found")
    if p["supplier_id"] != user["id"]:
        raise HTTPException(403, "Not owner")
    await db.products.update_one({"id": product_id}, {"$set": data.model_dump()})
    doc = await db.products.find_one({"id": product_id}, {"_id": 0})
    return doc

@api.delete("/products/{product_id}")
async def delete_product(product_id: str, user: dict = Depends(require_role("supplier", "admin"))):
    p = await db.products.find_one({"id": product_id})
    if not p:
        raise HTTPException(404, "Not found")
    if user["role"] != "admin" and p["supplier_id"] != user["id"]:
        raise HTTPException(403, "Not owner")
    await db.products.delete_one({"id": product_id})
    return {"ok": True}

@api.get("/products/me/list")
async def my_products(user: dict = Depends(require_role("supplier"))):
    docs = await db.products.find({"supplier_id": user["id"]}, {"_id": 0}).to_list(200)
    return docs

# ===== File Upload =====
@api.post("/upload")
async def upload_file(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    ext = file.filename.split(".")[-1].lower() if "." in file.filename else "bin"
    if ext not in ("jpg", "jpeg", "png", "gif", "webp"):
        raise HTTPException(400, "Invalid file type")
    path = f"{APP_NAME}/uploads/{user['id']}/{uuid.uuid4()}.{ext}"
    data = await file.read()
    if len(data) > 5 * 1024 * 1024:
        raise HTTPException(400, "File too large (max 5MB)")
    ct = file.content_type or f"image/{ext}"
    result = put_object(path, data, ct)
    await db.files.insert_one({
        "id": str(uuid.uuid4()), "storage_path": result["path"],
        "user_id": user["id"], "content_type": ct,
        "size": result.get("size", len(data)), "is_deleted": False,
        "created_at": now_iso(),
    })
    return {"path": result["path"], "url": f"/api/files/{result['path']}"}

@api.post("/upload/bulk")
async def upload_bulk(files: List[UploadFile] = File(...), user: dict = Depends(get_current_user)):
    if len(files) > 10:
        raise HTTPException(400, "Max 10 files per upload")
    results = []
    for file in files:
        ext = file.filename.split(".")[-1].lower() if "." in file.filename else "bin"
        if ext not in ("jpg", "jpeg", "png", "gif", "webp"):
            continue
        data = await file.read()
        if len(data) > 5 * 1024 * 1024:
            continue
        path = f"{APP_NAME}/uploads/{user['id']}/{uuid.uuid4()}.{ext}"
        ct = file.content_type or f"image/{ext}"
        try:
            result = put_object(path, data, ct)
            await db.files.insert_one({
                "id": str(uuid.uuid4()), "storage_path": result["path"],
                "user_id": user["id"], "content_type": ct,
                "size": result.get("size", len(data)), "is_deleted": False,
                "created_at": now_iso(),
            })
            results.append({"path": result["path"], "url": f"/api/files/{result['path']}"})
        except Exception as e:
            logger.error(f"Bulk upload failed for {file.filename}: {e}")
    return {"uploaded": results, "count": len(results)}

@api.get("/files/{path:path}")
async def serve_file(path: str):
    record = await db.files.find_one({"storage_path": path, "is_deleted": False})
    if not record:
        raise HTTPException(404, "Not found")
    data, ct = get_object(path)
    return Response(content=data, media_type=record.get("content_type", ct))

# ===== Email =====
async def send_email(to: str, subject: str, html: str):
    """Sends email via Resend if API key set; otherwise logs to console."""
    if not RESEND_API_KEY:
        logger.info(f"[EMAIL-MOCK] To={to} | Subject={subject}")
        return {"mocked": True}
    try:
        params = {"from": SENDER_EMAIL, "to": [to], "subject": subject, "html": html}
        result = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"Email sent to {to}: {result.get('id')}")
        return result
    except Exception as e:
        logger.error(f"Email send failed: {e}")
        return {"error": str(e)}

# ===== Favorites =====
@api.get("/favorites")
async def list_favorites(user: dict = Depends(require_role("buyer"))):
    favs = await db.favorites.find({"buyer_id": user["id"]}, {"_id": 0}).to_list(500)
    pids = [f["product_id"] for f in favs]
    if not pids:
        return []
    products = await db.products.find({"id": {"$in": pids}}, {"_id": 0}).to_list(500)
    cids = list({p.get("company_id") for p in products if p.get("company_id")})
    cmap = {}
    async for c in db.companies.find({"id": {"$in": cids}}, {"_id": 0, "id": 1, "name": 1}):
        cmap[c["id"]] = c
    for p in products:
        p["company"] = cmap.get(p.get("company_id"), {})
    return products

@api.get("/favorites/ids")
async def list_favorite_ids(user: dict = Depends(require_role("buyer"))):
    favs = await db.favorites.find({"buyer_id": user["id"]}, {"_id": 0, "product_id": 1}).to_list(500)
    return [f["product_id"] for f in favs]

@api.post("/favorites/{product_id}")
async def toggle_favorite(product_id: str, user: dict = Depends(require_role("buyer"))):
    existing = await db.favorites.find_one({"buyer_id": user["id"], "product_id": product_id})
    if existing:
        await db.favorites.delete_one({"_id": existing["_id"]})
        return {"favorited": False}
    product = await db.products.find_one({"id": product_id})
    if not product:
        raise HTTPException(404, "Product not found")
    await db.favorites.insert_one({
        "id": str(uuid.uuid4()), "buyer_id": user["id"], "product_id": product_id,
        "created_at": now_iso(),
    })
    return {"favorited": True}

# ===== Inquiries =====
@api.post("/inquiries")
async def create_inquiry(data: InquiryIn, user: dict = Depends(require_role("buyer"))):
    product = await db.products.find_one({"id": data.product_id})
    if not product:
        raise HTTPException(404, "Product not found")
    iid = str(uuid.uuid4())

    # Create or get chat thread for buyer<->supplier<->product
    thread = await db.threads.find_one({
        "buyer_id": user["id"], "supplier_id": product["supplier_id"], "product_id": data.product_id,
    })
    if not thread:
        thread_id = str(uuid.uuid4())
        thread_doc = {
            "id": thread_id, "buyer_id": user["id"], "supplier_id": product["supplier_id"],
            "product_id": data.product_id, "product_title": product["title"],
            "company_id": product["company_id"], "created_at": now_iso(),
            "last_message_at": now_iso(),
        }
        await db.threads.insert_one(thread_doc)
    else:
        thread_id = thread["id"]

    doc = {
        "id": iid, "buyer_id": user["id"], "buyer_name": user["name"],
        "product_id": data.product_id, "product_title": product["title"],
        "supplier_id": product["supplier_id"], "company_id": product["company_id"],
        "message": data.message, "quantity": data.quantity, "status": "open",
        "thread_id": thread_id, "created_at": now_iso(),
    }
    await db.inquiries.insert_one(doc)

    # Add first message to thread
    await db.messages.insert_one({
        "id": str(uuid.uuid4()), "thread_id": thread_id, "sender_id": user["id"],
        "sender_name": user["name"], "body": data.message, "created_at": now_iso(),
    })
    await db.threads.update_one({"id": thread_id}, {"$set": {"last_message_at": now_iso()}})

    # Send email notification to supplier (non-blocking)
    supplier = await db.users.find_one({"id": product["supplier_id"]})
    if supplier:
        html = f"""
        <table style="font-family:Arial,sans-serif;max-width:600px;border:1px solid #E2E8F0;padding:24px">
          <tr><td>
            <h2 style="color:#0F172A;margin:0 0 16px 0">New Inquiry on B2B/HUB</h2>
            <p style="color:#475569;line-height:1.6">
              Hi {supplier['name']},<br/><br/>
              <strong>{user['name']}</strong> sent you an inquiry about
              <strong>{product['title']}</strong>.
            </p>
            <div style="background:#F8FAFC;border-left:3px solid #0047FF;padding:12px;margin:16px 0">
              <p style="margin:0;color:#0F172A"><strong>Quantity:</strong> {data.quantity}</p>
              <p style="margin:8px 0 0 0;color:#475569">{data.message}</p>
            </div>
            <a href="{os.environ.get('FRONTEND_URL','')}/chat/{thread_id}"
               style="display:inline-block;background:#0047FF;color:white;padding:12px 24px;text-decoration:none;font-weight:bold">
              Reply to buyer →
            </a>
          </td></tr>
        </table>
        """
        asyncio.create_task(send_email(
            supplier["email"],
            f"New inquiry: {product['title']}",
            html,
        ))

    doc.pop("_id", None)
    return doc

@api.get("/inquiries")
async def list_inquiries(user: dict = Depends(get_current_user)):
    if user["role"] == "buyer":
        q = {"buyer_id": user["id"]}
    elif user["role"] == "supplier":
        q = {"supplier_id": user["id"]}
    else:
        q = {}
    docs = await db.inquiries.find(q, {"_id": 0}).sort("created_at", -1).to_list(200)
    return docs

# ===== Chat =====
@api.get("/threads")
async def list_threads(user: dict = Depends(get_current_user)):
    if user["role"] == "buyer":
        q = {"buyer_id": user["id"]}
    elif user["role"] == "supplier":
        q = {"supplier_id": user["id"]}
    else:
        raise HTTPException(403, "Forbidden")
    docs = await db.threads.find(q, {"_id": 0}).sort("last_message_at", -1).to_list(200)
    # attach counterpart name
    uids = set()
    for d in docs:
        uids.add(d["buyer_id"])
        uids.add(d["supplier_id"])
    umap = {}
    async for u in db.users.find({"id": {"$in": list(uids)}}, {"_id": 0, "id": 1, "name": 1}):
        umap[u["id"]] = u["name"]
    for d in docs:
        d["buyer_name"] = umap.get(d["buyer_id"], "Buyer")
        d["supplier_name"] = umap.get(d["supplier_id"], "Supplier")
    return docs

@api.get("/threads/{thread_id}/messages")
async def thread_messages(thread_id: str, user: dict = Depends(get_current_user)):
    t = await db.threads.find_one({"id": thread_id})
    if not t:
        raise HTTPException(404, "Thread not found")
    if user["id"] not in (t["buyer_id"], t["supplier_id"]) and user["role"] != "admin":
        raise HTTPException(403, "Forbidden")
    msgs = await db.messages.find({"thread_id": thread_id}, {"_id": 0}).sort("created_at", 1).to_list(500)
    return msgs

@api.post("/threads/{thread_id}/messages")
async def send_message(thread_id: str, data: MessageIn, user: dict = Depends(get_current_user)):
    t = await db.threads.find_one({"id": thread_id})
    if not t:
        raise HTTPException(404, "Thread not found")
    if user["id"] not in (t["buyer_id"], t["supplier_id"]):
        raise HTTPException(403, "Forbidden")
    msg = {
        "id": str(uuid.uuid4()), "thread_id": thread_id, "sender_id": user["id"],
        "sender_name": user["name"], "body": data.body, "created_at": now_iso(),
    }
    await db.messages.insert_one(msg)
    await db.threads.update_one({"id": thread_id}, {"$set": {"last_message_at": now_iso()}})
    # Broadcast via WebSocket
    await ws_manager.broadcast(thread_id, {"type": "message", "data": msg})
    msg.pop("_id", None)
    return msg

# ===== WebSocket =====
class WSManager:
    def __init__(self):
        self.rooms: Dict[str, List[WebSocket]] = {}

    async def connect(self, thread_id: str, ws: WebSocket):
        await ws.accept()
        self.rooms.setdefault(thread_id, []).append(ws)

    def disconnect(self, thread_id: str, ws: WebSocket):
        if thread_id in self.rooms:
            try:
                self.rooms[thread_id].remove(ws)
            except ValueError:
                pass

    async def broadcast(self, thread_id: str, payload: dict):
        dead = []
        for ws in self.rooms.get(thread_id, []):
            try:
                await ws.send_json(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(thread_id, ws)

ws_manager = WSManager()

@app.websocket("/api/ws/chat/{thread_id}")
async def chat_ws(websocket: WebSocket, thread_id: str, token: str = Query(None)):
    if not token:
        await websocket.close(code=4401)
        return
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        user_id = payload["sub"]
    except Exception:
        await websocket.close(code=4401)
        return
    t = await db.threads.find_one({"id": thread_id})
    if not t or user_id not in (t["buyer_id"], t["supplier_id"]):
        await websocket.close(code=4403)
        return
    await ws_manager.connect(thread_id, websocket)
    try:
        while True:
            data = await websocket.receive_json()
            body = (data or {}).get("body", "").strip()
            if not body:
                continue
            user = await db.users.find_one({"id": user_id}, {"_id": 0})
            msg = {
                "id": str(uuid.uuid4()), "thread_id": thread_id, "sender_id": user_id,
                "sender_name": user["name"], "body": body, "created_at": now_iso(),
            }
            await db.messages.insert_one(msg)
            await db.threads.update_one({"id": thread_id}, {"$set": {"last_message_at": now_iso()}})
            msg.pop("_id", None)
            await ws_manager.broadcast(thread_id, {"type": "message", "data": msg})
    except WebSocketDisconnect:
        ws_manager.disconnect(thread_id, websocket)
    except Exception as e:
        logger.error(f"WS error: {e}")
        ws_manager.disconnect(thread_id, websocket)

# ===== Admin =====
@api.get("/admin/stats")
async def admin_stats(user: dict = Depends(require_role("admin"))):
    return {
        "users": await db.users.count_documents({}),
        "buyers": await db.users.count_documents({"role": "buyer"}),
        "suppliers": await db.users.count_documents({"role": "supplier"}),
        "companies": await db.companies.count_documents({}),
        "products": await db.products.count_documents({}),
        "inquiries": await db.inquiries.count_documents({}),
        "messages": await db.messages.count_documents({}),
    }

@api.get("/admin/users")
async def admin_users(user: dict = Depends(require_role("admin"))):
    docs = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(500)
    return docs

@api.get("/admin/companies")
async def admin_companies(user: dict = Depends(require_role("admin"))):
    docs = await db.companies.find({}, {"_id": 0}).to_list(500)
    return docs

@api.get("/admin/products")
async def admin_products(user: dict = Depends(require_role("admin"))):
    docs = await db.products.find({}, {"_id": 0}).to_list(500)
    return docs

@api.post("/admin/companies/{company_id}/verify")
async def admin_verify_company(company_id: str, user: dict = Depends(require_role("admin"))):
    await db.companies.update_one({"id": company_id}, {"$set": {"verified": True}})
    return {"ok": True}

@api.delete("/admin/users/{user_id}")
async def admin_delete_user(user_id: str, user: dict = Depends(require_role("admin"))):
    if user_id == user["id"]:
        raise HTTPException(400, "Cannot delete self")
    await db.users.delete_one({"id": user_id})
    return {"ok": True}

# ===== Startup =====
@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.products.create_index("title")
    await db.products.create_index("category")
    await db.companies.create_index("name")
    await db.threads.create_index([("buyer_id", 1), ("supplier_id", 1)])
    await db.messages.create_index("thread_id")
    await db.favorites.create_index([("buyer_id", 1), ("product_id", 1)], unique=True)

    # Seed admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@b2bhub.com").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "Admin@12345")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()), "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "Admin", "role": "admin",
            "approved": True, "created_at": now_iso(),
        })
        logger.info(f"Seeded admin: {admin_email}")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_password)}}
        )

    # Init storage
    init_storage()

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_origin_regex=".*",
    allow_methods=["*"],
    allow_headers=["*"],
)
