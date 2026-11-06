import React, { useState, useEffect } from 'react';
import { CreditCard, CheckCircle, Clock, ShieldAlert, MessageSquare } from 'lucide-react';
import axios from 'axios';

export default function CompliancePaymentsPage() {
  const [fines, setFines] = useState([]);
  const [paymentLog, setPaymentLog] = useState(null);
  const [smsLog, setSmsLog] = useState(null);

  useEffect(() => {
    const fetchFines = async () => {
      try {
        const res = await axios.get('http://localhost:8000/api/compliance/fines/pending');
        setFines(res.data);
      } catch (e) {
        console.warn(e);
      }
    };
    fetchFines();
  }, []);

  const payFine = async (fine) => {
    try {
      const res = await axios.post('http://localhost:8000/api/compliance/fine/pay', {
        worker_id: fine.worker_id,
        violation_id: fine.id,
        amount: fine.amount,
        manager_approval: true
      });
      setPaymentLog(res.data);
    } catch (e) {
      console.warn(e);
    }
  };

  const sendSms = async (fine) => {
    try {
      const res = await axios.post('http://localhost:8000/api/compliance/fine/sms', {
        worker_id: fine.worker_id,
        violation_type: fine.type,
        amount: fine.amount
      });
      setSmsLog(res.data);
      setTimeout(() => setSmsLog(null), 8000);
    } catch (e) {
      console.warn(e);
    }
  };
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-100 flex items-center gap-2">
          <CreditCard className="w-6 h-6 text-emerald-400" /> Closed-Loop Compliance & Payments
        </h2>
        <p className="text-sm text-slate-400">Process Razorpay/Cashfree fines for safety violations.</p>
      </div>

      {paymentLog && (
        <div className="bg-emerald-950 border border-emerald-500/50 p-4 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-emerald-400 font-bold flex items-center gap-2">
              <CheckCircle className="w-5 h-5"/> Payment Successful
            </div>
            <div className="text-emerald-200 text-sm mt-1">{paymentLog.message}</div>
          </div>
          <div className="text-right font-mono">
            <div className="text-slate-400 text-xs">Transaction ID</div>
            <div className="text-slate-200">{paymentLog.transaction_id}</div>
          </div>
        </div>
      )}
      {smsLog && (
        <div className="bg-blue-950 border border-blue-500/50 p-4 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-blue-400 font-bold flex items-center gap-2">
              <MessageSquare className="w-5 h-5"/> SMS Notification Sent
            </div>
            <div className="text-blue-200 text-sm mt-1">{smsLog.message_body}</div>
          </div>
          <div className="text-right font-mono">
            <div className="text-slate-400 text-xs">Recipient</div>
            <div className="text-slate-200">{smsLog.recipient}</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {fines.map(f => (
          <div key={f.id} className="glass-panel p-5 rounded-2xl border border-slate-700">
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="bg-red-500/20 text-red-400 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 w-fit mb-2">
                  <ShieldAlert className="w-3 h-3"/> Pending Fine
                </span>
                <h4 className="text-slate-200 font-bold">{f.type}</h4>
                <div className="text-slate-500 text-sm">Worker: {f.worker_id} | Date: {f.date}</div>
              </div>
              <div className="text-2xl font-black text-slate-100">${f.amount.toFixed(2)}</div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => payFine(f)} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-xl transition-all text-sm">
                Approve & Pay
              </button>
              <button onClick={() => sendSms(f)} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-xl transition-all flex items-center justify-center gap-2 text-sm">
                <MessageSquare className="w-4 h-4" /> Send SMS
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

