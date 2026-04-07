"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMemberData } from "@/hooks/useMemberData";
import { getLiffIdToken } from "@/services/liff";
import { ArrowLeft, Send, AlertCircle, CheckCircle } from "lucide-react";

export default function LoanRequestPage() {
  const router = useRouter();
  const { memberData, isLoading } = useMemberData();
  
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [duration, setDuration] = useState("12"); // เดือน
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseInt(amount) <= 0) {
      setErrorMsg("กรุณาระบุจำนวนเงินให้ถูกต้อง");
      return;
    }
    if (!reason) {
      setErrorMsg("กรุณาระบุวัตถุประสงค์การกู้ยืม");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const token = await getLiffIdToken();
      if (!token) {
        setErrorMsg("เซสชันหมดอายุ กรุณาเข้าแอปใหม่อีกครั้ง");
        setIsSubmitting(false);
        return;
      }

      const payload = {
        action: "submit_loan",
        idToken: token,
        memberNo: memberData?.memberNo,
        fullName: memberData?.fullName,
        phone: memberData?.phone,
        amount: parseInt(amount),
        duration: parseInt(duration),
        reason: reason,
      };

      const res = await fetch("/api/member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      const data = await res.json();
      
      if (data.success) {
        setSuccessMsg("ส่งคำขอสำเร็จ");
        setTimeout(() => {
          router.push("/dashboard/home");
        }, 3000);
      } else {
        setErrorMsg(data.msg || "เกิดข้อผิดพลาดในการส่งข้อมูล");
      }
    } catch {
      setErrorMsg("ไม่สามารถติดต่อเซิร์ฟเวอร์ได้");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  if (successMsg) {
    return (
      <div className="flex h-[80vh] items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl text-center max-w-sm w-full animate-[fadeIn_0.5s]">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">ส่งคำขอสำเร็จ</h2>
          <p className="text-gray-600 text-sm mb-6 leading-relaxed">
            ระบบได้ส่งข้อมูลการขอสินเชื่อเรียบร้อยแล้ว<br/>
            กรุณารอดำเนินการตรวจสอบและติดต่อไปยังเบอร์ <b>{memberData?.phone}</b>
          </p>
          <p className="text-[11px] text-gray-400">กำลังพาคุณกลับหน้าหลัก...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto animate-[fadeIn_0.3s] pb-8 pt-2">
      <div className="flex items-center gap-4 mb-6 px-1">
        <button 
          onClick={() => router.back()}
          className="w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center text-slate-600 hover:bg-slate-50 transition"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold text-slate-800">ยื่นขอสินเชื่อ</h1>
      </div>

      <div className="bg-white rounded-4xl p-6 shadow-sm border border-slate-100">
        <div className="mb-6 p-4 bg-blue-50 rounded-2xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">ข้อมูลผู้ยื่นคำร้อง</p>
            <p>ชื่อ: {memberData?.fullName}</p>
            <p>เบอร์ติดต่อ: {memberData?.phone}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              จำนวนเงินที่ต้องการกู้ (บาท)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="ระบุจำนวนเงิน"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              ระยะเวลาผ่อนชำระ
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none transition"
            >
              <option value="6">6 เดือน</option>
              <option value="12">12 เดือน</option>
              <option value="24">24 เดือน</option>
              <option value="36">36 เดือน</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              วัตถุประสงค์
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="ระบุเหตุผลการขอกู้เงิน"
              rows={3}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition resize-none"
              required
            ></textarea>
          </div>

          {errorMsg && (
            <p className="text-red-500 text-sm text-center font-medium bg-red-50 py-2 rounded-xl">
              {errorMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-2xl py-3.5 font-semibold shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 transition disabled:opacity-70 disabled:cursor-not-allowed mt-4"
          >
            {isSubmitting ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
            ) : (
              <>
                <Send size={18} />
                ส่งคำขอสินเชื่อ
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
