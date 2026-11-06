"""
api/payments.py — Closed-Loop Compliance & Fine Gateway (Razorpay/Cashfree Simulation)
"""
from fastapi import APIRouter
from pydantic import BaseModel
import hashlib
from datetime import datetime

router = APIRouter()

class PaymentRequest(BaseModel):
    worker_id: str
    violation_id: str
    amount: float
    manager_approval: bool

@router.post("/compliance/fine/pay")
def process_fine_payment(req: PaymentRequest):
    if not req.manager_approval:
        return {"status": "FAILED", "reason": "Requires Manager Approval"}
        
    transaction_id = f"PAY-{hashlib.md5(str(datetime.now()).encode()).hexdigest()[:10].upper()}"
    return {
        "status": "SUCCESS",
        "transaction_id": transaction_id,
        "amount_paid": req.amount,
        "receipt_url": f"https://mock-gateway.com/receipt/{transaction_id}",
        "message": f"Fine for {req.worker_id} successfully processed via Cashfree simulation."
    }

@router.get("/compliance/fines/pending")
def get_pending_fines():
    return [
        {"id": "VIO-881", "worker_id": "W-027", "type": "Missing Hardhat", "amount": 50.00, "date": "2026-08-28"},
        {"id": "VIO-882", "worker_id": "W-112", "type": "Restricted Zone Entry", "amount": 150.00, "date": "2026-08-28"}
    ]

class SmsRequest(BaseModel):
    worker_id: str
    violation_type: str
    amount: float

@router.post("/compliance/fine/sms")
def send_fine_sms(req: SmsRequest):
    # Simulate sending an SMS via Twilio/SNS API
    message = f"CONSTRUCTAI ALERT: {req.worker_id} violated safety protocol ({req.violation_type}). A fine of ${req.amount} has been logged to the contractor account."
    
    return {
        "status": "SENT",
        "recipient": "+1-555-0199",
        "message_body": message
    }
