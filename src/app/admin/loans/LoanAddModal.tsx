"use client";

import { useState, useEffect } from "react";
import { X, Landmark, Save, Search, User, AlertCircle } from "lucide-react";
import { toast } from "react-hot-toast";
import Swal from "sweetalert2";
import { Member } from "@/types";
import { useAdminMembers } from "@/hooks/useAdminMembers";
import { NumericFormat } from "react-number-format";

interface LoanAddModalProps {
  onClose: (wasAdded?: boolean) => void;
}

export default function LoanAddModal({ onClose }: LoanAddModalProps) {
  const { members, loading: loadingMembers } = useAdminMembers();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const [formData, setFormData] = useState({
    loanType: "ฉุกเฉิน",
    amount: 0,
    duration: 1,
    itemName: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredMembers = members.filter(m => 
    m.fullName?.includes(searchTerm) || 
    m.memberId?.includes(searchTerm) || 
    m.phone?.includes(searchTerm)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return toast.error("กรุณาเลือกสมาชิก");
    if (formData.amount <= 0) return toast.error("กรุณาระบุยอดเงิน");

    // --- ✨ SweetAlert2 Confirmation ---
    const confirm = await Swal.fire({
      title: "ยืนยันการออกสินเชื่อ?",
      text: `คุณกำลังจะออกสินเชื่อประเภท ${formData.loanType} จำนวน ${formData.amount.toLocaleString()} บาท ให้กับคุณ ${selectedMember.fullName}`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "ยืนยันออกสินเชื่อ",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#f59e0b", // amber-500
      cancelButtonColor: "#64748b", // slate-500
    });

    if (!confirm.isConfirmed) return;

    setIsSubmitting(true);
    const toastId = toast.loading("กำลังสร้างสัญญาและบันทึกข้อมูล...");
    try {
      const res = await fetch("/api/member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "admin_add_loan",
          payload: {
            ...formData,
            lineId: selectedMember.lineId,
            fullName: selectedMember.fullName,
            memberId: selectedMember.memberId,
          },
          ADMIN_SECRET: process.env.NEXT_PUBLIC_ADMIN_SECRET
        }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success("ออกสินเชื่อสำเร็จ เรียบร้อยแล้ว ✅", { id: toastId });
        onClose(true);
      } else {
        toast.error(result.msg || "เกิดข้อผิดพลาด", { id: toastId });
      }
    } catch (error) {
      console.error(error);
      toast.error("ติดต่อเซิร์ฟเวอร์ไม่ได้", { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-8 text-white relative">
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
              <Landmark size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight">ออกสินเชื่อใหม่</h2>
              <p className="text-amber-100 text-sm font-medium opacity-80">สร้างสัญญาและเบิกจ่ายเงินกู้โดยตรง</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Member Selection */}
            <div className="md:col-span-2 space-y-2 relative">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">ค้นหาสมาชิก</label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="พิมพ์ชื่อ, รหัส หรือเบอร์โทร..."
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-amber-500 outline-none"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setIsDropdownOpen(true);
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                />
              </div>

              {/* Selection Summary */}
              {selectedMember && (
                <div className="mt-3 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-emerald-600 shadow-sm">
                    <User size={24} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">สมาชิกที่เลือก</p>
                    <p className="font-bold text-slate-800">{selectedMember.fullName}</p>
                    <p className="text-xs text-slate-500">ID: {selectedMember.memberId} | หุ้น: ฿{selectedMember.accumulatedShares?.toLocaleString()}</p>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setSelectedMember(null)}
                    className="text-[10px] font-black text-rose-500 bg-rose-50 px-3 py-1.5 rounded-xl hover:bg-rose-100 transition-colors"
                  >
                    เปลี่ยน
                  </button>
                </div>
              )}

              {/* Dropdown Results */}
              {isDropdownOpen && searchTerm && !selectedMember && (
                <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-60 overflow-y-auto no-scrollbar">
                  {loadingMembers ? (
                    <div className="p-4 text-center text-slate-400 text-sm">กำลังโหลด...</div>
                  ) : filteredMembers.length > 0 ? (
                    filteredMembers.map((m) => (
                      <button
                        key={m.lineId}
                        type="button"
                        onClick={() => {
                          setSelectedMember(m);
                          setIsDropdownOpen(false);
                          setSearchTerm("");
                        }}
                        className="w-full p-4 flex items-center gap-3 hover:bg-slate-50 text-left border-b border-slate-50 last:border-0"
                      >
                         <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-500">
                           <User size={16} />
                         </div>
                         <div>
                           <p className="font-bold text-slate-800 text-sm">{m.fullName}</p>
                           <p className="text-[10px] text-slate-400 font-medium">ID: {m.memberId} | {m.phone}</p>
                         </div>
                      </button>
                    ))
                  ) : (
                    <div className="p-4 text-center text-slate-400 text-sm">ไม่พบรายชื่อ</div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">ประเภทสินเชื่อ</label>
              <select
                value={formData.loanType}
                onChange={(e) => setFormData({ ...formData, loanType: e.target.value })}
                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-amber-500 outline-none"
              >
                <option value="ฉุกเฉิน">ฉุกเฉิน</option>
                <option value="สามัญ">สามัญ</option>
                <option value="กัรฏฮะซัน">กัรฏฮะซัน (ไร้ดอกเบี้ย)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">ชื่อรายการ / วัตถุประสงค์</label>
              <input
                type="text"
                placeholder="เช่น กู้ซื้อรถ, ซ่อมบ้าน"
                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-amber-500 outline-none"
                value={formData.itemName}
                onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">จำนวนเงิน (บาท)</label>
              <div className="relative group">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-600 font-black text-lg">฿</span>
                <NumericFormat
                  thousandSeparator={true}
                  inputMode="decimal"
                  value={formData.amount}
                  onValueChange={(values) => setFormData({ ...formData, amount: values.floatValue || 0 })}
                  className="w-full pl-10 pr-4 py-3.5 bg-amber-50/30 border border-amber-100 rounded-2xl text-xl font-black text-amber-700 focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-50 outline-none transition-all tabular-nums"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">ระยะเวลาผ่อน (เดือน)</label>
              <div className="relative group">
                <input
                  type="number"
                  min="1"
                  max="60"
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-lg font-black text-slate-700 focus:ring-2 focus:ring-amber-500 outline-none transition-all tabular-nums"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) })}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">เดือน</span>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 p-4 rounded-2xl flex items-start gap-3">
            <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={16} />
            <div className="text-[10px] text-amber-700 font-medium leading-relaxed">
              <p className="font-bold mb-1 underline">คำชี้แจงการออกสินเชื่อ:</p>
              <p>* ระบบจะสร้างสัญญาใหม่ในสถานะ "กำลังผ่อน" ทันที โดยข้ามขั้นตอนการยื่นคำขอ</p>
              <p>* ยอดเงินจะถูกนำไปเพิ่มในฐานข้อมูลหนี้สินของสมาชิก และหักลบในงบกองทุนหมู่บ้าน (ถ้าเปิดระบบเชื่อมต่อ)</p>
            </div>
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
              className="flex-[2] px-6 py-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-2xl text-sm font-black shadow-lg shadow-amber-200 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
            >
              {isSubmitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Save size={18} />}
              ยืนยันการออกสินเชื่อ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
