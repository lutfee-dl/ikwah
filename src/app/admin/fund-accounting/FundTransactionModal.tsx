"use client";

import { useState } from "react";
import { X, PlusCircle, Save, AlertCircle } from "lucide-react";
import { toast } from "react-hot-toast";
import { NumericFormat } from "react-number-format";

interface FundTransactionModalProps {
  onClose: (wasAdded?: boolean) => void;
}

export default function FundTransactionModal({ onClose }: FundTransactionModalProps) {
  const [formData, setFormData] = useState({
    type: "รายรับ",
    category: "ทั่วไป",
    item: "",
    amount: 0,
    note: "",
    date: new Date().toISOString().split('T')[0],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.item) return toast.error("กรุณาระบุรายการ");
    if (formData.amount <= 0) return toast.error("กรุณาระบุจำนวนเงิน");

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "admin_add_fund_transaction",
          payload: formData,
          ADMIN_SECRET: process.env.NEXT_PUBLIC_ADMIN_SECRET
        }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success("บันทึกรายการสำเร็จ");
        onClose(true);
      } else {
        toast.error(result.msg || "เกิดข้อผิดพลาด");
      }
    } catch (error) {
      console.error(error);
      toast.error("ติดต่อเซิร์ฟเวอร์ไม่ได้");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className={`p-8 text-white relative transition-colors duration-500 ${formData.type === "รายรับ" ? "bg-blue-600" : "bg-rose-600"}`}>
          <div className="absolute top-0 right-0 p-6">
            <button
              onClick={() => onClose()}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
              <PlusCircle size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight">เพิ่มรายการ{formData.type}</h2>
              <p className="text-white/80 text-sm font-medium">บันทึกรายการบัญชีลงสมุดรายวันละเอียด</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
               <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">ประเภท</label>
               <div className="flex p-1 bg-slate-100 rounded-2xl">
                 <button
                   type="button"
                   onClick={() => setFormData({ ...formData, type: "รายรับ" })}
                   className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${formData.type === "รายรับ" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"}`}
                 >
                   รายรับ (+)
                 </button>
                 <button
                   type="button"
                   onClick={() => setFormData({ ...formData, type: "รายจ่าย" })}
                   className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${formData.type === "รายจ่าย" ? "bg-white text-rose-600 shadow-sm" : "text-slate-500"}`}
                 >
                   รายจ่าย (-)
                 </button>
               </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">วันที่</label>
              <input
                type="date"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">หมวดหมู่</label>
              <select
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                <option value="ทั่วไป">ทั่วไป</option>
                <option value="ค่าสาธารณูปโภค">ค่าสาธารณูปโภค</option>
                <option value="เงินสมทบ">เงินสมทบ</option>
                <option value="สวัสดิการ">สวัสดิการ</option>
                <option value="อื่นๆ">อื่นๆ</option>
              </select>
            </div>

            <div className="col-span-2 space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">ชื่อรายการ / รายละเอียด</label>
              <input
                type="text"
                required
                placeholder="เช่น ค่าน้ำ-ค่าไฟ ประจำเดือน..."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-slate-400 outline-none"
                value={formData.item}
                onChange={(e) => setFormData({ ...formData, item: e.target.value })}
              />
            </div>

            <div className="col-span-2 space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">จำนวนเงิน (บาท)</label>
              <div className="relative group">
                <span className={`absolute left-4 top-1/2 -translate-y-1/2 font-black text-lg ${formData.type === "รายรับ" ? "text-blue-600" : "text-rose-600"}`}>฿</span>
                <NumericFormat
                  thousandSeparator={true}
                  inputMode="decimal"
                  value={formData.amount}
                  onValueChange={(values) => setFormData({ ...formData, amount: values.floatValue || 0 })}
                  className={`w-full pl-10 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-2xl font-black text-slate-800 focus:bg-white focus:ring-4 outline-none transition-all tabular-nums ${formData.type === "รายรับ" ? "focus:border-blue-500 focus:ring-blue-50" : "focus:border-rose-500 focus:ring-rose-50"}`}
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl flex items-start gap-3 border border-slate-100">
            <AlertCircle className="text-slate-400 shrink-0 mt-0.5" size={16} />
            <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
              * รายการนี้จะถูกบันทึกลงในสมุดรายวันดิบ เพื่อใช้ในการตรวจสอบรายละเอียดรายเดือน ยอดสรุปในตารางหลักอาจจะต้องทำการกด Sync อีกครั้งเพื่อความแม่นยำ
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => onClose()}
              className="flex-1 px-6 py-4 bg-slate-100 text-slate-600 rounded-2xl text-sm font-black hover:bg-slate-200 transition-all"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`flex-[2] px-6 py-4 text-white rounded-2xl text-sm font-black shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 transition-all ${formData.type === "รายรับ" ? "bg-blue-600 hover:bg-blue-700 shadow-blue-200" : "bg-rose-600 hover:bg-rose-700 shadow-rose-200"}`}
            >
              {isSubmitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Save size={18} />}
              บันทึกรายการ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
