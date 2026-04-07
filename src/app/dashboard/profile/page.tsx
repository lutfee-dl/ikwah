"use client";
import React from "react";
import { User, Phone, IdCard, ShieldCheck } from "lucide-react";
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
    <div
      className={`flex items-center gap-4 p-4 ${!last && "border-b border-white/40"}`}
    >
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center bg-${color}-100 text-${color}-600`}
      >
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
    fullName: "ไม่ทราบชื่อ",
    phone: "-",
    idCard: "-",
    pictureUrl: "",
  };

  return (
    <div className="animate-[fadeIn_0.3s] max-w-md mx-auto pt-6">
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
             <div className="w-24 h-24 profile-gradient rounded-full mx-auto flex items-center justify-center text-white text-4xl shadow-xl border-4 border-white">
               <User className="w-12 h-12" />
             </div>
          )}
          <div className="absolute bottom-0 right-0 bg-green-500 w-6 h-6 rounded-full border-4 border-white"></div>
        </div>
        <h2 className="text-xl font-bold mt-4 text-slate-800">
          คุณ {member.fullName}
        </h2>
        <div className="mt-3 flex justify-center">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-full shadow-md">
            <ShieldCheck size={20} className="opacity-90" />
            ยืนยันแล้ว
          </div>
        </div>
      </div>
      <div className="px-5 space-y-6 max-w-md mx-auto">
        {/* PERSONAL INFO */}
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase mb-2 ml-1 tracking-wider">
            ข้อมูลส่วนตัว
          </h3>

          <div className="backdrop-blur-xl bg-white/70 border border-white/40 rounded-3xl shadow-lg overflow-hidden">
            {/* item */}
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
              last
            />
          </div>
        </div>
      </div>
      <div className="mt-5 mb-15 flex flex-col items-center justify-center animate-[fadeIn_0.5s]">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">
          ติดต่อด่วน
        </span>

        <a
          href="tel:0812345678"
          className="group relative inline-flex items-center gap-3 px-8 py-4
      bg-gradient-to-r from-blue-500 via-sky-500 to-cyan-400
      text-white text-base font-semibold rounded-3xl
      shadow-lg shadow-blue-400/30
      hover:shadow-xl hover:shadow-blue-500/40
      active:scale-95 transition-all duration-300"
        >
          <div className="flex items-center justify-center group-hover:scale-110 transition-transform">
            <Phone size={20} fill="currentColor" />
          </div>
          <span className="tracking-wider">081-234-5678 (พี่หนี)</span>
        </a>

        {/* คำอธิบายด้านล่าง */}
        <p className="mt-4 text-[11px] text-blue-400 font-medium flex items-center gap-2">
          <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
          ฝ่ายบริการสมาชิก (กองทุนอิควะฮฺ)
        </p>
      </div>
    </div>
  );
}
