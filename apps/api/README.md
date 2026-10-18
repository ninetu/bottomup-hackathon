# BottomUp API Backend (Google ADK & FastAPI)

FastAPI multi-agent backend running Google ADK 2.x (`google-adk`) with Gemini models for micro-merchant decision support (Plan, Live, Learn).

## Local Development

### 1. Setup Virtual Environment & Dependencies
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Configure Environment Variables
Copy the example environment file and configure your Gemini API key:
```bash
cp .env.example .env
# Edit .env and set GOOGLE_API_KEY
```

### 3. Run the Development Server
```bash
uvicorn server:app --reload --port 8080
```
API Documentation will be available at [http://localhost:8080/docs](http://localhost:8080/docs).

### 4. Run Unit & E2E Tests
```bash
pytest tests/
```

## Cloud Run Deployment

Deploy from monorepo root:
```bash
gcloud run deploy bottomup-api \
  --source apps/api \
  --region asia-southeast1 \
  --allow-unauthenticated \
  --set-env-vars GOOGLE_API_KEY="YOUR_GEMINI_API_KEY"
```
