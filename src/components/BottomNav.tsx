"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
// 1. นำเข้าไอคอนจาก Lucide
import { Home, Send, User } from "lucide-react";

export default function BottomNav() {
  const pathname = usePathname();

  // 2. ปรับ Array ให้เก็บ Component ของไอคอน
  const navItems = [
    { name: "หน้าหลัก", href: "/dashboard/home", icon: Home },
    { name: "แจ้งฝากเงิน/ชำระเงิน", href: "/dashboard/upload", icon: Send },
    { name: "โปรไฟล์", href: "/dashboard/profile", icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-100 flex justify-around safe-area-bottom z-50 rounded-t-[32px] shadow-[0_-8px_20px_rgba(0,0,0,0.06)]">
      {navItems.map((item) => {
        const active = pathname === item.href;
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`tab-btn py-4 px-6 flex flex-col items-center gap-1.5 transition-all duration-300 ${active ? "text-blue-600 scale-110" : "text-slate-400 hover:text-slate-500"
              }`}
          >
            {/* 3. เรียกใช้งาน Lucide Icon แบบกำหนด size และ strokeWidth */}
            <Icon size={22} strokeWidth={active ? 2.5 : 2} />
            <span className={`text-[10px] font-bold ${active ? "opacity-100" : "opacity-80"}`}>
              {item.name}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}