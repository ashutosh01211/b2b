# B2B Marketplace (B2B/HUB) — PRD

## Problem Statement
Build a B2B marketplace where suppliers register companies and upload products. Buyers can search products, view company profiles, send inquiries, and chat with suppliers. Three roles: Buyer, Supplier, Admin. Modern responsive design with authentication, dashboards, and an admin panel.

## User Personas
- **Buyer**: Browse products & suppliers, send inquiries, chat with suppliers.
- **Supplier**: Manage company profile, list/edit products with images, respond to inquiries.
- **Admin**: Monitor stats, verify companies, manage users/products.

## Architecture
- Frontend: React 19 + React Router 7, TailwindCSS, shadcn/ui, sonner toasts
- Backend: FastAPI + Motor (MongoDB)
- Auth: JWT (bcrypt) — httpOnly cookies + Bearer header fallback
- File storage: Emergent Object Storage (`EMERGENT_LLM_KEY`)
- Realtime chat: WebSocket (`/api/ws/chat/:thread_id`)

## Implemented (Feb 2026)
- JWT auth: register (buyer/supplier role), login, logout, /me
- Admin seeded on startup (`admin@b2bhub.com` / `Admin@12345`)
- Companies: list, view by id, supplier-self update
- Products: CRUD, search by query+category, categories endpoint
- Image upload (multipart → object storage), file serving
- Inquiries (buyer→supplier) auto-create chat threads
- Threads/messages REST + WebSocket realtime broadcast
- Admin endpoints: stats, users, companies (verify), products
- Pages: Landing, Login, Register, Browse (products/suppliers), Product detail, Company profile, Buyer/Supplier/Admin dashboards, Chat

## Backlog (P1/P2)
- P1: Saved/favorited products for buyers
- P1: Email notifications on new inquiries
- P1: Multi-image gallery upload-at-once
- P2: Advanced filters (country, MOQ range, certifications)
- P2: Order/RFQ workflow with attachments
- P2: Stripe escrow for transactions (revenue lever)
- P2: Supplier verification documents upload

## Test Credentials
See `/app/memory/test_credentials.md`.
