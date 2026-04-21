"use client";
import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemberData } from "@/hooks/useMemberData";
import { BanknoteArrowDown, Eye, EyeOff } from "lucide-react";
import { ASSETS } from "@/config";

export default function DashboardPage() {
  const router = useRouter();
  const { memberData, isLoading } = useMemberData();

  // 3. สร้าง state สำหรับเปิด/ปิดยอดเงิน (เริ่มต้นเป็น false)
  const [isVisible, setIsVisible] = useState(false);

  const numberFormat = new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: 2,
  });

  const displayBalance = memberData?.accumulatedShares ?? 0;
  const displayAccountName = memberData?.fullName ?? "กำลังโหลด...";

  return (
    <div className="animate-[fadeIn_0.3s] max-w-md mx-auto">
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2rem] p-6 text-white shadow-xl shadow-blue-200 mb-8 pb-10 relative overflow-hidden">
        {/* 🔥 LOGO BACKGROUND */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-10 pointer-events-none">
          <Image
            src={ASSETS.IMAGES.LOGO}
            alt="bg-logo"
            width={180}
            height={180}
            className="object-contain brightness-0 invert scale-125"
            priority
          />
        </div>

        {/* glow */}
        <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>

        {/* content */}
        <div className="flex justify-between items-start mb-6 relative z-10">
          <span className="text-blue-100 text-sm opacity-80">
            ยอดเงินสะสมทั้งหมด
          </span>
          <div className="flex justify-end">
            <button
              onClick={() => setIsVisible(!isVisible)}
              className="cursor-pointer flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-1.5 rounded-full border border-white/20 transition-all active:scale-95"
            >
              {isVisible ? (
                <>
                  <EyeOff size={16} className="text-blue-100" />
                  <span className="text-xs font-medium text-blue-50">ปิดยอด</span>
                </>
              ) : (
                <>
                  <Eye size={16} className="text-blue-100" />
                  <span className="text-xs font-medium text-blue-50">ดูยอด</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="mb-4 text-center relative z-10">
          {isLoading ? (
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-white border-t-transparent mx-auto my-4"></div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="space-y-1">
                <p className="text-blue-100 text-sm font-bold uppercase opacity-80">
                  ชื่อบัญชี {displayAccountName}
                </p>

                {/* แสดงยอดเงินหรือจุดไข่ปลา */}
                <h2 className="text-4xl font-black tracking-tight min-h-[48px] flex items-center justify-center">
                  {isVisible ? numberFormat.format(displayBalance) : "••••••"}
                </h2>

                <p className="text-blue-100 text-xs font-medium uppercase tracking-wide opacity-60">
                  THB
                </p>
              </div>

            </div>
          )}
        </div>
      </div>

      {/* 3. Compact Banking Menu */}
      <div className="flex-1 px-0.5">
        <h3 className="font-bold mb-4 flex items-center gap-2 text-slate-800">
          <span className="w-1.5 h-5 bg-blue-600 rounded-full"></span>
          เมนูแนะนำ
        </h3>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => router.push("/dashboard/upload")}
            className="cursor-pointer group bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center gap-3 active:bg-sky-50 transition-all hover:bg-gray-50"
          >
            <div className="w-10 h-10 bg-sky-50 text-sky-600 rounded-full flex items-center justify-center group-active:scale-90 transition-transform">
              <i className="fas fa-file-invoice-dollar text-lg"></i>
            </div>
            <p className="font-bold text-sm text-slate-700">แจ้งฝาก/ชำระเงิน</p>
          </button>

          <button
            onClick={() => router.push("/dashboard/loan")}
            className="cursor-pointer group bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center gap-3 active:bg-sky-50 transition-all hover:bg-gray-50"
          >
            <div className="w-10 h-10 bg-sky-50 text-sky-600 rounded-full flex items-center justify-center group-active:scale-90 transition-transform">
              <BanknoteArrowDown size={24} />
            </div>
            <p className="font-bold text-sm text-slate-700">ยื่นขอสินเชื่อ</p>
          </button>

          <button
            onClick={() => router.push("/dashboard/loans")}
            className="cursor-pointer group bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center gap-3 active:bg-violet-50 transition-all hover:bg-gray-50"
          >
            <div className="w-10 h-10 bg-violet-50 text-violet-600 rounded-full flex items-center justify-center group-active:scale-90 transition-transform">
              <i className="fas fa-search-dollar text-lg"></i>
            </div>
            <p className="font-bold text-sm text-slate-700">ตรวจสอบสินเชื่อ</p>
          </button>

          <button
            onClick={() => router.push("/dashboard/history")}
            className="cursor-pointer group bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center gap-3 active:bg-slate-50 transition-all hover:bg-gray-50"
          >
            <div className="w-10 h-10 bg-slate-50 text-slate-500 rounded-full flex items-center justify-center group-active:scale-90 transition-transform">
              <i className="fas fa-history text-lg"></i>
            </div>
            <p className="font-bold text-sm text-slate-700">ประวัติธุรกรรม</p>
          </button>
        </div>
      </div>
    </div>
  );
}