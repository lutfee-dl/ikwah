"use client";
import React from "react";
import { User, Phone, IdCard, ShieldCheck, IdCardLanyard } from "lucide-react";
import { useMemberData } from "@/hooks/useMemberData";
import Image from "next/image";

interface InfoItemProps {
  icon: React.ReactNode;
  label: string;
  value: string | React.ReactNode;
  color: string;
  last?: boolean;
}

const formatThaiId = (id: string) => {
  if (!id || id.length !== 13) return id;
  return `${id.slice(0, 1)}-${id.slice(1, 5)}-${id.slice(5, 10)}-${id.slice(10, 12)}-${id.slice(12)}`;
};

const formatThaiPhone = (phone: string) => {
  if (!phone || phone.length !== 10) return phone;
  return `${phone.slice(0, 2)}-${phone.slice(2, 6)}-${phone.slice(6)}`;
};

function InfoItem({ icon, label, value, color, last = false }: InfoItemProps) {
  return (
    <div className={`flex items-center gap-4 p-4 ${!last && "border-b border-slate-100"}`}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center bg-${color}-100 text-${color}-600`}>
        {icon}
      </div>
      <div>
        <p className="text-[11px] text-slate-400">{label}</p>
        <p className="text-sm font-semibold text-slate-700">{value}</p>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { memberData, isLoading } = useMemberData();

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-slate-500 text-sm">กำลังโหลดข้อมูลโปรไฟล์...</p>
        </div>
      </div>
    );
  }

  const member = memberData || {
    memberNo: "IKW00000000",
    fullName: "ไม่ทราบชื่อ",
    phone: "-",
    idCard: "-",
    pictureUrl: "",
  };

  return (
    // ปรับ pt-10 เพื่อขยับขึ้นด้านบน และเอา justify-center ออก
    <div className="animate-[fadeIn_0.3s] max-w-md mx-auto pb-24">
      <div className="text-center mb-8">
        <div className="relative inline-block">
          {member.pictureUrl ? (
            <div className="w-24 h-24 rounded-full mx-auto shadow-xl border-4 border-white overflow-hidden bg-white">
              <Image
                src={member.pictureUrl}
                alt={member.fullName}
                width={96}
                height={96}
                className="w-full h-full object-cover"
                unoptimized
              />
            </div>
          ) : (
            <div className="w-24 h-24 bg-gradient-to-tr from-blue-500 to-sky-400 rounded-full mx-auto flex items-center justify-center text-white shadow-xl border-4 border-white">
              <User className="w-12 h-12" />
            </div>
          )}
          <div className="absolute bottom-1 right-1 bg-green-500 w-6 h-6 rounded-full border-4 border-white"></div>
        </div>
        <h2 className="text-xl font-bold mt-4 text-slate-800">
          คุณ {member.fullName}
        </h2>
        <div className="mt-2 flex justify-center">
          <div className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white text-xs font-semibold rounded-full shadow-sm">
            <ShieldCheck size={14} />
            ยืนยันตัวตนแล้ว
          </div>
        </div>
      </div>

      {/* Info Card */}
      <div className="w-full">
        <h3 className="text-[11px] font-bold text-slate-400 uppercase mb-3 ml-1 tracking-widest">
          ข้อมูลส่วนตัว
        </h3>

        <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
          <InfoItem
            icon={<IdCardLanyard size={18} />}
            label="รหัสสมาชิก"
            value={member.memberNo}
            color="emerald"
          />
          <InfoItem
            icon={<User size={18} />}
            label="ชื่อ-นามสกุล"
            value={member.fullName}
            color="sky"
          />
          <InfoItem
            icon={<Phone size={18} />}
            label="เบอร์โทรศัพท์"
            value={formatThaiPhone(member.phone.replace(/-/g, ""))}
            color="blue"
          />
          <InfoItem
            icon={<IdCard size={18} />}
            label="เลขบัตรประชาชน"
            value={formatThaiId(member.idCard.replace(/-/g, ""))}
            color="indigo"
          />
        </div>
      </div>

      {/* Contact Button */}
      <div className="mt-8 flex flex-col items-center justify-center">
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
          ติดต่อสอบถามเพิ่มเติม
        </span>

        <a
          href="tel:0812345678"
          className="group relative inline-flex items-center gap-2 sm:gap-3 px-6 sm:px-8 py-2.5 sm:py-3
      bg-gradient-to-r from-blue-500 via-sky-500 to-cyan-400
      text-white text-sm sm:text-base font-semibold rounded-3xl
      shadow-lg shadow-blue-400/30
      hover:shadow-xl hover:shadow-blue-500/40
      active:scale-95 transition-all duration-300"
        >
          <div className="flex items-center justify-center group-hover:scale-110 transition-transform">
            <Phone size={18} fill="currentColor" />
          </div>
          <span className="tracking-wider">081-234-5678 (พี่หนี)</span>
        </a>

        <p className="mt-3 text-[10px] text-blue-400 font-medium flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></span>
          ฝ่ายบริการสมาชิก (กองทุนอิควะฮฺ)
        </p>
      </div>
    </div>
  );
}