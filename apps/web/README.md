# BottomUp Web (Next.js & Tailwind CSS)

Mobile-first decision intelligence interface for street food micro-merchants.

> **Simulate tomorrow. Decide what matters today.**

## Quick Start

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
# Set NEXT_PUBLIC_API_URL (defaults to http://localhost:8080)
```

### 3. Run the Development Server
```bash
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser (mobile view recommended).

## Lifecycle Stages & Features

- **/plan**: Morning inventory spend budget planning with Monte Carlo downside risk estimation.
- **/live**: Active shift dashboard with realtime PromptPay cash simulation, situation shocks (Rain Shock, Train Surge), and reactive AI Copilot cooking directives.
- **/learn**: End-of-shift money flow reconciliation, net profit tracking, and tomorrow's safe spend recommendation.
- **/timeline**: Chronological shift log and interactive conversational Copilot with rich Markdown support.

## Production Build
```bash
pnpm build
pnpm start
```

