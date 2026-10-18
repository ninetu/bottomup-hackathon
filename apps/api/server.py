import json
import os
from typing import Any, AsyncGenerator, Dict, Optional
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

from pathlib import Path

# Load local environment
_base_dir = Path(__file__).resolve().parent
load_dotenv(_base_dir / ".env")
load_dotenv(_base_dir / "my_agent" / ".env")
load_dotenv()

# Ensure GOOGLE_API_KEY is available if GEMINI_API_KEY is set
if "GOOGLE_API_KEY" not in os.environ and "GEMINI_API_KEY" in os.environ:
    os.environ["GOOGLE_API_KEY"] = os.environ["GEMINI_API_KEY"]

from my_agent.agent import root_agent
from my_agent.agents.plan_agent import plan_agent
from my_agent.agents.live_agent import live_agent
from my_agent.agents.learn_agent import learn_agent
from my_agent.tools.simulation import generate_daily_plans, commit_merchant_plan, simulate_custom_plan
from my_agent.tools.store import store
from my_agent.tools.quantitative import (
    sense_hyperlocal_demand,
    run_monte_carlo_simulation,
    simulate_multidimensional_scenarios,
    simulate_downside_risk,
    generate_quantitative_forecast,
)

app = FastAPI(
    title="BottomUp API",
    description="Multi-agent quantitative decision intelligence platform for micro-merchants (Google ADK & Gemini 2.5 Flash).",
    version="2.0.0",
)

# Enable CORS for Mobile Web App (Firebase App Hosting, localhost, any web client)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Initialize Session Service & Runners
session_service = InMemorySessionService()

plan_runner = Runner(agent=plan_agent, session_service=session_service, app_name="bottomup_plan")
live_runner = Runner(agent=live_agent, session_service=session_service, app_name="bottomup_live")
learn_runner = Runner(agent=learn_agent, session_service=session_service, app_name="bottomup_learn")
default_runner = Runner(agent=root_agent, session_service=session_service, app_name="bottomup")

user_active_sessions: dict[str, str] = {}


class ChatRequest(BaseModel):
    user_id: str = Field(default="merchant_default", description="Merchant or user ID")
    message: str = Field(..., description="Message text or voice transcript")
    session_id: Optional[str] = Field(default=None, description="Session ID for multi-turn history")
    date: Optional[str] = Field(default="2026-10-12", description="Operating date in YYYY-MM-DD")


class ChatResponse(BaseModel):
    reply: str
    session_id: str


class CommitPlanRequest(BaseModel):
    plan_id: str = Field(default="BALANCED", description="Plan ID: PROTECT_CASH, BALANCED, READY_FOR_DEMAND, or CUSTOM")
    custom_spend: Optional[float] = Field(default=None, description="Custom spend amount if CUSTOM plan")
    custom_target_customers: Optional[int] = Field(default=None, description="Custom target customers")
    date: Optional[str] = Field(default="2026-10-12", description="Operating date")


class SaleRequest(BaseModel):
    amount: float = Field(..., description="Sale amount in Thai Baht")
    customers: int = Field(default=1, description="Customers served")
    note: Optional[str] = Field(default="", description="Transaction note")
    sender: Optional[str] = Field(default=None, description="PromptPay customer phone / identifier")
    customer_type: Optional[str] = Field(default="Regular", description="New, Regular, or VIP")
    date: Optional[str] = Field(default="2026-10-12", description="Operating date")


class ExpenseRequest(BaseModel):
    amount: float = Field(..., description="Expense amount in Thai Baht")
    note: Optional[str] = Field(default="", description="Expense note")
    date: Optional[str] = Field(default="2026-10-12", description="Operating date")


async def get_or_create_session(app_name: str, user_id: str, requested_session_id: Optional[str] = None) -> str:
    """Retrieves an existing session for the user or creates one with the given/new ID."""
    target_id = requested_session_id or user_active_sessions.get(f"{app_name}:{user_id}")

    if target_id:
        try:
            existing = await session_service.get_session(
                app_name=app_name,
                user_id=user_id,
                session_id=target_id,
            )
            if existing:
                user_active_sessions[f"{app_name}:{user_id}"] = existing.id
                return existing.id
        except Exception:
            pass

    session = await session_service.create_session(
        app_name=app_name,
        user_id=user_id,
        session_id=requested_session_id,
    )
    user_active_sessions[f"{app_name}:{user_id}"] = session.id
    return session.id


