# BottomUp

> **Simulate tomorrow. Decide what matters today.**

Multi-agent quantitative decision intelligence platform for street food micro-merchants (Google ADK & Gemini 2.5 Flash).

## Quick Start (Docker Compose)

### 1. Configure Environment Variables
Copy `.env.example` to `.env` and set your Google Gemini API key:
```bash
cp .env.example .env
# Set GOOGLE_API_KEY="your-gemini-api-key"
```

### 2. Run Locally with Docker
```bash
docker compose build
docker compose up
```

- **Web Frontend**: [http://localhost:3000](http://localhost:3000)
- **FastAPI Backend & Swagger**: [http://localhost:8080/docs](http://localhost:8080/docs)

---

## Monorepo Architecture

- **`apps/api`**: FastAPI backend running Google ADK 2.x multi-agent system (`plan_agent`, `live_agent`, `learn_agent`, `root_agent`) with Monte Carlo risk simulation and quantitative hyperlocal demand sensing. See [apps/api/README.md](apps/api/README.md).
- **`apps/web`**: Mobile-first Next.js 16 Web App with Tailwind CSS, providing Plan, Live, Learn, and Timeline stages for micro-merchants. See [apps/web/README.md](apps/web/README.md).

## Local Development (Without Docker)

### Run Backend
```bash
cd apps/api
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn server:app --reload --port 8080
```

### Run Frontend
```bash
cd apps/web
pnpm install
pnpm dev
```
