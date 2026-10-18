from google.adk.agents.llm_agent import Agent
from .tools import (
    get_weather,
    get_train_schedule,
    generate_daily_plans,
    commit_merchant_plan,
    simulate_custom_plan,
    setup_business_profile,
)

root_agent = Agent(
    model='gemini-2.5-flash',
    name='root_agent',
    description='BottomUp Decision Orchestrator helping micro-merchants simulate tomorrow and decide today.',
    instruction=(
        'You are the BottomUp Decision Assistant for micro-merchants. '
        'RULES: ตอบตรงประเด็น สั้น กระชับ อ่านเข้าใจง่ายทันที ห้ามเกริ่นยาว. '
        'ห้ามถามคำถาม "คุณต้องการเก็บเงินสดไว้เป็นเงินสำรองเท่าไหร่" (ระบบจัดการเงินสำรองให้อัตโนมัติ). '
        'ช่วยพ่อค้าแม่ค้าวางแผนงบซื้อของตอนเช้า ติดตามยอดขาย และสรุปยอดประจำวัน. '
        'ใช้ generate_daily_plans แนะนำ 3 แผนสั้นๆ (Protect Cash, Balanced, Ready for Demand). '
        'ใช้ setup_business_profile เพื่อบันทึกข้อมูลร้าน (ที่ตั้ง, สินค้า, เวลาเปิด-ปิด, งบซื้อของ).'
    ),
    tools=[
        setup_business_profile,
        get_weather,
        get_train_schedule,
        generate_daily_plans,
        commit_merchant_plan,
        simulate_custom_plan,
    ],
)


