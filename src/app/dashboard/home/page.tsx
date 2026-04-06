"use client";
import Image from "next/image";
import { useMemberData } from "@/hooks/useMemberData";

export default function DashboardPage() {
  const { memberData, isLoading } = useMemberData();
  const numberFormat = new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: 2,
  });

  const displayBalance = memberData?.accumulatedShares ?? 0;
  const displayAccountName = memberData?.fullName ?? "กำลังโหลด...";

  return (
    <div className="animate-[fadeIn_0.3s] max-w-md mx-auto">
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2rem] p-6 text-white shadow-xl shadow-blue-200 mb-8  pb-10 relative overflow-hidden">
        {/* 🔥 LOGO BACKGROUND */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 opacity-10 pointer-events-none">
          <Image
            src="/LOGO.png"
            alt="bg-logo"
            width={180}
            height={180}
            className="object-contain 
                 brightness-0 invert 
                 scale-125"
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
          <i className="fas fa-qrcode text-xl opacity-50"></i>
        </div>

        <div className="mb-4 text-center relative z-10">
          {isLoading ? (
             <div className="h-8 w-8 animate-spin rounded-full border-4 border-white border-t-transparent mx-auto my-4"></div>
          ) : (
            <>
              <p className="text-blue-100 text-xs mt-1 font-light tracking-widest">
                ชื่อบัญชี {displayAccountName}
              </p>
              <h2 className="text-4xl font-bold tracking-tight">
                {numberFormat.format(displayBalance)}
              </h2>
              <p className="text-blue-100 text-xs mt-1 font-light tracking-widest">
                THB
              </p>
            </>
          )}
        </div>

        <div className="flex gap-2 mt-6 relative z-10">
          {/* <button
            onClick={depositMoney}
            className="flex-1 bg-white/20 hover:bg-white/30 py-2.5 rounded-xl text-sm backdrop-blur-sm transition font-medium text-white"
          >
            <i className="fas fa-plus-circle mr-1"></i> ฝากเงิน
          </button>
          <button
            onClick={withdrawMoney}
            className="flex-1 bg-white/20 hover:bg-white/30 py-2.5 rounded-xl text-sm backdrop-blur-sm transition font-medium text-white"
          >
            <i className="fas fa-minus-circle mr-1"></i> ถอนเงิน
          </button> */}
        </div>
      </div>
      <h3 className="font-semibold mb-4 flex items-center gap-2 text-slate-700">
        <span className="w-1.5 h-5 bg-blue-600 rounded-full"></span>
        เมนูแนะนำ
      </h3>
      <div className="grid grid-cols-2 gap-4">
        <button
          disabled
          className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-start gap-3 opacity-50 cursor-not-allowed"
        >
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
            <i className="fas fa-file-invoice-dollar text-xl"></i>
          </div>
          <div className="text-left">
            <p className="font-semibold text-sm text-slate-800">
              ทำเรื่องสินเชื่อ
            </p>
            <p className="text-[10px] text-slate-400">เร็วๆ นี้</p>
          </div>
        </button>
        <button
          disabled
          className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-start gap-3 opacity-50 cursor-not-allowed"
        >
          <div className="w-12 h-12 bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center">
            <i className="fas fa-clock-rotate-left text-xl"></i>
          </div>
          <div className="text-left">
            <p className="font-semibold text-sm text-slate-800">
              ประวัติธุรกรรม
            </p>
            <p className="text-[10px] text-slate-400">เร็วๆ นี้</p>
          </div>
        </button>
      </div>
    </div>
  );
}
