"use client";

import { useState } from "react";
import { X, UserPlus, Save, AlertCircle } from "lucide-react";
import { toast } from "react-hot-toast";
import { gasApi } from "@/services/gasApi";
import { IMaskInput } from "react-imask";
import Swal from "sweetalert2";

interface MemberAddModalProps {
  onClose: (wasAdded?: boolean) => void;
}

export default function MemberAddModal({ onClose }: MemberAddModalProps) {
  const [formData, setFormData] = useState({
    prefix: "นาย",
    fullName: "",
    idCard: "",
    phone: "",
    status: "สมาชิก",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validation states
  const [isIdValid, setIsIdValid] = useState(true);
  const [isPhoneValid, setIsPhoneValid] = useState(true);

  const validateThaiID = (id: string) => {
    if (!id) return true; // Optional
    if (id.length !== 13 || !/^\d{13}$/.test(id)) return false;
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(id.charAt(i)) * (13 - i);
    }
    const check = (11 - (sum % 11)) % 10;
    return check === parseInt(id.charAt(12));
  };

  const validateThaiPhone = (phone: string) => {
    if (!phone) return true; // Optional
    return /^0[689]\d{8}$/.test(phone);
  };

  const handleIdAccept = (value: string, mask: { unmaskedValue: string }) => {
    const rawValue = mask.unmaskedValue;
    setFormData({ ...formData, idCard: rawValue });
    setIsIdValid(validateThaiID(rawValue));
  };

  const handlePhoneAccept = (value: string, mask: { unmaskedValue: string }) => {
    const rawValue = mask.unmaskedValue;
    setFormData({ ...formData, phone: rawValue });
    setIsPhoneValid(validateThaiPhone(rawValue));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim()) return toast.error("กรุณาระบุชื่อ-นามสกุล");
    if (!formData.prefix) return toast.error("กรุณาระบุคำนำหน้า");
    if (!formData.status) return toast.error("กรุณาระบุสถานะ");

    // Validate optional fields if they are not empty
    if (formData.idCard && !isIdValid) return toast.error("เลขบัตรประชาชนไม่ถูกต้อง");
    if (formData.phone && !isPhoneValid) return toast.error("เบอร์โทรศัพท์ไม่ถูกต้อง");

    // --- ✨ SweetAlert2 Confirmation ---
    const confirm = await Swal.fire({
      title: "ยืนยันการเพิ่มสมาชิก?",
      text: `คุณกำลังจะเพิ่มคุณ ${formData.fullName} เข้าสู่ระบบ`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "ยืนยันบันทึก",
      cancelButtonText: "ตรวจสอบอีกครั้ง",
      confirmButtonColor: "#2563eb",
      cancelButtonColor: "#64748b",
      customClass: {
        popup: "rounded-[2rem]",
        confirmButton: "rounded-xl px-6 py-2.5",
        cancelButton: "rounded-xl px-6 py-2.5"
      }
    });

    if (!confirm.isConfirmed) return;

    setIsSubmitting(true);

    // Format data for GAS (with dashes)
    const formattedIdCard = formData.idCard.length === 13
      ? `${formData.idCard.slice(0, 1)}-${formData.idCard.slice(1, 4)}-${formData.idCard.slice(4, 9)}-${formData.idCard.slice(9, 12)}-${formData.idCard.slice(12)}`
      : formData.idCard;

    const formattedPhone = formData.phone.length === 10
      ? `${formData.phone.slice(0, 2)}-${formData.phone.slice(2, 6)}-${formData.phone.slice(6)}`
      : formData.phone;

    try {
      const res = await gasApi.adminAddMember({
        ...formData,
        idCard: formattedIdCard,
        phone: formattedPhone
      }, "ADMIN");
      if (res.success) {
        toast.success(res.msg || "เพิ่มสมาชิกสำเร็จ");
        onClose(true);
      } else {
        toast.error(res.msg || "เกิดข้อผิดพลาด");
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
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-white relative">
          <div className="absolute top-0 right-0 p-6">
            <button
              onClick={() => onClose()}
              className="cursor-pointer p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
              <UserPlus size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight">เพิ่มสมาชิกใหม่</h2>
              <p className="text-blue-100 text-sm font-medium opacity-80">กรอกข้อมูลเบื้องต้นเพื่อเปิดบัญชีสมาชิก</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-1 gap-5">
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">ชื่อ-นามสกุล <span className="text-rose-500">*</span></label>
              <div className="flex gap-2">
                <select
                  value={formData.prefix}
                  onChange={(e) => setFormData({ ...formData, prefix: e.target.value })}
                  className="cursor-pointer w-24 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="นาย">นาย</option>
                  <option value="นาง">นาง</option>
                  <option value="นางสาว">น.ส.</option>
                </select>
                <input
                  type="text"
                  required
                  placeholder="ชื่อ-นามสกุล"
                  className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">เลขบัตรประชาชน (ถ้ามี)</label>
              <IMaskInput
                mask="0-0000-00000-00-0"
                unmask={true}
                value={formData.idCard}
                onAccept={handleIdAccept}
                placeholder="X-XXXX-XXXXX-XX-X"
                className={`w-full px-4 py-3 bg-slate-50 border ${!isIdValid && formData.idCard ? 'border-rose-500' : 'border-slate-200'} rounded-2xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all`}
              />
              {!isIdValid && formData.idCard && (
                <p className="text-rose-500 text-[10px] ml-2 font-bold animate-in fade-in slide-in-from-top-1">เลขบัตรประชาชนไม่ถูกต้อง</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">เบอร์โทรศัพท์ (ถ้ามี)</label>
              <IMaskInput
                mask="00-0000-0000"
                unmask={true}
                value={formData.phone}
                onAccept={handlePhoneAccept}
                placeholder="08-XXXX-XXXX"
                className={`w-full px-4 py-3 bg-slate-50 border ${!isPhoneValid && formData.phone ? 'border-rose-500' : 'border-slate-200'} rounded-2xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all`}
              />
              {!isPhoneValid && formData.phone && (
                <p className="text-rose-500 text-[10px] ml-2 font-bold animate-in fade-in slide-in-from-top-1">เบอร์โทรศัพท์ไม่ถูกต้อง</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">สถานะเริ่มต้น <span className="text-rose-500">*</span></label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="cursor-pointer w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="สมาชิก">สมาชิก</option>
                <option value="รออนุมัติ">รออนุมัติ</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => onClose()}
              className="cursor-pointer flex-1 px-6 py-3.5 bg-slate-100 text-slate-600 rounded-2xl text-sm font-black hover:bg-slate-200 transition-all"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={!!(isSubmitting || (formData.idCard && !isIdValid) || (formData.phone && !isPhoneValid))}
              className="cursor-pointer flex-[2] px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-sm font-black shadow-lg shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
            >
              {isSubmitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Save size={18} />}
              บันทึกรายชื่อ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
