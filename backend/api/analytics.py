"""
api/analytics.py — Weekly Site Intelligence & Safety-Adjusted Productivity
"""
from fastapi import APIRouter

router = APIRouter()

@router.get("/analytics/weekly-intelligence")
def get_weekly_intelligence():
    return {
        "kpi": {
            "total_workers": 127,
            "total_tasks": 842,
            "ppe_compliance": 94,
            "safety_score": 89,
            "total_violations": 21,
            "near_misses": 17,
            "critical_events": 3,
            "fines_collected": 8500
        },
        "safety_adjusted_productivity": {
            "task_completion": 94,
            "ppe_compliance": 97,
            "safety_score": 92,
            "risk_level": "Low",
            "safe_productivity": 94
        },
        "ai_summary": "PPE compliance improved by 4% this week. However, crane-zone near misses increased. Recommended action: Review crane exclusion controls and physical barricades."
    }
