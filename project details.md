Backend Engineer Assignment – Secure Credit-Based SaaS Platform with Blockchain Layer
📌 Problem Statement
You are tasked with building the backend for a credit-based SaaS platform with a hidden blockchain layer. The system looks and feels like a Web2 product to end users, but all credit operations are mirrored by secure blockchain token transfers in the backend. Users never interact directly with the blockchain — all complexity is abstracted away.
The project should showcase bulletproof security practices, a credit system tied to real actions, and proper wallet management in the backend.

🎯 Core Features & Requirements
1. Authentication & Authorization
Email + Password Login → Issue JWT access (15m) + refresh tokens (7d).
OAuth Login → Google or GitHub sign-in with secure token storage.
API Keys → Machine clients authenticate with scoped API keys (read-only, write-only, admin).
Roles:
Admin → Manage users, revoke tokens, issue API keys, adjust credits.
User → Perform actions consuming credits.
Service → Limited access via API keys.

2. Credit & Blockchain System
Every user starts with 50 free credits.
Credits are deducted when performing actions (see table below).
Admin can top-up credits manually or credits can be purchased via Stripe/Razorpay sandbox.
Every credit deduction is mirrored as a test token transfer from the backend master wallet → recorded securely.
Users only see Web2 functionality; blockchain handling is fully invisible to them.
Credit Costs Table:
Action
Cost (credits)
Backend Effects
Upload File
10
Deduct credits, perform blockchain tx, store file in S3/R2
Generate Report
5
Deduct credits, blockchain tx, save report metadata
Export Report (Download)
2
Deduct credits, blockchain tx, audit log entry
API Key Action (Service)
3
Deduct credits, blockchain tx, metadata fetch
List Files/Reports
0
Free, read-only


3. APIs to Implement
User APIs
Signup/Login (email-password & OAuth).
Check Balance (credits).
Upload File (10 credits).
Generate Report (5 credits).
Download Report (2 credits).
Admin APIs
Add credits to users.
Revoke tokens / API keys.
View audit logs (credit usage + blockchain txs).
Service APIs
Fetch metadata (via API key, credit deduction enforced).

4. 🔐 Security Practices (Mandatory)
Passwords: Argon2 or bcrypt with strong work factor.
JWT: Short-lived access tokens, refresh rotation, revocation list.
API Keys: Secure random, scoped, revocable.
Input Security: Strict validation (Joi/Zod/Pydantic), prevent injection attacks.
Rate Limiting: Sensitive endpoints (login, token refresh, payments).
Transport Security: Enforce HTTPS, secure cookies (HttpOnly, Secure, SameSite).
Access Control: RBAC middleware + ownership validation.
Secrets: Stored in environment variables (not in code).
Audit Logs: Every sensitive action recorded with timestamp, userId, action, cost, txHash.

5. Integrations (SDKs)
Payments: Stripe/Razorpay sandbox → top-up credits.
Cloud Storage: AWS S3 / Cloudflare R2 → upload files.
Blockchain: Testnet (Ethereum, Polygon, or Arbitrum test tokens) → credit-backed transfers.
Email (Optional): SendGrid/Mailgun → notify users on low credits.

📦 Deliverables
Backend Service: Node.js (Express/NestJS) or Python (FastAPI/Django REST).
Postman Collection / Minimal Frontend to test flows.
Demo Video: Working showcase of signup → action → credit deduction → blockchain tx.
GitHub Repo: Clean, modular codebase.
README: Setup instructions, diagrams, security overview, tradeoffs.
(Bonus) Unit/Integration Tests for credit & auth logic.

🧪 Evaluation Criteria
✅ Security-first mindset (adherence to best practices).
✅ Authentication flows (JWT, refresh, OAuth, API keys, revocation).
✅ Credit logic (deduction, enforcement, purchase).
✅ Blockchain integration (hidden but reliable credit-backed transfers).
✅ Clean code & scalability (modular, well-structured).
✅ Documentation (clear explanation of flows & design decisions).

🔄 Flow Summary (User → Blockchain)
User logs in via Web2 (JWT/OAuth/API Key).
User performs action (upload/generate/download).
Credits are deducted in DB.
Matching blockchain token transfer executed from master wallet → testnet.
Transaction hash logged in audit trail.
