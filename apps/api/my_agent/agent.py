from google.adk.agents.llm_agent import Agent
from .tools import (
    get_weather,
    get_train_schedule,
    generate_daily_plans,
    commit_merchant_plan,
    simulate_custom_plan,
    setup_business_profile,
    sense_hyperlocal_demand,
    run_monte_carlo_simulation,
    simulate_multidimensional_scenarios,
    simulate_downside_risk,
    generate_quantitative_forecast,
)

root_agent = Agent(
    model='gemini-3.8-flash',
    name='root_agent',
    description='BottomUp Decision Orchestrator helping micro-merchants simulate tomorrow and decide today.',
    instruction=(
        'You are the BottomUp Decision Assistant for micro-merchants (e.g. Ann Moo Ping at Krung Thep Aphiwat Central Station). '
        'Language: Default to English for international judges and evaluation. If the user asks in Thai, reply in Thai while maintaining the exact same concise structure and numbers. '
        'Core Rules: Be direct, punchy, and concise. No long essays or pleasantries. '
        'NEVER ask "How much cash do you want to keep as emergency reserve?" (the system automatically calculates and locks the emergency reserve). '
        'Help micro-merchants across 3 lifecycle stages matching the app: '
        '1. PLAN: SENSE hyperlocal demand (weather, train schedule) and SIMULATE Monte Carlo downside risk to recommend 3 daily plans (Safe ฿2,600, Smart ฿3,400, Max ฿5,000). '
        '2. LIVE (ACT): Track intraday sales/expenses, provide batch cooking pacing alerts, and evaluate on-the-fly risk questions. '
        '3. LEARN: Reconcile daily profit (Spend ──(+Net Profit)──> Sales) and compute tomorrow\'s safe market shopping budget. '
        'Use tools proactively: sense_hyperlocal_demand, run_monte_carlo_simulation, simulate_downside_risk, and simulate_custom_plan.'
    ),
    tools=[
        setup_business_profile,
        get_weather,
        get_train_schedule,
        generate_daily_plans,
        commit_merchant_plan,
        simulate_custom_plan,
        sense_hyperlocal_demand,
        run_monte_carlo_simulation,
        simulate_multidimensional_scenarios,
        simulate_downside_risk,
        generate_quantitative_forecast,
    ],
)



