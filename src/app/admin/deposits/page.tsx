"use client";

import { RotateCw, Search, Eye, X, CheckCircle2, XCircle, ArrowUpDown, ArrowUp, ArrowDown, Loader2, FileClock, AlertCircle, ChevronLeft, ChevronRight, ExternalLink, Save, UserCircle, RefreshCw, Zap } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import { NumericFormat } from "react-number-format";
import Swal from "sweetalert2";
import { toast } from "react-hot-toast";
import { formatDateTime } from "@/lib/utils";
import { TableSkeleton } from "@/components/ui/TableSkeleton";


import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { Member } from "@/types";
import { useAdminMembers } from "@/hooks/useAdminMembers";

type Deposit = {
  id: string;
  memberId?: string;
  lineId?: string;
  name: string;
  lineName?: string;
  pictureUrl?: string;
  amount: number;
  date: string;
  status: "pending" | "approved" | "rejected";
  rawStatus?: string;
  slipUrl: string;
  note?: string;
  aiData?: string;
  actualTime?: string;
  approvedBy?: string;
};

type FilterStatus = "pending" | "approved" | "rejected" | "all";
type SortColumn = "id" | "name" | "amount" | "date" | "status";
type SortDirection = "asc" | "desc";

const SortIcon = ({ column, sortConfig }: { column: SortColumn, sortConfig: { column: SortColumn, direction: SortDirection } }) => {
  if (sortConfig.column !== column) return <ArrowUpDown size={14} className="inline ml-1 text-slate-300" />;
  return sortConfig.direction === "asc" ?
    <ArrowUp size={14} className="inline ml-1 text-sky-500" /> :
    <ArrowDown size={14} className="inline ml-1 text-sky-500" />;
};

const API_URL = "/api/member";

