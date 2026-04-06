"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function BottomNav() {
  const pathname = usePathname();

  const isActive = (path: string) =>
    pathname === path ? "text-blue-600 active-tab" : "text-slate-300";

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-slate-100 flex justify-around safe-area-bottom z-50">
      <Link
        href="/dashboard/home"
        className={`tab-btn py-3 px-6 flex flex-col items-center gap-1 transition-all ${isActive(
          "/dashboard/home"
        )}`}
      >
        <i className="fas fa-house-chimney text-lg"></i>
        <span className="text-[10px] font-semibold">หน้าหลัก</span>
      </Link>
      <button
        disabled
        className="tab-btn py-3 px-6 flex flex-col items-center gap-1 text-slate-200 transition-all opacity-50 cursor-not-allowed"
      >
        <i className="fas fa-file-signature text-lg"></i>
        <span className="text-[10px] font-semibold">ขอกู้</span>
      </button>
      <button
        disabled
        className="tab-btn py-3 px-6 flex flex-col items-center gap-1 text-slate-200 transition-all opacity-50 cursor-not-allowed"
      >
        <i className="fas fa-chart-line text-lg"></i>
        <span className="text-[10px] font-semibold">ประวัติ</span>
      </button>
      <Link
        href="/dashboard/profile"
        className={`tab-btn py-3 px-6 flex flex-col items-center gap-1 transition-all ${isActive(
          "/dashboard/profile"
        )}`}
      >
        <i className="fas fa-user-circle text-lg"></i>
        <span className="text-[10px] font-semibold">ฉัน</span>
      </Link>
    </nav>
  );
}
