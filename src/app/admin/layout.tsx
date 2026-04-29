"use client";

import { useState, ReactNode, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Toaster, toast } from "react-hot-toast";
import Cookies from "js-cookie";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import {
  LayoutDashboard, Users, CreditCard, LogOut, Menu, X,
  BanknoteArrowDown, Receipt, Wallet, Briefcase,
  TrendingUp, Settings, RefreshCw, AlertTriangle, Zap, Loader2, AlertCircle
} from "lucide-react";
import Swal from "sweetalert2";
import { ASSETS } from "@/config";
import { gasApi } from "@/services/gasApi";
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
    title: "ตรวจสอบรายการ",
    links: [
      { name: "ตรวจการฝากหุ้นสะสม", href: "/admin/deposits", icon: BanknoteArrowDown },
      { name: "ตรวจการชำระสินเชื่อ", href: "/admin/repayments", icon: Receipt },
      { name: "ตรวจคำขอกู้เงิน", href: "/admin/loans", icon: CreditCard },
    ],
  },
  {
    title: "จัดการฐานข้อมูล",
    links: [
      { name: "จัดการทะเบียนสมาชิก", href: "/admin/members", icon: Users },
      { name: "ทะเบียนสัญญาซื้อขาย", href: "/admin/contracts", icon: Briefcase },
      { name: "สรุปบัญชีหุ้นสะสม", href: "/admin/shares", icon: Wallet },
      { name: "บัญชีรับจ่ายกองทุน", href: "/admin/fund-accounting", icon: TrendingUp },
    ],
  },
  {
    title: "ธุรการ / ตั้งค่า",
    links: [
      { name: "จัดการผู้ดูแลระบบ", href: "/admin/manage-admins", icon: Settings },
      { name: "ตั้งค่าระบบและไฟล์", href: "/admin/settings", icon: RefreshCw },
    ],
  },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [adminData, setAdminData] = useState<{ displayName?: string } | null>(null);
  const [pendingCounts, setPendingCounts] = useState({ loans: 0, deposits: 0, repayments: 0 });
  const [integrityReport, setIntegrityReport] = useState<{ isHealthy: boolean; issueCount: number; issues: any[]; contractIssues?: any[] } | null>(null);
  const [lastChecked, setLastChecked] = useState<string | null>(null);
  const [isAutoSyncing, setIsAutoSyncing] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    // 🛡️ ติดตามสถานะการล็อกอินจริงจาก Firebase
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Fetch additional data from Firestore
        fetchAdminData(currentUser.uid);
      } else {
        setAdminData(null);
        // 🛡️ หากไม่ได้ล็อกอิน และไม่ได้อยู่ที่หน้า login ให้ดีดกลับไปหน้า login
        if (pathname !== "/admin/login") {
          router.push("/admin/login");
        }
      }
    });

    if (sessionStorage.getItem("login_success") === "true") {
      toast.success("เข้าสู่ระบบสำเร็จ");
      sessionStorage.removeItem("login_success");
    }

    fetchPendingCounts();

    const interval = setInterval(() => {
      fetchPendingCounts();
    }, 60000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  // 🛡️ ลบระบบ Auto-Sync อัตโนมัติออก เพื่อป้องกันการติดลูปหากสูตรในชีทไม่ตรงกัน
  // ให้แอดมินเป็นคนตัดสินใจกดซิงค์เองผ่านเมนูรายละเอียด

  const handleAutoSync = async () => {
    console.time("AutoSync-Total");
    console.log("🚀 [AutoSync] Starting auto-sync process...");
    setIsAutoSyncing(true);
    try {
      console.time("AutoSync-SyncBalances");
      console.log("⏳ [AutoSync] Calling admin_sync_all_balances...");
      await gasApi.call("admin_sync_all_balances", {});
      console.timeEnd("AutoSync-SyncBalances");

      console.time("AutoSync-RebuildSummary");
      console.log("⏳ [AutoSync] Calling admin_rebuild_summary...");
      await gasApi.call("admin_rebuild_summary", {});
      console.timeEnd("AutoSync-RebuildSummary");

      toast.success("ปรับปรุงยอดเงินอัตโนมัติสำเร็จ");
      fetchIntegrityReport();
    } catch (err) {
      console.error("❌ [AutoSync] Auto-sync failed:", err);
    } finally {
      setIsAutoSyncing(false);
      console.timeEnd("AutoSync-Total");
      console.log("✅ [AutoSync] Auto-sync process finished.");
    }
  };

  const fetchPendingCounts = async () => {
    try {
      const res = await gasApi.getPendingCounts();
      if (res.success && res.counts) {
        setPendingCounts(res.counts);
      }
    } catch (err) {
      console.error("Error fetching counts:", err);
    }
  };

  const fetchIntegrityReport = async () => {
    console.time("IntegrityCheck");
    console.log("🔍 [Integrity] Checking system health...");
    try {
      const res = await gasApi.call("admin_run_integrity_check", {});
      console.timeEnd("IntegrityCheck");
      if (res && res.success) {
        const reportData = res.data || res;
        const totalIssues = (reportData.issues?.length || 0) + (reportData.contractIssues?.length || 0);
        console.log(`📊 [Integrity] Health: ${reportData.isHealthy ? 'Healthy' : 'Issues found'}, Issues: ${totalIssues}`);
        setIntegrityReport({
          isHealthy: reportData.isHealthy,
          issueCount: totalIssues,
          issues: reportData.issues || [],
          contractIssues: reportData.contractIssues || []
        });
        setLastChecked(new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }));
      }
    } catch (err) {
      console.timeEnd("IntegrityCheck");
      console.error("❌ [Integrity] Error fetching integrity report:", err);
    }
  };

  const handleSyncAllBalances = async () => {
    const result = await Swal.fire({
      title: 'เริ่มการซิงค์ข้อมูลทั้งระบบ?',
      text: "ระบบจะคำนวณยอดเงินคงเหลือของทุกคนใหม่เพื่อให้ตรงกับรายการเดินบัญชีจริง (อาจใช้เวลา 10-20 วินาที)",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ตกลง, เริ่มซิงค์เลย',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#64748b',
    });

    if (!result.isConfirmed) return;

    setIsAutoSyncing(true);
    const tid = toast.loading("กำลังซิงค์ข้อมูลทั้งระบบ...");
    try {
      await gasApi.call("admin_sync_all_balances", {});
      await gasApi.call("admin_rebuild_summary", {});

      toast.success("ซิงค์ข้อมูลสำเร็จ! ข้อมูลทุกคนได้รับการอัปเดตแล้ว", { id: tid });
      fetchIntegrityReport();
    } catch (error) {
      toast.error("ซิงค์ข้อมูลไม่สำเร็จ", { id: tid });
    } finally {
      setIsAutoSyncing(false);
    }
  };

  const fetchAdminData = async (uid: string) => {
    try {
      const q = query(collection(db, "system_admins"), where("uid", "==", uid), limit(1));
      const snap = await getDocs(q);
      if (!snap.empty) {
        setAdminData(snap.docs[0].data());
      }
    } catch (err) {
      console.error("Error fetching admin data:", err);
    }
  };

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

  const getInitials = (name?: string | null) => {
    if (!name) return "AD";
    return name.charAt(0).toUpperCase();
  };

  return (
    <div className="font-sans bg-[#f8fafc] h-[100dvh] flex overflow-hidden text-slate-900">
      <Toaster position="top-right" toastOptions={{ className: 'text-sm font-bold' }} />

      <aside className={`
        fixed md:relative z-50 flex flex-col w-[280px] h-screen shrink-0
        bg-white border-r border-slate-200 transition-all duration-300 ease-in-out
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        shadow-2xl shadow-slate-200/50 md:shadow-none
      `}>
        <div className="h-20 flex items-center px-6 border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl p-0.5">
              <div className="w-full h-full bg-white rounded-[10px] flex items-center justify-center overflow-hidden">
                <Image
                  src={ASSETS.IMAGES.LOGO}
                  alt="logo"
                  className="w-7 h-7 object-contain"
                  width={35}
                  height={35}
                />
              </div>
            </div>

            <div className="flex flex-col justify-center">
              <span className="text-[16px] font-black tracking-tighter text-slate-800 leading-none">
                IKWAH <span className="text-blue-600">ADMIN</span>
              </span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                จัดการกองทุน
              </span>
            </div>
          </div>

          <button className="md:hidden ml-auto p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600 rounded-xl transition-colors border border-transparent hover:border-slate-100">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-4 py-8 space-y-8 overflow-y-auto no-scrollbar">
          {menuGroups.map((group) => (
            <div key={group.title} className="space-y-2">
              <h3 className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">
                {group.title}
              </h3>
              <div className="space-y-1">
                {group.links.map(({ name, href, icon: Icon }) => {
                  const isActive = pathname === href;

                  const badgeKeyMap: Record<string, keyof typeof pendingCounts> = {
                    "ตรวจการฝากหุ้นสะสม": "deposits",
                    "ตรวจการชำระสินเชื่อ": "repayments",
                    "ตรวจคำขอกู้เงิน": "loans"
                  };
                  const badgeKey = badgeKeyMap[name];
                  const badgeValue = badgeKey ? pendingCounts[badgeKey] : 0;

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

                      {badgeValue > 0 && (
                        <div className={`ml-auto flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-black rounded-full shadow-lg border-2 border-white animate-pulse transition-all duration-300 ${isActive
                          ? "bg-white text-blue-600 shadow-blue-900/20"
                          : "bg-rose-500 text-white shadow-rose-500/20"
                          }`}>
                          {badgeValue > 99 ? "99+" : badgeValue}
                        </div>
                      )}

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

        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3 px-3 py-4 mb-3 bg-white rounded-2xl border border-slate-200/50 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-linear-to-tr from-slate-100 to-slate-200 flex items-center justify-center text-slate-600 font-black text-lg border border-slate-300/30">
              {getInitials(adminData?.displayName || user?.displayName || user?.email)}
            </div>
            <div className="overflow-hidden">
              <p className="text-[13px] font-black text-slate-800 truncate leading-tight">
                {adminData?.displayName || user?.displayName || (user?.email ? user.email.split('@')[0] : "Administrator")}
              </p>
              <p className="text-xs text-slate-400 truncate mt-0.5 font-bold">
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

      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
        <header className="h-16 flex items-center justify-between px-6 sm:px-8 bg-white border-b border-slate-200 shrink-0 sticky top-0 z-40">
          <div className="flex items-center gap-4 flex-1">
            <button onClick={toggleSidebar} className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
              <Menu size={22} />
            </button>
            {lastChecked && (
              <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-[10px] font-black uppercase">Data Verified at {lastChecked}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-2xl">
              <div className="hidden sm:flex flex-col items-end">
                <p className="text-[11px] font-black text-slate-800 truncate max-w-[120px]">
                  {adminData?.displayName || user?.displayName || (user?.email ? user.email.split('@')[0] : "Admin")}
                </p>
                <p className="text-[9px] text-blue-600 font-bold uppercase tracking-tighter">Authorized Admin</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-xs shadow-md shadow-blue-600/20">
                {getInitials(adminData?.displayName || user?.displayName || user?.email)}
              </div>
            </div>

            <div className="h-8 w-[1px] bg-slate-200 mx-1 hidden lg:block"></div>
            <div className="hidden lg:flex flex-col items-end">
              <p className="text-[11px] font-black text-slate-800 uppercase tracking-widest leading-none">
                {new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase tracking-tighter">Ikuwah Admin System</p>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-6 sm:p-8 lg:p-10 bg-[#f8fafc] custom-scrollbar">
          <div className="max-w-7xl mx-auto">
            {integrityReport && !integrityReport.isHealthy && (integrityReport.issueCount > 0) && (
              <div className="mb-6 animate-in fade-in slide-in-from-top-2 duration-500">
                <div className="bg-rose-600 text-white rounded-2xl p-4 shadow-lg shadow-rose-200 flex flex-col sm:flex-row items-center justify-between gap-4 border border-rose-500">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-md shrink-0">
                      {isAutoSyncing ? <Loader2 size={20} className="text-rose-100 animate-spin" /> : <AlertCircle size={20} className="text-rose-100 animate-pulse" />}
                    </div>
                    <div>
                      <p className="text-sm font-black tracking-tight leading-none uppercase">
                        {isAutoSyncing ? "กำลังปรับปรุงข้อมูล..." : "พบความไม่สอดคล้องของข้อมูล!"}
                      </p>
                      <p className="text-[11px] text-rose-100 font-bold mt-1 opacity-90">
                        พบความผิดปกติของยอดเงินสมาชิก {integrityReport?.issueCount || 0} รายการ
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => setIsDetailsOpen(true)}
                      className="flex-1 sm:flex-none px-4 py-2 bg-white text-rose-600 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-rose-50 transition-all shadow-sm"
                    >
                      View Details
                    </button>
                    <button
                      onClick={handleSyncAllBalances}
                      disabled={isAutoSyncing}
                      className="flex-1 sm:flex-none px-4 py-2 bg-rose-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-rose-800 transition-all border border-rose-500 disabled:opacity-50"
                    >
                      {isAutoSyncing ? "Syncing..." : "Sync Now"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* --- Integrity Details Modal --- */}
            {isDetailsOpen && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                <div className="bg-white rounded-[2.5rem] w-full max-w-4xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col border border-slate-200">
                  <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div>
                      <h2 className="text-xl font-black text-slate-800 flex items-center gap-3">
                        <AlertTriangle className="text-rose-500" /> รายละเอียดความผิดปกติ
                      </h2>
                      <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-widest">Data Discrepancy Report</p>
                    </div>
                    <button onClick={() => setIsDetailsOpen(false)} className="p-3 hover:bg-slate-100 rounded-2xl transition-all">
                      <X size={20} />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-8 no-scrollbar space-y-8">
                    {/* Contract Issues */}
                    {integrityReport?.contractIssues && integrityReport.contractIssues.length > 0 && (
                      <div className="space-y-4">
                        <h3 className="text-[10px] font-black text-rose-500 uppercase tracking-[0.2em] px-2">Contract Discrepancies ({integrityReport.contractIssues.length})</h3>
                        <div className="grid gap-3">
                          {integrityReport.contractIssues.map((c: any, idx: number) => (
                            <div key={idx} className="bg-rose-50/50 border border-rose-100 p-4 rounded-2xl flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center font-black text-rose-600 text-xs">#{idx + 1}</div>
                                <div>
                                  <p className="font-black text-slate-800 text-sm">เลขที่สัญญา: {c.contractId}</p>
                                  <p className="text-[10px] text-rose-500 font-bold uppercase tracking-wider mt-0.5">ส่วนต่างจากการคำนวณ: ฿{c.diff.toLocaleString()}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Member Issues */}
                    {integrityReport?.issues && integrityReport.issues.length > 0 && (
                      <div className="space-y-4">
                        <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] px-2">Member Balance Issues ({integrityReport.issues.length})</h3>
                        <div className="overflow-hidden border border-slate-100 rounded-3xl bg-white shadow-sm">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                <th className="px-6 py-4">สมาชิก</th>
                                <th className="px-6 py-4">ยอดในชีท (B)</th>
                                <th className="px-6 py-4">ยอดคำนวณ (A)</th>
                                <th className="px-6 py-4">ยอดสูตร (C)</th>
                                <th className="px-6 py-4 text-right">ส่วนต่างสูงสุด</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {integrityReport.issues.map((issue: any, idx: number) => (
                                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="px-6 py-4">
                                    <p className="font-black text-slate-800 text-xs">{issue.fullName}</p>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">{issue.memberId}</p>
                                  </td>
                                  <td className="px-6 py-4 font-bold text-slate-600 text-xs">฿{issue.shares.stored.toLocaleString()}</td>
                                  <td className="px-6 py-4 font-bold text-blue-600 text-xs">฿{issue.shares.calculated.toLocaleString()}</td>
                                  <td className="px-6 py-4 font-bold text-emerald-600 text-xs">฿{(issue.shares.formula || 0).toLocaleString()}</td>
                                  <td className="px-6 py-4 text-right">
                                    <span className="bg-rose-100 text-rose-600 px-2 py-1 rounded-lg text-[10px] font-black">
                                      ฿{issue.shares.diff.toLocaleString()}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-8 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                    <p className="text-[10px] text-slate-400 font-bold leading-relaxed max-w-md">
                      ⚠️ ระบบใช้การเปรียบเทียบข้อมูล 3 แหล่ง (A: คำนวณดิบ, B: ยอดบันทึก, C: สูตรในชีท) หากตัวเลขไม่ตรงกัน แนะนำให้กด Sync เพื่อปรับปรุงยอด B ให้ตรงกับ A ครับ
                    </p>
                    <button
                      onClick={() => {
                        setIsDetailsOpen(false);
                        handleSyncAllBalances();
                      }}
                      className="px-8 py-4 bg-blue-600 text-white text-xs font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-200"
                    >
                      Start Repairing Data
                    </button>
                  </div>
                </div>
              </div>
            )}

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
