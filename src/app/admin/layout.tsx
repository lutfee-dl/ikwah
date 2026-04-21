"use client";

import { useState, ReactNode, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Toaster, toast } from "react-hot-toast";
import Cookies from "js-cookie";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
  LayoutDashboard, Users, CreditCard, LogOut, Menu, X,
  PiggyBank, Bell, Receipt, Wallet, Briefcase,
  ChevronRight, Search, UserCircle, ShieldCheck, Settings
} from "lucide-react";
import { ASSETS } from "@/config";
import "@/app/globals.css";

// 1. จัดโครงสร้างเมนูใหม่แบ่งเป็นหมวดหมู่ตาม Tone ที่ต้องการ
const menuGroups = [
  {
    title: "สรุปภาพรวม",
    links: [
      { name: "หน้าแรกแดชบอร์ด", href: "/admin/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    title: "งานบริหารการเงิน",
    links: [
      { name: "ระบบบัญชีเงินฝาก", href: "/admin/deposits", icon: PiggyBank },
      { name: "พิจารณาสินเชื่อ", href: "/admin/loans", icon: CreditCard },
      { name: "บันทึกการชำระงวด", href: "/admin/repayments", icon: Receipt },
    ],
  },
  {
    title: "ฐานข้อมูลกลาง",
    links: [
      { name: "จัดการทะเบียนสมาชิก", href: "/admin/members", icon: Users },
      { name: "ทะเบียนสัญญาซื้อขาย", href: "/admin/contracts", icon: Briefcase },
      { name: "สรุปบัญชีหุ้นสัจจะ", href: "/admin/shares", icon: Wallet },
    ],
  },
  {
    title: "ธุรการ / ตั้งค่า",
    links: [
      { name: "จัดการผู้ดูแลระบบ", href: "/admin/manage-admins", icon: Settings },
    ],
  },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    // 🛡️ ติดตามสถานะการล็อกอินจริงจาก Firebase
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    if (sessionStorage.getItem("login_success") === "true") {
      toast.success("เข้าสู่ระบบสำเร็จ");
      sessionStorage.removeItem("login_success");
    }

    return () => unsubscribe();
  }, []);

  const handleLogout = () => {
    try {
      auth.signOut();
      localStorage.removeItem("adminToken");
      sessionStorage.removeItem("adminToken");
      Cookies.remove("adminToken");
    } catch {
      // ignore
    }

    setTimeout(() => {
      window.location.href = "/admin/login";
      toast.success("ออกจากระบบสำเร็จ");
    }, 1000);
  };

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  if (pathname === "/admin/login") return <div className="font-sans min-h-screen bg-slate-50">{children}</div>;

  // Helper to get initials
  const getInitials = (name?: string | null) => {
    if (!name) return "AD";
    return name.charAt(0).toUpperCase();
  };

  return (
    <div className="font-sans bg-[#f8fafc] h-screen flex overflow-hidden text-slate-900 border-t-4 border-blue-600">
      <Toaster position="top-right" toastOptions={{ className: 'text-sm font-bold' }} />

      {/* --- SIDEBAR --- */}
      <aside className={`
        fixed md:relative z-50 flex flex-col w-[280px] h-screen shrink-0
        bg-white border-r border-slate-200 transition-all duration-300 ease-in-out
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        shadow-2xl shadow-slate-200/50 md:shadow-none
      `}>
        {/* Logo Section */}
        <div className="h-20 flex items-center px-8 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-linear-to-tr from-blue-600 to-sky-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <ShieldCheck className="text-white" size={20} />
            </div>
            <span className="text-lg font-black tracking-tight text-slate-800">
              IKWAH <span className="font-medium text-blue-600">ADMIN</span>
            </span>
          </div>
          <button onClick={toggleSidebar} className="md:hidden ml-auto p-2 text-slate-400 hover:bg-slate-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-8 space-y-8 overflow-y-auto no-scrollbar">
          {menuGroups.map((group) => (
            <div key={group.title} className="space-y-2">
              <h3 className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">
                {group.title}
              </h3>
              <div className="space-y-1">
                {group.links.map(({ name, href, icon: Icon }) => {
                  const isActive = pathname === href;
                  return (
                    <Link
                      key={name}
                      href={href}
                      onClick={() => setIsSidebarOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative ${isActive
                        ? "bg-blue-600 text-white shadow-xl shadow-blue-600/20 font-bold"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 font-medium"
                        }`}
                    >
                      <Icon size={19} className={isActive ? "text-white" : "text-slate-400 group-hover:text-blue-500 transition-colors"} />
                      <span className="text-[13px]">{name}</span>
                      {isActive && (
                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Profile Section */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3 px-3 py-4 mb-3 bg-white rounded-2xl border border-slate-200/50 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-linear-to-tr from-slate-100 to-slate-200 flex items-center justify-center text-slate-600 font-black text-lg border border-slate-300/30">
              {getInitials(user?.email || "AD")}
            </div>
            <div className="overflow-hidden">
              <p className="text-[13px] font-black text-slate-800 truncate leading-tight">
                {user?.displayName || (user?.email ? user.email.split('@')[0] : "Administrator")}
              </p>
              <p className="text-[10px] text-slate-400 truncate mt-0.5 font-bold uppercase tracking-tighter">
                {user?.email || "Checking auth..."}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="cursor-pointer w-full flex items-center justify-center gap-2 py-3 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-all border border-slate-200 hover:border-rose-100 text-[13px] font-black shadow-sm group"
          >
            <LogOut size={16} className="group-hover:-translate-x-0.5 transition-transform" />
            ออกจากระบบ
          </button>
        </div>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
        {/* Simple Header */}
        <header className="h-16 flex items-center justify-between px-6 sm:px-8 bg-white border-b border-slate-200 shrink-0 sticky top-0 z-40">
          <div className="flex items-center gap-4 flex-1">
            <button onClick={toggleSidebar} className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
              <Menu size={22} />
            </button>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <button className="p-2.5 text-slate-400 hover:text-blue-600 relative transition-all bg-slate-50 hover:bg-blue-50 rounded-xl border border-transparent hover:border-blue-100">
              <Bell size={18} />
              <span className="absolute top-2 right-2.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white shadow-sm"></span>
            </button>
            <div className="h-8 w-[1px] bg-slate-200 mx-1"></div>
            <div className="hidden lg:flex flex-col items-end">
              <p className="text-[11px] font-black text-slate-800 uppercase tracking-widest leading-none">
                {new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase tracking-tighter">Ikuwah Admin System</p>
            </div>
          </div>
        </header>

        {/* Page Content Area */}
        <div className="flex-1 overflow-auto p-6 sm:p-8 lg:p-10 bg-[#f8fafc] custom-scrollbar">
          <div className="max-w-7xl mx-auto">
            {/* Content Slot */}
            <div className="animate-in fade-in slide-in-from-top-1 duration-700 ease-out">
              {children}
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-40 md:hidden animate-in fade-in duration-300"
        />
      )}
    </div>
  );
}
