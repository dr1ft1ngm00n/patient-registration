# Secure Hospital Information System (HIS) — Patient Registration Platform

A secure, production-modeled 3-tier full-stack web application designed to manage the digital intake lifecycle of patient health information. The platform is built using a decoupled containerized architecture and heavily hardened against the OWASP Top 10 vulnerabilities, addressing critical security needs like data encryption at rest, schema-enforced validation, and session isolation.

---

## 🏗️ System Architecture

The application runs inside an isolated virtual network managed by Docker Compose, separating the system into three dedicated layers:

1. **Frontend Tier:** Semantic, lightweight vanilla HTML5, CSS3, and JavaScript, designed to avoid heavy framework dependencies and maximize control over structural request payloads.
2. **Backend Engine:** A robust Node.js and Express API gateway that handles server-side authorization middleware, structural request parsing, and error-trapping routing.
3. **Data Persistence Tier:** A high-performance PostgreSQL relational database abstracted via the Prisma Object-Relational Mapper (ORM) for strongly-typed, schema-driven query handling.

---

## 🔐 Key Security & Engineering Features

* **Strict Input Validation (OWASP A03 - Injection):** Every incoming request payload is intercept-checked via custom **Zod schemas** at the API gateway to block malformed parameters or malicious script injections.
* **Server-Side Access Boundaries (OWASP A01 - Broken Access Control):** Completely decoupled patient and administrative staff authentication paths, fully enforced at the server layer.
* **Resilient Database Error Catching:** Configured with active middleware to trap native Prisma Client Known Request Errors (such as unique email constraint code `P2002`), converting low-level system rejections into clean, readable alerts without crashing the server.
* **Data Privacy Guarding:** High-compliance architecture built with sequence-tracked relational tables to ensure data auditing trace integrity.
* **DevOps Container Orchestration:** Pre-configured with a virtualized private bridge network so backend services route through Docker DNS endpoints (`@db:5432`) instead of vulnerable local loopbacks.

---

## 🛠️ Installation & Local Setup

### Prerequisites
Make sure you have the following installed on your machine:
* [Docker Desktop](https://www.docker.com/products/docker-desktop/)
* [Node.js](https://nodejs.org/) (used locally to generate cryptographic credentials)

### Step 1: Clone the Repository
```bash
git clone [https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git](https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git)
cd YOUR_REPO_NAME
