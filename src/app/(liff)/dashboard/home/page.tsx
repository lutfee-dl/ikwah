"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemberData } from "@/hooks/useMemberData";

export default function DashboardPage() {
  const router = useRouter();
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
      {/* 3. Compact Banking Menu */}
      <div className="flex-1 px-0.5">
        {/* <h3 className="font-bold text-slate-800 text-[14px] mb-4 px-1">เมนูแนะนำ</h3> */}
        <h3 className="font-bold mb-4 flex items-center gap-2 text-slate-800">
          <span className="w-1.5 h-5 bg-blue-600 rounded-full"></span>
          เมนูแนะนำ
        </h3>

        <div className="grid grid-cols-2 gap-3">
          {/* เมนูที่ 1: แจ้งฝากเงิน */}
          <button
            onClick={() => router.push("/dashboard/upload")}
            className="group bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center gap-3 active:bg-sky-50 transition-all"
          >
            <div className="w-10 h-10 bg-sky-50 text-sky-600 rounded-full flex items-center justify-center group-active:scale-90 transition-transform">
              <i className="fas fa-file-invoice-dollar text-lg"></i>
            </div>
            <p className="font-bold text-[13px] text-slate-700">แจ้งฝาก/ชำระเงิน</p>
          </button>

          {/* เมนูที่ 2: ยื่นขอสินเชื่อ */}
          <button
            onClick={() => router.push("/dashboard/loan")}
            className="group bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center gap-3 active:bg-sky-50 transition-all"
          >
            <div className="w-10 h-10 bg-sky-50 text-sky-600 rounded-full flex items-center justify-center group-active:scale-90 transition-transform">
              <i className="fas fa-hand-holding-heart text-lg"></i>
            </div>
            <p className="font-bold text-[13px] text-slate-700">ยื่นขอสินเชื่อ</p>
          </button>

          {/* เมนูที่ 3: ประวัติ (แบบแถบยาว Compact) */}
          <button
            onClick={() => router.push("/dashboard/history")}
            className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm col-span-2 flex items-center justify-between px-5 active:bg-sky-50 transition-all mt-1"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-slate-50 text-sky-600 rounded-lg flex items-center justify-center shadow-inner">
                <i className="fas fa-history text-xs"></i>
              </div>
              <p className="font-bold text-[13px] text-slate-800 tracking-tight">ประวัติธุรกรรม</p>
            </div>
            <div className="flex items-center gap-1 text-slate-300">
              <span className="text-[10px] font-medium text-slate-400">ดูทั้งหมด</span>
              <i className="fas fa-chevron-right text-[10px]"></i>
            </div>
          </button>
        </div>
      </div>
      {/* <h3 className="font-semibold mb-4 flex items-center gap-2 text-slate-700">
        <span className="w-1.5 h-5 bg-blue-600 rounded-full"></span>
        เมนูแนะนำ
      </h3> */}
      {/* <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => router.push("/dashboard/upload")}
          className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-start gap-3 hover:shadow-md transition-shadow text-left"
        >
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
            <i className="fas fa-file-invoice text-xl"></i>
          </div>
          <div className="text-left">
            <p className="font-semibold text-sm text-slate-800">
              แจ้งฝาก/ชำระเงิน
            </p>
            <p className="text-[10px] text-blue-500 font-medium mt-1 tracking-wide">อัปโหลดสลิป</p>
          </div>
        </button>
        <button
          onClick={() => {
            if (memberData) {
              localStorage.setItem("memberData", JSON.stringify(memberData));
            }
            router.push("/dashboard/loan");
          }}
          className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-start gap-3 hover:shadow-md transition-shadow text-left"
        >
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
            <i className="fas fa-file-invoice-dollar text-xl"></i>
          </div>
          <div>
            <p className="font-semibold text-sm text-slate-800">
              ยื่นขอสินเชื่อ
            </p>
            <p className="text-[10px] text-blue-500 font-medium mt-1 tracking-wide">
              คลิกเพื่อใช้บริการ
            </p>
          </div>
        </button>
        <button
          onClick={() => router.push("/dashboard/history")}
          className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-start gap-3 hover:shadow-md transition-shadow text-left"
        >
          <div className="w-12 h-12 bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center">
            <i className="fas fa-clock-rotate-left text-xl"></i>
          </div>
          <div className="text-left">
            <p className="font-semibold text-sm text-slate-800">
              ประวัติธุรกรรม
            </p>
            <p className="text-[10px] text-blue-500 font-medium mt-1 tracking-wide">ดูย้อนหลัง</p>
          </div>
        </button>
      </div> */}
    </div>
  );
}
