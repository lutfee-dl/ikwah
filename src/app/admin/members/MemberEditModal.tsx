import { Member } from "@/types";
import { X, Save, Edit3, UserCircle, CheckCircle2, AlertCircle } from "lucide-react";
import Image from "next/image";
import { useState, useEffect } from "react";
import { IMaskInput } from "react-imask";
import { toast } from "react-hot-toast";

interface MemberEditModalProps {
  member: Member;
  onClose: (wasEdited?: boolean) => void;
}

export default function MemberEditModal({
  member,
  onClose,
}: MemberEditModalProps) {
  const [editedMember, setEditedMember] = useState<Member>(member);
  const [isSaving, setIsSaving] = useState(false);

  // Validation states
  const [idCardRaw, setIdCardRaw] = useState(member.idCard ? String(member.idCard).replace(/-/g, "") : "");
  const [phoneRaw, setPhoneRaw] = useState(member.phone ? String(member.phone).replace(/-/g, "") : "");
  const [isIdValid, setIsIdValid] = useState(true);
  const [isPhoneValid, setIsPhoneValid] = useState(true);

  // Validate on mount to set initial validity correctly
  useEffect(() => {
    if (idCardRaw) setIsIdValid(validateThaiID(idCardRaw));
    if (phoneRaw) setIsPhoneValid(validateThaiPhone(phoneRaw));
  }, [idCardRaw, phoneRaw]);

  const validateThaiID = (id: string) => {
    if (!id) return true; // allow empty if not mandatory for admin
    if (id.length !== 13 || !/^\d{13}$/.test(id)) return false;
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(id.charAt(i)) * (13 - i);
    }
    const check = (11 - (sum % 11)) % 10;
    return check === parseInt(id.charAt(12));
  };

  const validateThaiPhone = (phone: string) => {
    if (!phone) return true; // allow empty if not mandatory
    return /^0[689]\d{8}$/.test(phone);
  };

  const handleIdAccept = (value: string, mask: { unmaskedValue: string }) => {
    const rawValue = mask.unmaskedValue;
    setIdCardRaw(rawValue);
    setIsIdValid(validateThaiID(rawValue));
  };

  const handlePhoneAccept = (value: string, mask: { unmaskedValue: string }) => {
    const rawValue = mask.unmaskedValue;
    setPhoneRaw(rawValue);
    setIsPhoneValid(validateThaiPhone(rawValue));
  };

  const handleSave = async () => {
    if (!isIdValid) {
      toast.error("กรุณาตรวจสอบเลขบัตรประชาชนให้ถูกต้อง");
      return;
    }
    if (!isPhoneValid) {
      toast.error("กรุณาตรวจสอบเบอร์โทรศัพท์ให้ถูกต้อง");
      return;
    }

    setIsSaving(true);
    const toastId = toast.loading("กำลังบันทึกข้อมูล...");

    // Format ให้มีขีดแบบที่ GAS ต้องการ (17 และ 12 ตัวอักษร)
    const formattedIdCard = idCardRaw.length === 13
      ? `${idCardRaw.slice(0, 1)}-${idCardRaw.slice(1, 5)}-${idCardRaw.slice(5, 10)}-${idCardRaw.slice(10, 12)}-${idCardRaw.slice(12)}`
      : idCardRaw;

    const formattedPhone = phoneRaw.length === 10
      ? `${phoneRaw.slice(0, 2)}-${phoneRaw.slice(2, 6)}-${phoneRaw.slice(6)}`
      : phoneRaw;

    try {
      // Call internal Next.js API to trigger GAS updateAdminMember
      const response = await fetch("/api/member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateAdminMember",
          memberId: member.memberId, // ใช้ MemberId (IKW...) เป็น Key หลักในการแก้ไข
          updateData: {
            prefix: editedMember.prefix,
            fullName: editedMember.fullName,
            idCard: formattedIdCard,
            phone: formattedPhone,
            status: editedMember.status
          }
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update");
      }

      toast.success("บันทึกการแก้ไขเรียบร้อย ล่าสุดแล้ว!", { id: toastId });
      onClose(true); // Automatically close after success and signal that an edit was made

    } catch (e) {
      console.error(e);
      toast.error("เกิดข้อผิดพลาดในการบันทึกข้อมูล", { id: toastId });
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in">
        {/* Modal Header */}
        <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2 text-emerald-600 font-bold">
            <Edit3 size={20} />
            <h2>แก้ไขข้อมูลสมาชิก</h2>
          </div>
          <button
            onClick={() => onClose(false)}
            className="cursor-pointer text-slate-400 hover:bg-slate-200 p-2 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 bg-white flex flex-col gap-4">
          <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl mb-2">
            {member.pictureUrl ? (
              <Image
                src={member.pictureUrl}
                alt={member.lineName}
                width={48}
                height={48}
                className="w-12 h-12 rounded-full border-2 border-white shadow-sm object-cover"
              />
            ) : (
              <UserCircle size={48} className="text-slate-400" />
            )}
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">
                ข้อมูลบัญชี LINE
              </p>
              {(!member.lineId || member.lineId === "" || member.lineId === "null" || member.lineId === "undefined") && (
                <div className="mb-2">
                  <span className="px-2 py-1 rounded-lg text-xs font-black bg-rose-50 text-rose-500 border border-rose-100 uppercase tracking-tight flex items-center gap-1 w-fit">
                    <AlertCircle size={12} /> ยังไม่ได้ยืนยันตัวตน
                  </span>
                </div>
              )}
              <h3 className="font-bold text-slate-700">
                {member.lineName || "ไม่ระบุ"}
              </h3>
              <p className="text-xs font-black text-sky-600 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-100 inline-block mt-2">
                รหัสสมาชิก : {member.memberId || "IKW-"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1 flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase">
                คำนำหน้า
              </label>
              <select
                className="border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg px-3 py-2.5 text-sm outline-none transition-all"
                value={editedMember.prefix || ""}
                onChange={(e) =>
                  setEditedMember({ ...editedMember, prefix: e.target.value })
                }
              >
                <option value="">- เลือก -</option>
                <option value="นาย">นาย</option>
                <option value="นาง">นาง</option>
                <option value="นางสาว">นางสาว</option>
              </select>
            </div>

            <div className="col-span-2 flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase">ชื่อ - สกุล</label>
              <input
                type="text"
                className="border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg px-3 py-2.5 text-sm outline-none transition-all font-medium text-slate-800"
                value={editedMember.fullName}
                onChange={e => setEditedMember({ ...editedMember, fullName: e.target.value })}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-500 uppercase">เลขบัตรประชาชน 13 หลัก</label>
              {idCardRaw.length === 13 && isIdValid && <CheckCircle2 size={14} className="text-emerald-500" />}
              {!isIdValid && idCardRaw.length > 0 && <AlertCircle size={14} className="text-rose-500" />}
            </div>
            <IMaskInput
              mask="0-0000-00000-00-0"
              value={idCardRaw}
              unmask={true}
              onAccept={handleIdAccept}
              placeholder="1-2345-67890-12-3"
              className={`border focus:ring-1 rounded-lg px-3 py-2.5 text-sm outline-none transition-all font-mono ${!isIdValid && idCardRaw.length > 0
                ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500 bg-rose-50/30"
                : "border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                }`}
            />
            {!isIdValid && idCardRaw.length > 0 && (
              <p className="text-[10px] text-rose-500 mt-1">เลขบัตรประชาชนไม่ถูกต้อง</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-500 uppercase">เบอร์โทรศัพท์</label>
              {phoneRaw.length === 10 && isPhoneValid && <CheckCircle2 size={14} className="text-emerald-500" />}
              {!isPhoneValid && phoneRaw.length > 0 && <AlertCircle size={14} className="text-rose-500" />}
            </div>
            <IMaskInput
              mask="00-0000-0000"
              value={phoneRaw}
              unmask={true}
              onAccept={handlePhoneAccept}
              placeholder="08-1234-5678"
              className={`border focus:ring-1 rounded-lg px-3 py-2.5 text-sm outline-none transition-all font-mono ${!isPhoneValid && phoneRaw.length > 0
                ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500 bg-rose-50/30"
                : "border-slate-200 focus:border-emerald-500 focus:ring-emerald-500"
                }`}
            />
            {!isPhoneValid && phoneRaw.length > 0 && (
              <p className="text-[10px] text-rose-500 mt-1">เบอร์โทรศัพท์ต้องขึ้นต้นด้วย 06, 08, 09 และมี 10 หลัก</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase">
              สถานะบัญชี
            </label>
            <select
              className={`border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg px-3 py-2.5 text-sm outline-none transition-all font-bold ${editedMember.status === "สมาชิก"
                ? "text-emerald-600 bg-emerald-50/30"
                : "text-rose-600 bg-rose-50/30"
                }`}
              value={editedMember.status || "สมาชิก"}
              onChange={(e) =>
                setEditedMember({ ...editedMember, status: e.target.value })
              }
            >
              <option value="สมาชิก">เป็นสมาชิก</option>
              <option value="ลาออก">ลาออก</option>
            </select>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3">
          <button
            onClick={() => onClose(false)}
            className="px-6 py-2.5 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
            disabled={isSaving}
          >
            ยกเลิก
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="cursor-pointer flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-colors text-sm flex justify-center items-center gap-2 disabled:opacity-50"
          >
            {isSaving ? (
              <>กำลังบันทึก...</>
            ) : (
              <>
                <Save size={18} /> บันทึกการแก้ไข
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
