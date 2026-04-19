"use client";

import { useState, ReactNode, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Toaster, toast } from "react-hot-toast";
import Cookies from "js-cookie";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  LogOut,
  Menu,
  X,
  PiggyBank,
  Bell,
  Receipt,
  Wallet,
  Briefcase,
} from "lucide-react";
import "@/app/globals.css";

const sidebarLinks = [
  {
    name: "ภาพรวม",
    href: "/admin/dashboard",
    icon: LayoutDashboard,
  },
  { name: "ระบบเงินฝาก", href: "/admin/deposits", icon: PiggyBank },
  { name: "ระบบคำขอกู้เงิน", href: "/admin/loans", icon: CreditCard },
  { name: "ทะเบียนสัญญา / ซื้อขาย", href: "/admin/contracts", icon: Briefcase },
  { name: "ตรวจสอบชำระค่างวด", href: "/admin/repayments", icon: Receipt },
  { name: "ทะเบียนสมาชิก", href: "/admin/members", icon: Users },
  { name: "สรุปยอดหุ้นสัจจะ", href: "/admin/shares", icon: Wallet },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // Check if there is a 'login_success' flag in sessionStorage
    if (sessionStorage.getItem("login_success") === "true") {
      toast.success("เข้าสู่ระบบสำเร็จ");
      sessionStorage.removeItem("login_success");
    }
  }, []);

  const handleLogout = () => {
    // เคลียร์ค่า Auth ออกทั้งหมด
    try {
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

  if (pathname === "/admin/login") {
    return (
      <div className="font-sans min-h-screen">
        <Toaster
          position="top-right"
          toastOptions={{ duration: 3000, className: "text-sm font-bold" }}
        />
        {children}
      </div>
    );
  }

  return (
    <div className="font-sans bg-slate-50 h-screen overflow-hidden flex flex-col md:flex-row relative">
      <Toaster
        position="top-right"
        toastOptions={{ duration: 3000, className: "text-sm font-bold" }}
      />
      {/* Mobile Header */}
      <div className="md:hidden shrink-0 bg-slate-900 text-white p-4 flex justify-between items-center z-40 shadow-md">
        <div className="flex items-center gap-2">
          <Image
            src="/LOGO-Ikwah.png"
            alt="Ikuwah"
            width={32}
            height={32}
            className="rounded-md"
          />
          <span className="font-bold text-lg">Ikuwah Admin</span>
        </div>
        <button
          onClick={toggleSidebar}
          className="p-2 cursor-pointer hover:bg-slate-800 rounded-lg"
        >
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-20 md:hidden"
          onClick={toggleSidebar}
        ></div>
      )}

      {/* Sidebar */}
      <aside
        className={`
        fixed md:relative z-50 flex flex-col w-64 h-screen shrink-0
        bg-sky-900 border-r border-sky-950 text-sky-50
        transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        absolute md:static top-0 left-0
      `}
      >
        <div className="h-24 shrink-0 flex items-center justify-between px-6 border-b border-sky-800 bg-sky-950 relative">
          <Link
            href="/admin/dashboard"
            className="flex items-center justify-center w-full h-full pt-2"
          >
            <div className="relative w-40 h-20 flex items-center justify-center">
              <Image
                src="/LOGO-Ikwah.png"
                alt="Ikwah Logo"
                fill
                className="object-contain scale-[1.3] transform origin-center drop-shadow-lg brightness-0 invert"
                unoptimized
                priority
              />
            </div>
          </Link>
          <button
            onClick={toggleSidebar}
            className="md:hidden absolute right-4 top-1/2 -translate-y-1/2 text-sky-200 hover:bg-sky-800 p-2 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-4 shrink-0">
          <p className="text-xs font-semibold text-sky-300 uppercase tracking-wider mb-2">
            ระบบจัดการกองทุน
          </p>
        </div>

        <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto no-scrollbar">
          {sidebarLinks.map(({ name, href, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={name}
                href={href}
                className={`flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-200 group ${
                  isActive
                    ? "text-white font-semibold bg-sky-700 shadow-sm border-l-4 border-sky-300"
                    : "text-sky-100 hover:bg-sky-800 hover:text-white border-l-4 border-transparent"
                }`}
              >
                <Icon
                  className={`w-5 h-5 ${
                    isActive
                      ? "text-sky-100"
                      : "text-sky-300 group-hover:text-sky-100"
                  }`}
                />
                {name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 shrink-0 border-t border-sky-800 bg-sky-950/50 mt-auto">
          <button
            onClick={() => handleLogout()}
            className="cursor-pointer flex w-full items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-md text-sky-50 bg-sky-800 hover:bg-red-500 hover:text-white transition-colors border border-sky-700 hover:border-red-400 z-50 pointer-events-auto"
          >
            <LogOut className="w-4 h-4" />
            ออกจากระบบ
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-slate-100 relative">
        {/* Top Header */}
        <header className="h-16 shrink-0 bg-white border-b border-slate-200 hidden md:flex items-center justify-between px-4 sm:px-6 lg:px-8 z-10 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSidebar}
              className="md:hidden p-2 -ml-2 rounded-md text-slate-500 hover:bg-slate-100 transition-colors"
            >
              <Menu size={20} />
            </button>
            <h2 className="font-bold text-sky-800 md:hidden text-lg">
              ระบบจัดการกองทุนอิควะห์
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <button className="relative p-2 rounded-full text-slate-400 hover:bg-slate-100 transition-colors">
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border border-white"></span>
            </button>
            <div className="h-8 w-px bg-slate-200 mx-1"></div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-bold text-slate-700 leading-none">
                  เจ้าหน้าที่กองทุน
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  admin@ikwah.com
                </p>
              </div>
              <div className="w-9 h-9 rounded-full bg-linear-to-tr from-sky-400 to-sky-500 flex items-center justify-center text-white font-bold shadow-md shadow-sky-500/20">
                A
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 bg-[#f8fafc]">
          <div className="max-w-7xl mx-auto">{children}</div>
        </div>
      </main>
    </div>
  );
}
