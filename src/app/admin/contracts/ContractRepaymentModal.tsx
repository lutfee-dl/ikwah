"use client";

import { useState } from "react";
import { X, Receipt, Save, PlusCircle, Image as ImageIcon, RefreshCw, ArrowRight } from "lucide-react";
import { toast } from "react-hot-toast";
import Swal from "sweetalert2";
import { NumericFormat } from "react-number-format";

interface ContractRepaymentModalProps {
  contract: {
    contractId: string;
    lineId: string;
    fullName: string;
    installmentPerMonth: number;
    remainingBalance: number;
    totalInstallments: number;
    totalPaidAmount: number;
  };
  onClose: (wasAdded?: boolean) => void;
}

export default function ContractRepaymentModal({ contract, onClose }: ContractRepaymentModalProps) {
  const [amountPaid, setAmountPaid] = useState<number>(contract.installmentPerMonth);
  
  // คำนวณงวดถัดไป
  const paidCount = Math.floor(contract.totalPaidAmount / contract.installmentPerMonth);
  const nextInstallment = paidCount + 1;
  const initialInstallmentNo = nextInstallment <= contract.totalInstallments ? `งวดที่ ${nextInstallment}` : "ปิดยอดสัญญา";

  const [installmentNo, setInstallmentNo] = useState(initialInstallmentNo);
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreview, setSlipPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSlipFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setSlipPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amountPaid || amountPaid <= 0) return toast.error("กรุณาระบุยอดเงินให้ถูกต้อง");

    const confirmResult = await Swal.fire({
      title: 'ยืนยันการรับชำระเงิน?',
      html: `
        <div class="text-left space-y-2 p-3 bg-slate-50 rounded-2xl border border-slate-100">
          <p class="text-sm font-bold text-slate-600">ผู้ชำระ: <span class="text-blue-600">${contract.fullName}</span></p>
          <p class="text-sm font-bold text-slate-600">รายการ: <span class="text-slate-800">${installmentNo || 'ชำระค่างวดปกติ'}</span></p>
          <p class="text-2xl font-black text-emerald-600 text-center mt-4">ยอดเงิน: ${amountPaid.toLocaleString()} ฿</p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'ยืนยันบันทึกข้อมูล',
      cancelButtonText: 'ตรวจสอบอีกครั้ง',
      customClass: { popup: "rounded-[2rem]" }
    });

    if (!confirmResult.isConfirmed) return;

    setIsSubmitting(true);
    try {
      let slipUrl = "";
      if (slipFile && slipPreview) {
        setIsUploading(true);
        const base64 = slipPreview.split(",")[1];
        const uploadRes = await fetch("/api/member", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "admin_upload_manual_slip",
            fileBase64: base64,
            mimeType: slipFile.type,
            filename: slipFile.name,
            category: "ชำระสินเชื่อ",
            contractId: contract.contractId,
            ADMIN_SECRET: process.env.NEXT_PUBLIC_ADMIN_SECRET
          }),
        });
        const uploadResult = await uploadRes.json();
        if (uploadResult.success) {
          slipUrl = uploadResult.fileUrl;
        }
        setIsUploading(false);
      }

      const res = await fetch("/api/member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "admin_add_repayment",
          contractId: contract.contractId,
          lineId: contract.lineId,
          amountPaid,
          installmentNo: installmentNo || `ชำระค่างวด`,
          slipUrl,
          status: "ยืนยันแล้ว",
          ADMIN_SECRET: process.env.NEXT_PUBLIC_ADMIN_SECRET
        }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success("บันทึกรับเงินเรียบร้อย");
        onClose(true);
      } else {
        toast.error(result.msg || "เกิดข้อผิดพลาด");
      }
    } catch {
      toast.error("เซิร์ฟเวอร์ขัดข้อง");
    } finally {
      setIsSubmitting(false);
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 text-white relative">
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
              <Receipt size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight">บันทึกรับชำระเงิน</h2>
              <p className="text-blue-100 text-sm font-medium opacity-80">รับเงินค่างวดสำหรับ {contract.contractId}</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[75vh] overflow-y-auto no-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* Display Info */}
            <div className="md:col-span-2 p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-blue-600 shadow-sm font-black">
                {contract.fullName.charAt(0)}
              </div>
              <div>
                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">ผู้ชำระเงิน</p>
                <p className="font-bold text-slate-800">{contract.fullName}</p>
                <p className="text-xs text-slate-500">ยอดคงเหลือ: ฿{contract.remainingBalance.toLocaleString()}</p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">งวดที่ / รายละเอียด</label>
              <input
                list="installment-options"
                type="text"
                placeholder="ระบุงวด..."
                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                value={installmentNo}
                onChange={(e) => setInstallmentNo(e.target.value)}
              />
              <datalist id="installment-options">
                {Array.from({ length: contract.totalInstallments }).map((_, i) => (
                  <option key={i + 1} value={`งวดที่ ${i + 1}`} />
                ))}
                <option value="ปิดยอดสัญญา" />
              </datalist>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">จำนวนเงิน (บาท)</label>
              <div className="relative group">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-600 font-black text-lg">฿</span>
                <NumericFormat
                  thousandSeparator={true}
                  inputMode="decimal"
                  value={amountPaid}
                  onValueChange={(values) => setAmountPaid(values.floatValue || 0)}
                  className="w-full pl-10 pr-4 py-3.5 bg-blue-50/30 border border-blue-100 rounded-2xl text-xl font-black text-blue-700 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all tabular-nums text-right"
                  placeholder="0.00"
                />
              </div>
              <div className="flex gap-2 mt-2">
                <button 
                  type="button" 
                  onClick={() => setAmountPaid(contract.installmentPerMonth)}
                  className="flex-1 text-[10px] font-black py-1.5 bg-slate-100 text-slate-500 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors"
                >
                  ตามงวด (฿{contract.installmentPerMonth.toLocaleString()})
                </button>
                <button 
                  type="button" 
                  onClick={() => setAmountPaid(contract.remainingBalance)}
                  className="flex-1 text-[10px] font-black py-1.5 bg-slate-100 text-slate-500 rounded-lg hover:bg-rose-50 hover:text-rose-600 transition-colors"
                >
                  ปิดยอด (฿{contract.remainingBalance.toLocaleString()})
                </button>
              </div>
            </div>

            {/* Slip Upload */}
            <div className="md:col-span-2 space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">หลักฐานการชำระเงิน (สลิป)</label>
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  id="slip-upload-modal"
                />
                <label
                  htmlFor="slip-upload-modal"
                  className={`flex flex-col items-center justify-center w-full min-h-[120px] border-2 border-dashed rounded-[2rem] cursor-pointer transition-all ${slipPreview ? 'border-blue-500 bg-blue-50/30' : 'border-slate-200 bg-slate-50 hover:border-blue-300'}`}
                >
                  {slipPreview ? (
                    <div className="relative p-2 w-full flex flex-col items-center">
                      <img src={slipPreview} alt="Preview" className="max-h-[200px] object-contain rounded-2xl shadow-lg border border-white" />
                      <button
                        onClick={(e) => { e.preventDefault(); setSlipFile(null); setSlipPreview(null); }}
                        className="absolute top-0 right-1/4 translate-x-12 -translate-y-2 bg-rose-500 text-white rounded-full p-1.5 shadow-xl hover:scale-110 transition-transform"
                      >
                        <X size={14} />
                      </button>
                      <p className="mt-2 text-[10px] font-bold text-blue-600 uppercase">คลิกเพื่อเปลี่ยนรูป</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-400 gap-2">
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                        <ImageIcon size={24} />
                      </div>
                      <p className="text-xs font-bold uppercase tracking-tighter">คลิกเพื่อแนบสลิป</p>
                    </div>
                  )}
                </label>
              </div>
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
              disabled={isSubmitting || isUploading}
              className="flex-[2] px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white rounded-2xl text-sm font-black shadow-lg shadow-blue-200 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
            >
              {isSubmitting || isUploading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <Save size={18} />
              )}
              {isUploading ? "กำลังอัปโหลด..." : "ยืนยันบันทึกข้อมูล"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