async def _run_agent_sync(runner: Runner, app_name: str, user_id: str, message: str, requested_session_id: Optional[str]) -> ChatResponse:
    session_id = await get_or_create_session(app_name, user_id, requested_session_id)
    user_msg = types.Content(role="user", parts=[types.Part.from_text(text=message)])

    parts_text = []
    try:
        async for event in runner.run_async(user_id=user_id, session_id=session_id, new_message=user_msg):
            if event.content and event.content.parts:
                for part in event.content.parts:
                    if part.text:
                        parts_text.append(part.text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return ChatResponse(reply="".join(parts_text), session_id=session_id)


async def _run_agent_stream(runner: Runner, app_name: str, user_id: str, message: str, requested_session_id: Optional[str]) -> StreamingResponse:
    session_id = await get_or_create_session(app_name, user_id, requested_session_id)
    user_msg = types.Content(role="user", parts=[types.Part.from_text(text=message)])

    async def event_generator() -> AsyncGenerator[str, None]:
        try:
            async for event in runner.run_async(user_id=user_id, session_id=session_id, new_message=user_msg):
                if event.content and event.content.parts:
                    for part in event.content.parts:
                        if part.text:
                            data = json.dumps({"delta": part.text, "session_id": session_id}, ensure_ascii=False)
                            yield f"data: {data}\n\n"
            yield f"data: {json.dumps({'done': True, 'session_id': session_id})}\n\n"
        except Exception as e:
            error_data = json.dumps({"error": str(e)})
            yield f"data: {error_data}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ---------------------------------------------------------------------------
# General & Health Endpoints
# ---------------------------------------------------------------------------


@app.get("/")
def root():
    return {
        "status": "online",
        "platform": "BottomUp Decision Intelligence",
        "lifecycle_stages": ["Plan", "Live", "Learn"],
        "api_docs": "/docs",
    }


@app.get("/health")
def health():
    return {"status": "healthy"}


# ---------------------------------------------------------------------------
# Conversational AI Endpoints (AI Actions via Gemini + ADK)
# ---------------------------------------------------------------------------


@app.post("/api/agent/plan/chat", response_model=ChatResponse)
async def plan_chat(req: ChatRequest, stream: bool = Query(default=False)):
    """Page 1: Plan Agent for morning budget, weather/train conditions, and plan selection."""
    if stream:
        return await _run_agent_stream(plan_runner, "bottomup_plan", req.user_id, req.message, req.session_id)
    return await _run_agent_sync(plan_runner, "bottomup_plan", req.user_id, req.message, req.session_id)


@app.post("/api/agent/live/chat", response_model=ChatResponse)
async def live_chat(req: ChatRequest, stream: bool = Query(default=False)):
    """Page 2: Live Agent for real-time sales logging, expense recording, and batch pacing advice."""
    if stream:
        return await _run_agent_stream(live_runner, "bottomup_live", req.user_id, req.message, req.session_id)
    return await _run_agent_sync(live_runner, "bottomup_live", req.user_id, req.message, req.session_id)


@app.post("/api/agent/learn/chat", response_model=ChatResponse)
async def learn_chat(req: ChatRequest, stream: bool = Query(default=False)):
    """Page 3: Learn Agent for end-of-day money flow debrief and tomorrow's safe spend range."""
    if stream:
        return await _run_agent_stream(learn_runner, "bottomup_learn", req.user_id, req.message, req.session_id)
    return await _run_agent_sync(learn_runner, "bottomup_learn", req.user_id, req.message, req.session_id)


@app.post("/api/chat", response_model=ChatResponse)
async def chat_default(req: ChatRequest):
    """Backwards-compatible default chat endpoint."""
    return await _run_agent_sync(default_runner, "bottomup", req.user_id, req.message, req.session_id)


@app.post("/api/chat/stream")
async def chat_default_stream(req: ChatRequest):
    """Backwards-compatible default SSE streaming endpoint."""
    return await _run_agent_stream(default_runner, "bottomup", req.user_id, req.message, req.session_id)


# ---------------------------------------------------------------------------
# Fast Direct Data Endpoints (Instant Screen Renders ~50ms, Zero LLM Latency)
# ---------------------------------------------------------------------------


@app.get("/api/merchant/{merchant_id}")
def get_merchant_profile(merchant_id: str):
    """Returns the merchant business profile and configuration."""
    return store.get_profile(merchant_id)


@app.get("/api/merchant/{merchant_id}/plan")
def get_merchant_plan_screen(merchant_id: str, date: str = Query(default="2026-10-12")):
    """Page 1 fast render: Returns shift hours, available budget, shift conditions, and 3 plan cards."""
    return generate_daily_plans(merchant_id, date)


@app.get("/api/merchant/{merchant_id}/live")
def get_merchant_live_screen(merchant_id: str, date: str = Query(default="2026-10-12")):
    """Page 2 fast render: Returns live sales, customers served, target pacing, and hourly curve."""
    return store.get_live_activity(merchant_id, date)


@app.get("/api/merchant/{merchant_id}/learn")
def get_merchant_learn_screen(merchant_id: str, date: str = Query(default="2026-10-12")):
    """Page 3 fast render: Returns money flow, net profit, and tomorrow's suggested spend range."""
    return store.get_learn_summary(merchant_id, date)


@app.post("/api/merchant/{merchant_id}/plan/commit")
def commit_plan(merchant_id: str, req: CommitPlanRequest):
    """Commits chosen plan (Safe, Smart, Max, or Custom DIY) to the merchant store."""
    return commit_merchant_plan(
        merchant_id=merchant_id,
        date=req.date or "2026-10-12",
        plan_id=req.plan_id,
        custom_spend=req.custom_spend,
        custom_target_customers=req.custom_target_customers,
    )


@app.post("/api/merchant/{merchant_id}/sale")
def record_merchant_sale(merchant_id: str, req: SaleRequest):
    """Records a live customer sale transaction into store memory."""
    return store.record_sale(
        merchant_id=merchant_id,
        date=req.date or "2026-10-12",
        amount=req.amount,
        customers=req.customers,
        note=req.note or "",
        sender=req.sender,
        customer_type=req.customer_type,
    )


@app.post("/api/merchant/{merchant_id}/expense")
def record_merchant_expense(merchant_id: str, req: ExpenseRequest):
    """Records an ingredient purchase or stall expense into store memory."""
    return store.record_expense(
        merchant_id=merchant_id,
        date=req.date or "2026-10-12",
        amount=req.amount,
        note=req.note or "",
    )


# ---------------------------------------------------------------------------
# Quantitative Intelligence Endpoints (Direct Inspection for Judges)
# ---------------------------------------------------------------------------


@app.get("/api/quantitative/demand-sensing")
def get_demand_sensing(
    location: str = Query(default="กรุงเทพอภิวัฒน์"),
    date: str = Query(default="2026-10-12"),
    open_time: str = Query(default="06:00"),
    close_time: str = Query(default="10:00"),
):
    """Direct inspection: Hyperlocal demand sensing fusing train schedule, weather rain curves, and capacity ceiling."""
    return sense_hyperlocal_demand(location=location, date=date, open_time=open_time, close_time=close_time)


@app.get("/api/quantitative/monte-carlo")
def get_monte_carlo(
    target_customers: int = Query(default=75),
    avg_order_value: float = Query(default=50.0),
    rain_risk_factor: float = Query(default=0.20),
    n_simulations: int = Query(default=1000),
):
    """Direct inspection: Stochastic Monte Carlo simulation returning P10 floor, P50 median, P90 upside, and VaR."""
    return run_monte_carlo_simulation(
        target_customers=target_customers,
        avg_order_value=avg_order_value,
        rain_risk_factor=rain_risk_factor,
        n_simulations=n_simulations,
    )


@app.get("/api/quantitative/risk")
def get_downside_risk(
    spend_budget: float = Query(default=3400.0),
    starting_cash: float = Query(default=2000.0),
    reserve_cash: float = Query(default=1000.0),
    rain_probability: float = Query(default=20.0),
):
    """Direct inspection: Capital-at-risk, food waste cost in Baht, and emergency reserve protection evaluation."""
    return simulate_downside_risk(
        spend_budget=spend_budget,
        starting_cash=starting_cash,
        reserve_cash=reserve_cash,
        rain_probability=rain_probability,
    )


@app.get("/api/quantitative/multidimensional")
def get_multidimensional(
    spend_budget: float = Query(default=3400.0),
    weather_shock: bool = Query(default=False),
    train_delay_factor: float = Query(default=0.0),
):
    """Direct inspection: Multi-dimensional scenario evaluation across weather, commuter flow, and inventory margins."""
    return simulate_multidimensional_scenarios(
        spend_budget=spend_budget,
        weather_shock=weather_shock,
        train_delay_factor=train_delay_factor,
    )


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", 8080))
    uvicorn.run("server:app", host="0.0.0.0", port=port, reload=True)