export default function DepositsPage() {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState<{ column: SortColumn, direction: SortDirection }>({
    column: "date",
    direction: "asc"
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [selectedDeposit, setSelectedDeposit] = useState<Deposit | null>(null);
  const [editAmount, setEditAmount] = useState<number>(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [adminName, setAdminName] = useState<string>("ADMIN");

  // Member lookup
  const { members } = useAdminMembers();
  const membersByLineMap = useMemo(() => {
    const map = new Map<string, Member>();
    members.forEach(m => {
      if (m.lineId) map.set(m.lineId, m);
    });
    return map;
  }, [members]);

  // Slip Metadata States
  const [slipTime, setSlipTime] = useState("");
  const [slipSender, setSlipSender] = useState("");
  const [slipReceiver, setSlipReceiver] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const adminDoc = await getDoc(doc(db, "system_admins", user.uid));
          if (adminDoc.exists() && adminDoc.data().displayName) {
            setAdminName(adminDoc.data().displayName);
          } else {
            setAdminName(user.displayName || user.email?.split('@')[0] || "ADMIN");
          }
        } catch (e) {
          setAdminName(user.displayName || user.email?.split('@')[0] || "ADMIN");
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const getDriveImageUrl = (url: string) => {
    if (!url || typeof url !== 'string') return "";
    if (url.includes("drive.google.com") || url.includes("googleusercontent.com")) {
      const matches = url.match(/[-\w]{25,}/g);
      const fileId = matches ? matches.find(m =>
        !['drive', 'google', 'file', 'view', 'drivesdk', 'usp', 'shared'].includes(m.toLowerCase())
      ) : null;

      if (fileId) {
        return `https://docs.google.com/thumbnail?id=${fileId}&sz=w1200`;
      }
    }
    return url;
  };

  const filteredAndSortedDeposits = useMemo(() => {
    if (!Array.isArray(deposits)) return [];

    const result = deposits.filter((d) => {
      const matchStatus = filterStatus === "all" || d.status === filterStatus;
      const member = membersByLineMap.get(d.lineId || "");
      const lineName = member?.lineName || d.lineName || "";
      const matchSearch =
        (d.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (d.id || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (d.memberId || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (member?.memberId || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        lineName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchStatus && matchSearch;
    });

    result.sort((a, b) => {
      let valA: string | number = a[sortConfig.column];
      let valB: string | number = b[sortConfig.column];

      if (sortConfig.column === "date") {
        valA = new Date(a.date).getTime();
        valB = new Date(b.date).getTime();
      }

      if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
      if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [deposits, filterStatus, searchQuery, sortConfig, membersByLineMap]);

  const paginatedDeposits = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedDeposits.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedDeposits, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredAndSortedDeposits.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, searchQuery, itemsPerPage]);

  const handleSort = (column: SortColumn) => {
    setSortConfig((prev) => ({
      column,
      direction:
        prev.column === column && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const fetchDeposits = async () => {
    setLoading(true);
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "admin_get_deposits",
          ADMIN_SECRET: process.env.NEXT_PUBLIC_ADMIN_SECRET
        })
      });
      const data = await res.json();
      if (data.success) {
        setDeposits(data.data);
      }
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
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

    setIsSyncing(true);
    const tid = "sync-balances";
    toast.loading("กำลังซิงค์ข้อมูลทั้งระบบ...", { id: tid });
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "admin_sync_all_balances",
          ADMIN_SECRET: process.env.NEXT_PUBLIC_ADMIN_SECRET
        })
      });

      await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "admin_rebuild_summary",
          ADMIN_SECRET: process.env.NEXT_PUBLIC_ADMIN_SECRET
        })
      });

      const resData = await res.json();
      if (resData.success) {
        toast.success("ซิงค์ข้อมูลสำเร็จ! ข้อมูลทุกคนได้รับการอัปเดตแล้ว", { id: tid });
        await fetchDeposits();
      } else {
        toast.error("เกิดข้อผิดพลาด: " + resData.msg, { id: tid });
      }
    } catch (error) {
      toast.error("ติดต่อเซิร์ฟเวอร์ไม่ได้", { id: tid });
    } finally {
      setIsSyncing(false);
    }
  };


  useEffect(() => {
    fetchDeposits();
  }, []);

  const handleApprove = async (id: string) => {
    const result = await Swal.fire({
      title: 'ยืนยันการอนุมัติ?',
      text: `คุณต้องการอนุมัติยอดฝากจำนวน ${editAmount.toLocaleString()} บาท นี้ใช่หรือไม่?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'อนุมัติ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#10b981',
    });

    if (!result.isConfirmed) return;

    const toastId = "deposit-action";
    toast.loading("กำลังดำเนินการ...", { id: toastId });
    setIsUpdating(true);
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "admin_update_deposit",
          ADMIN_SECRET: process.env.NEXT_PUBLIC_ADMIN_SECRET,
          status: "approved",
          depositId: id,
          amount: editAmount,
          adminName: adminName,
          actualTime: slipTime
        })
      });

      const resData = await res.json();
      if (resData.success) {
        toast.success("อนุมัติสำเร็จ และแจ้งสมาชิกแล้ว ✅", { id: toastId });
        fetchDeposits();
        setIsModalOpen(false);
      } else {
        Swal.fire('เกิดข้อผิดพลาด', resData.msg || "ไม่สามารถอนุมัติได้", 'error');
        toast.dismiss(toastId);
      }
    } catch (error) {
      Swal.fire('ข้อผิดพลาด', 'ติดต่อเซิร์ฟเวอร์ไม่ได้', 'error');
      toast.dismiss(toastId);
      console.error(error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleReject = async (id: string) => {
    const { value: note } = await Swal.fire({
      title: "ระบุเหตุผลการปฏิเสธ",
      input: "textarea",
      inputPlaceholder: "เช่น สลิปซ้ำ, ยอดเงินไม่ตรง, รูปภาพไม่ชัด...",
      showCancelButton: true,
      confirmButtonText: "ยืนยันปฏิเสธ",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#ef4444",
      inputValidator: (value) => {
        if (!value) {
          return "กรุณาระบุเหตุผลการปฏิเสธด้วยค่ะ";
        }
        return null;
      }
    });

    if (!note) return;

    const toastId = "deposit-action";
    toast.loading("กำลังดำเนินการ...", { id: toastId });
    setIsUpdating(true);
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "admin_update_deposit",
          ADMIN_SECRET: process.env.NEXT_PUBLIC_ADMIN_SECRET,
          status: "rejected",
          depositId: id,
          note: note,
          adminName: adminName // ส่งชื่อแอดมินไปบันทึก Log
        })
      });

      const resData = await res.json();
      if (resData.success) {
        toast.success("ปฏิเสธยอดฝากเรียบร้อยแล้ว", { id: toastId });
        fetchDeposits();
        setIsModalOpen(false);
      } else {
        Swal.fire('เกิดข้อผิดพลาด', resData.msg || "ไม่สามารถปฏิเสธได้", 'error');
        toast.dismiss(toastId);
      }
    } catch (error) {
      Swal.fire('ข้อผิดพลาด', 'ติดต่อเซิร์ฟเวอร์ไม่ได้', 'error');
      toast.dismiss(toastId);
      console.error(error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleReopen = async (id: string) => {
    const result = await Swal.fire({
      title: 'เปลี่ยนสถานะใหม่?',
      text: 'ระบบจะเปลี่ยนสถานะรายการนี้กลับเป็น "รอตรวจสอบ" เพื่อให้ดำเนินการอีกครั้ง',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ยืนยัน',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#f59e0b',
    });
    if (!result.isConfirmed) return;
    const toastId = toast.loading('กำลังเปลี่ยนสถานะ...');
    setIsUpdating(true);
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'admin_update_deposit',
          ADMIN_SECRET: process.env.NEXT_PUBLIC_ADMIN_SECRET,
          status: 'pending',
          depositId: id,
          adminName: adminName
        })
      });
      const resData = await res.json();
      if (resData.success) {
        toast.success('เปลี่ยนสถานะเรียบร้อย', { id: toastId });
        fetchDeposits();
        setIsModalOpen(false);
      } else {
        toast.error(resData.msg || 'เกิดข้อผิดพลาด', { id: toastId });
      }
    } catch (err) {
      toast.error('ติดต่อเซิร์ฟเวอร์ไม่ได้', { id: toastId });
    } finally {
      setIsUpdating(false);
    }
  };

  const openDetails = (deposit: Deposit) => {
    setSelectedDeposit(deposit);
    setEditAmount(deposit.amount);

    // พยายามดึงข้อมูลสลิป
    setSlipTime(deposit.actualTime || "");
    setSlipSender("");
    setSlipReceiver("");

    if (deposit.aiData) {
      try {
        const ai = JSON.parse(deposit.aiData);
        // ดึงจาก QR Data (แม่นยำกว่า)
        if (ai.qr_data) {
          if (ai.qr_data.transTime) setSlipTime(ai.qr_data.transTime);
          if (ai.qr_data.sender && ai.qr_data.sender.name) setSlipSender(ai.qr_data.sender.name);
          if (ai.qr_data.receiver && ai.qr_data.receiver.name) setSlipReceiver(ai.qr_data.receiver.name);
        }
        // ดึงจาก OCR Data (ถ้าไม่มี QR)
        else if (ai.ocr_data) {
          if (ai.ocr_data.time) setSlipTime(ai.ocr_data.time);
          if (ai.ocr_data.sender) setSlipSender(ai.ocr_data.sender);
          if (ai.ocr_data.receiver) setSlipReceiver(ai.ocr_data.receiver);
        }

        if (ai.amount && !deposit.amount) setEditAmount(Number(ai.amount));
      } catch (e) {
        console.error("AI Data parse error", e);
      }
    }

    setIsModalOpen(true);
  };

  const stats = useMemo(() => {
    const today = new Date().toLocaleDateString('en-CA');
    return deposits.reduce((acc, d) => {
      if (d.status === "pending") {
        acc.pendingAmount += (Number(d.amount) || 0);
        acc.pendingCount++;
      } else if (d.status === "approved") {
        acc.totalApproved += (Number(d.amount) || 0);
        const dDate = new Date(d.date).toLocaleDateString('en-CA');
        if (dDate === today) {
          acc.approvedToday += (Number(d.amount) || 0);
        }
      }
      return acc;
    }, { pendingAmount: 0, pendingCount: 0, approvedToday: 0, totalApproved: 0 });
  }, [deposits]);

  return (
    <div className="space-y-6 relative">
      <div className="flex justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            จัดการเงินฝาก
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-600 rounded-lg text-xs font-bold border border-amber-100 uppercase tracking-wider">
              <FileClock size={14} /> ตรวจสอบสะสม
            </span>
          </h1>
          <p className="text-slate-500 text-sm md:text-sm font-medium mt-0.5">ตรวจสอบและอนุมัติหลักฐานการโอนเงินกองทุน</p>
        </div>

        <button
          onClick={fetchDeposits}
          className="group flex items-center justify-center gap-2 bg-white border border-slate-200 px-3 md:px-4 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all hover:border-slate-300 shadow-sm"
        >
          <Loader2
            size={16}
            className={`${loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`}
          />
          <span className="hidden md:inline">รีเฟรชข้อมูล</span>
        </button>
      </div>


      {/* Stats - Space-Efficient Layout */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Pending Stat - Actionable & Compact */}
        <div className="col-span-2 md:col-span-1 bg-gradient-to-br from-indigo-600 to-sky-700 rounded-2xl p-4 text-white shadow-md relative overflow-hidden group">
          <div className="absolute -top-2 -right-2 p-3 opacity-10 group-hover:scale-110 transition-transform">
            <FileClock size={70} />
          </div>
          <div className="relative z-10 flex flex-col justify-between h-full">
            <div className="flex justify-between items-center mb-2">
              <p className="text-indigo-100 text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-rose-400 rounded-full animate-pulse" /> งานรอนุมัติ
              </p>
              <span className="bg-white/20 text-[9px] px-1.5 py-0.5 rounded-lg font-bold backdrop-blur-sm border border-white/10">{stats.pendingCount} รายการ</span>
            </div>
            <div className="flex items-baseline gap-1">
              <h2 className="text-2xl font-black tracking-tight leading-none">{stats.pendingAmount.toLocaleString()}</h2>
              <span className="text-[10px] text-indigo-200 font-bold uppercase">บาท</span>
            </div>
          </div>
        </div>

        {/* Mini Stats - Compact Design */}
        <div className="bg-white border border-slate-200 rounded-2xl p-3 md:p-4 shadow-sm flex flex-col justify-center hover:border-emerald-200 transition-colors group">
          <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mb-1 group-hover:text-emerald-500 transition-colors">อนุมัติวันนี้</p>
          <div className="flex items-baseline gap-1">
            <h2 className="text-xl font-black text-emerald-600 leading-none tracking-tight">{stats.approvedToday.toLocaleString()}</h2>
            <span className="text-[9px] text-slate-300 font-bold">฿</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-3 md:p-4 shadow-sm flex flex-col justify-center hover:border-sky-200 transition-colors group">
          <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mb-1 group-hover:text-sky-500 transition-colors">ยอดอนุมัติรวม</p>
          <div className="flex items-baseline gap-1">
            <h2 className="text-xl font-black text-slate-800 leading-none tracking-tight">{stats.totalApproved.toLocaleString()}</h2>
            <span className="text-[9px] text-slate-300 font-bold">฿</span>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 border-dashed rounded-2xl p-3 md:p-4 flex flex-col justify-center">
          <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mb-1">ถูกปฏิเสธ</p>
          <div className="flex items-baseline gap-1">
            <h2 className="text-xl font-black text-slate-400 leading-none tracking-tight">{deposits.filter(d => d.status === 'rejected').length}</h2>
            <span className="text-[9px] text-slate-300 font-bold uppercase">รายการ</span>
          </div>
        </div>
      </div>

      <div className="bg-white p-2.5 rounded-[1.5rem] shadow-sm border border-slate-100 space-y-2.5 sticky top-0 z-20">
        {/* Compact Tabs - Scrollable row */}
        <div className="flex bg-slate-100 p-1 rounded-xl w-full overflow-x-auto no-scrollbar gap-1">
          {[
            { id: "pending", label: "รอตรวจสอบ" },
            { id: "approved", label: "อนุมัติแล้ว" },
            { id: "rejected", label: "ปฏิเสธ" },
            { id: "all", label: "ทั้งหมด" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id as FilterStatus)}
              className={`cursor-pointer flex-1 flex items-center justify-center gap-2 px-3 md:px-4 py-2 rounded-lg text-[11px] md:text-sm font-bold whitespace-nowrap transition-all ${filterStatus === tab.id
                ? "bg-sky-600 text-white shadow-md shadow-sky-100"
                : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
                }`}
            >
              {tab.label}
              {tab.id === "pending" && deposits.filter(d => d.status === "pending").length > 0 && (
                <span className={`ml-1 md:ml-2 inline-flex items-center justify-center w-4 h-4 md:w-5 md:h-5 text-[9px] md:text-[10px] font-bold rounded-full ${filterStatus === tab.id ? 'bg-white text-sky-600' : 'bg-rose-500 text-white'}`}>
                  {deposits.filter(d => d.status === "pending").length}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex gap-2 w-full">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อ, รหัส..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 text-xs bg-slate-50/50"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200">
                <th className="py-2 px-3 font-bold text-slate-600 text-[11px] text-center">จัดการ</th>
                <th onClick={() => handleSort('id')} className="py-2 px-3 font-bold text-slate-600 text-[11px] whitespace-nowrap hover:bg-slate-100 transition-colors cursor-pointer">
                  รหัสรายการ <SortIcon column="id" sortConfig={sortConfig} />
                </th>
                <th className="py-2 px-3 font-bold text-slate-600 text-[11px]">รหัสสมาชิก</th>
                <th onClick={() => handleSort('name')} className="py-2 px-3 font-bold text-slate-600 text-[11px] hover:bg-slate-100 transition-colors cursor-pointer">
                  ชื่อสมาชิก <SortIcon column="name" sortConfig={sortConfig} />
                </th>
                <th onClick={() => handleSort('amount')} className="py-2 px-3 font-bold text-slate-600 text-[11px] text-right hover:bg-slate-100 transition-colors cursor-pointer">
                  จำนวนเงิน <SortIcon column="amount" sortConfig={sortConfig} />
                </th>
                <th onClick={() => handleSort('date')} className="py-2 px-3 font-bold text-slate-600 text-[11px] hover:bg-slate-100 transition-colors cursor-pointer">
                  วันที่แจ้งฝาก <SortIcon column="date" sortConfig={sortConfig} />
                </th>
                <th onClick={() => handleSort("status")} className="py-2 px-3 font-bold text-slate-600 text-[11px] text-center hover:bg-slate-100 transition-colors cursor-pointer">
                  สถานะ <SortIcon column="status" sortConfig={sortConfig} />
                </th>
                {(filterStatus === 'approved' || filterStatus === 'rejected' || filterStatus === 'all') && (
                  <th className="py-2 px-3 font-bold text-slate-600 text-[11px]">
                    ดำเนินการโดย
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-0">
                    <TableSkeleton rows={5} cols={8} hasHeader={false} />
                  </td>
                </tr>
              ) : paginatedDeposits.length === 0 ? (
                <tr><td colSpan={8} className="py-12 text-center text-slate-400">ไม่พบรายการ...</td></tr>
              ) : (
                paginatedDeposits.map((item) => {
                  const member = membersByLineMap.get(item.lineId || "");
                  const displayLineName = member?.lineName || item.lineName || "ไม่ระบุชื่อไลน์";
                  const profilePic = member?.pictureUrl || item.pictureUrl;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50 even:bg-slate-50/50 transition-colors">
                      <td className="py-2 px-3 text-center">
                        <button
                          onClick={() => openDetails(item)}
                          className={`cursor-pointer inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-bold transition-all ${item.status === "pending"
                            ? "bg-sky-50 text-sky-600 hover:bg-sky-600 hover:text-white border border-sky-100"
                            : "bg-slate-50 text-slate-500 hover:bg-slate-200 border border-slate-200"
                            }`}
                        >
                          <Eye size={14} />
                          {item.status === "pending" ? "ตรวจสลิป" : "ดูสลิป"}
                        </button>
                      </td>
                      <td className="py-2 px-3 text-slate-700 font-medium text-[12px] whitespace-nowrap">{item.id}</td>
                      <td className="py-2 px-3">
                        <span className="inline-flex px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold border border-slate-200">
                          {(!item.memberId || item.memberId === "-") ? (member?.memberId || "-") : item.memberId}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          {profilePic ? (
                            <Image
                              src={profilePic}
                              alt=""
                              width={20}
                              height={20}
                              className="w-5 h-5 rounded-full border border-slate-200 object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200">
                              <UserCircle size={12} />
                            </div>
                          )}
                          <div className="flex flex-col min-w-0">
                            <span className="text-[9px] text-slate-400 font-medium leading-none mb-0.5 truncate">
                              {displayLineName}
                            </span>
                            <span className="text-slate-700 font-bold text-[12px] leading-tight truncate">{member?.fullName || item.name}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-right font-black text-sky-600 text-[12px]">{item.amount.toLocaleString()}</td>
                      <td className="py-2 px-3 text-slate-500 text-[11px]">{formatDateTime(item.date)}</td>
                      <td className="py-2 px-3 text-center">
                        <span className={`inline-flex px-1.5 py-0.5 rounded-full text-[9px] font-bold whitespace-nowrap gap-1 items-center ${item.status === "approved" ? "bg-emerald-100 text-emerald-700" :
                          item.status === "rejected" ? "bg-rose-100 text-rose-700" :
                            "bg-amber-100 text-amber-700"
                          }`}>
                          {item.status === "pending" ? "รอตรวจสอบ" : item.status === "approved" ? "อนุมัติแล้ว" : "มีปัญหา"}
                        </span>
                      </td>
                      {(filterStatus === 'approved' || filterStatus === 'rejected' || filterStatus === 'all') && (
                        <td className="py-2 px-3 text-slate-400 text-[10px] italic">{item.approvedBy || "-"}</td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-slate-100">
          {loading ? (
            <div className="p-8 flex flex-col items-center justify-center gap-4">
              <Loader2 className="animate-spin text-sky-500" size={32} />
              <p className="text-sm text-slate-400 font-medium">กำลังโหลดข้อมูล...</p>
            </div>
          ) : paginatedDeposits.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <Search className="mx-auto text-slate-300 mb-3" size={48} />
              <p className="text-slate-500 font-medium">ไม่พบรายการฝากเงิน</p>
              <p className="text-slate-400 text-xs mt-1">ลองเปลี่ยนการกรองหรือคำค้นหาใหม่</p>
            </div>
          ) : (
            paginatedDeposits.map((item) => {
              const member = membersByLineMap.get(item.lineId || "");
              const displayLineName = member?.lineName || item.lineName || "ไม่ระบุชื่อไลน์";
              const profilePic = member?.pictureUrl || item.pictureUrl;

              return (
                <div key={item.id} className="p-4 space-y-4 hover:bg-slate-50 transition-colors active:bg-slate-100" onClick={() => openDetails(item)}>
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.id}</span>
                      <span className="text-[10px] text-slate-400 font-medium">{formatDateTime(item.date)}</span>
                    </div>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter ${item.status === "approved" ? "bg-emerald-100 text-emerald-700" :
                      item.status === "rejected" ? "bg-rose-100 text-rose-700" :
                        "bg-amber-100 text-amber-700"
                      }`}>
                      {item.status === "pending" ? "รอตรวจสอบ" : item.status === "approved" ? "อนุมัติแล้ว" : "มีปัญหา"}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    {profilePic ? (
                      <Image
                        src={profilePic}
                        alt=""
                        width={40}
                        height={40}
                        className="w-10 h-10 rounded-full border border-white shadow-sm object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-slate-300 border border-slate-200">
                        <UserCircle size={24} />
                      </div>
                    )}
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] text-sky-600 font-bold leading-none mb-0.5 truncate">
                        {displayLineName}
                      </span>
                      <span className="text-slate-800 font-black text-sm truncate block">{member?.fullName || item.name}</span>
                      <span className="text-[10px] text-slate-400 font-bold">ID: {(!item.memberId || item.memberId === "-") ? (member?.memberId || "-") : item.memberId}</span>
                    </div>
                    <div className="ml-auto text-right">
                      <span className="block text-lg font-black text-slate-800 tracking-tight leading-none">{item.amount.toLocaleString()}</span>
                      <span className="text-[10px] font-bold text-slate-400">บาท</span>
                    </div>
                  </div>

                  <button
                    onClick={(e) => { e.stopPropagation(); openDetails(item); }}
                    className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold shadow-sm transition-all ${item.status === "pending"
                      ? "bg-sky-500 text-white shadow-sky-100"
                      : "bg-slate-100 text-slate-600"
                      }`}
                  >
                    <Eye size={18} />
                    {item.status === "pending" ? "ตรวจสอบสลิปนี้" : "ดูรายละเอียดสลิป"}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 4. PAGINATION - At the very bottom */}
      {!loading && filteredAndSortedDeposits.length > 0 && (
        <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 mt-6">
          <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              แสดง {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredAndSortedDeposits.length)} จาก {filteredAndSortedDeposits.length}
            </div>
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="cursor-pointer bg-slate-50 border border-slate-100 rounded-lg px-2 py-1 text-[10px] font-bold text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              {[10, 20, 50, 100].map(v => (
                <option key={v} value={v}>{v} ต่อหน้า</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:bg-sky-50 hover:text-sky-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft size={20} />
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                let pageNum = 1;
                if (totalPages <= 5) pageNum = i + 1;
                else if (currentPage <= 3) pageNum = i + 1;
                else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                else pageNum = currentPage - 2 + i;

                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-10 h-10 rounded-xl text-sm font-bold transition-all ${currentPage === pageNum
                      ? 'bg-sky-600 text-white shadow-lg shadow-sky-100'
                      : 'bg-white text-slate-500 border border-slate-100 hover:border-sky-200 hover:text-sky-600'}`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:bg-sky-50 hover:text-sky-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      )}

      {isModalOpen && selectedDeposit && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl shadow-2xl flex flex-col max-h-[95svh] sm:max-h-[90vh] overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-base text-slate-800">ตรวจสอบสลิปฝากเงิน</h3>
                <p className="text-xs text-slate-500 mt-0.5">{selectedDeposit.id}</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-2 rounded-full hover:bg-slate-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto flex-1">
              <div className="px-5 pt-4 pb-4 bg-slate-50 border-b border-slate-100">
                <div className="flex items-center gap-4">
                  {membersByLineMap.get(selectedDeposit.lineId || "")?.pictureUrl || selectedDeposit.pictureUrl ? (
                    <Image
                      src={membersByLineMap.get(selectedDeposit.lineId || "")?.pictureUrl || selectedDeposit.pictureUrl!}
                      alt=""
                      width={56}
                      height={56}
                      className="w-14 h-14 rounded-full border-2 border-white shadow-sm object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center text-slate-300 border-2 border-white shadow-sm">
                      <UserCircle size={28} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-sky-600 font-black uppercase tracking-widest leading-none mb-1">
                      {membersByLineMap.get(selectedDeposit.lineId || "")?.lineName || selectedDeposit.lineName || "ไม่ระบุชื่อไลน์"}
                    </p>
                    <h4 className="font-black text-slate-800 text-lg leading-tight truncate">
                      {membersByLineMap.get(selectedDeposit.lineId || "")?.fullName || selectedDeposit.name}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-tighter">
                        ID: {(!selectedDeposit.memberId || selectedDeposit.memberId === "-") ? (membersByLineMap.get(selectedDeposit.lineId || "")?.memberId || "-") : selectedDeposit.memberId}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">{formatDateTime(selectedDeposit.date)}</span>
                    </div>
                  </div>
                  <span className={`shrink-0 inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase ${selectedDeposit.status === "pending" ? "bg-amber-100 text-amber-700" :
                    selectedDeposit.status === "approved" ? "bg-emerald-100 text-emerald-700" :
                      "bg-rose-100 text-rose-700"
                    }`}>
                    {selectedDeposit.status === "pending" ? "รอตรวจ" : selectedDeposit.status === "approved" ? "รับแล้ว" : "มีปัญหา"}
                  </span>
                </div>
              </div>

              <div className="px-5 pt-5">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <RefreshCw size={14} className="text-sky-500" /> หลักฐานการโอนเงิน
                </p>
                <div className="bg-slate-100 rounded-3xl overflow-hidden border border-slate-200 flex justify-center items-center min-h-[220px] relative group shadow-inner">
                  {selectedDeposit.slipUrl ? (
                    <div className="cursor-zoom-in relative w-full" onClick={() => setIsZoomOpen(true)}>
                      <Image
                        src={getDriveImageUrl(selectedDeposit.slipUrl)}
                        alt="Slip"
                        width={500}
                        height={800}
                        className="w-full h-auto max-h-[50svh] object-contain transition-transform duration-500 group-hover:scale-105"
                        unoptimized
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center">
                        <Search className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" size={32} />
                      </div>
                    </div>
                  ) : (<p className="text-slate-400 text-sm py-12 font-bold">ไม่พบรูปสลิป</p>)}
                </div>
                <button onClick={() => window.open(selectedDeposit.slipUrl, '_blank')} className="mt-3 w-full text-[11px] text-slate-500 font-bold flex items-center gap-1 justify-center py-2.5 hover:bg-slate-50 border border-slate-100 rounded-xl transition-all">
                  <ExternalLink size={14} /> เปิดดูรูปต้นฉบับ (ขนาดเต็ม)
                </button>
              </div>

              <div className="px-5 py-6 space-y-5">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">ระบุยอดที่ได้รับจริง</label>
                  <div className="relative group">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-slate-300 text-2xl group-focus-within:text-sky-400 transition-colors">฿</span>
                    <NumericFormat
                      thousandSeparator={true}
                      value={editAmount}
                      onValueChange={(values) => setEditAmount(values.floatValue || 0)}
                      className="w-full text-4xl font-black text-sky-600 bg-white border-2 border-slate-100 rounded-3xl pl-12 pr-6 py-5 focus:outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all text-right shadow-sm"
                    />
                  </div>
                </div>

                {selectedDeposit.note && (
                  <div className={`p-4 rounded-2xl border ${selectedDeposit.status === 'rejected' ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-100'}`}>
                    <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${selectedDeposit.status === 'rejected' ? 'text-rose-400' : 'text-slate-400'}`}>บันทึกเพิ่มเติม</p>
                    <p className={`text-sm font-bold ${selectedDeposit.status === 'rejected' ? 'text-rose-700' : 'text-slate-700'}`}>{selectedDeposit.note}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-5 border-t border-slate-100 bg-white">
              {selectedDeposit.status === "pending" ? (
                <div className="flex gap-3">
                  <button disabled={isUpdating} onClick={() => handleReject(selectedDeposit.id)} className="flex-1 flex items-center justify-center gap-2 py-4 text-sm font-black text-rose-600 bg-white hover:bg-rose-50 border-2 border-rose-100 rounded-2xl transition-all disabled:opacity-50 active:scale-95"><XCircle size={20} /> ปฏิเสธ</button>
                  <button disabled={isUpdating} onClick={() => handleApprove(selectedDeposit.id)} className="flex-[1.5] flex items-center justify-center gap-2 py-4 text-sm font-black text-white bg-sky-600 hover:bg-sky-700 rounded-2xl transition-all shadow-lg shadow-sky-100 disabled:opacity-50 active:scale-95"><CheckCircle2 size={20} /> อนุมัติยอดฝาก</button>
                </div>
              ) : selectedDeposit.status === "approved" ? (
                <div className="flex gap-3">
                  <button onClick={() => setIsModalOpen(false)} className="flex-1 py-4 text-sm font-bold text-slate-500 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-colors">ปิด</button>
                  <button disabled={isUpdating} onClick={() => handleReopen(selectedDeposit.id)} className="flex-[1.5] flex items-center justify-center gap-2 py-4 text-sm font-black text-amber-700 bg-amber-50 hover:bg-amber-100 border-2 border-amber-200 rounded-2xl transition-all disabled:opacity-50 active:scale-95"><RotateCw size={20} /> ดึงกลับมาตรวจสอบ</button>
                  <button disabled={isUpdating} onClick={() => handleApprove(selectedDeposit.id)} className="flex-1 flex items-center justify-center gap-2 py-4 text-sm font-black text-white bg-sky-600 hover:bg-sky-700 rounded-2xl transition-all shadow-lg shadow-sky-100 disabled:opacity-50 active:scale-95"><Save size={20} /> บันทึกแก้ไข</button>
                </div>
              ) : (
                <div className="flex gap-3">
                  <button onClick={() => setIsModalOpen(false)} className="flex-1 py-4 text-sm font-bold text-slate-500 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-colors">ปิด</button>
                  <button disabled={isUpdating} onClick={() => handleReopen(selectedDeposit.id)} className="flex-[2] flex items-center justify-center gap-2 py-4 text-sm font-black text-amber-700 bg-amber-50 hover:bg-amber-100 border-2 border-amber-200 rounded-2xl transition-all disabled:opacity-50 active:scale-95"><RefreshCw size={20} /> เปิดตรวจใหม่อีกครั้ง</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Zoom Modal - Lightbox */}
      {isZoomOpen && selectedDeposit && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/95 backdrop-blur-md transition-all duration-300 animate-in fade-in"
          onClick={() => setIsZoomOpen(false)}
        >
          <div className="absolute top-6 right-6 flex gap-4">
            <button
              className="bg-white/10 hover:bg-white/20 text-white p-3 rounded-full backdrop-blur-md transition-colors"
              onClick={() => setIsZoomOpen(false)}
            >
              <X size={24} />
            </button>
          </div>
          <div
            className="relative max-w-[95vw] max-h-[90vh] transition-transform duration-500 animate-in zoom-in-95"
            onClick={e => e.stopPropagation()}
          >
            <img
              src={getDriveImageUrl(selectedDeposit.slipUrl)}
              alt="Zoomed Slip"
              className="w-auto h-auto max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl border border-white/10"
            />
          </div>
        </div>
      )}
    </div>
  );
}
