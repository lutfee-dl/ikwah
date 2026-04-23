"use client";

import { useState, useEffect } from "react";
import {
  Search,
  Users,
  ShoppingBag,
  ArrowUpRight,
  Wallet,
  BadgeCent,
  ArrowRightLeft,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  SearchX,
  X,
  Download,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { toast } from "react-hot-toast";
import Link from "next/link";

interface Contract {
  contractId: string;
  requestId: string;
  approvedDate: string;
  lineId: string;
  fullName: string;
  lineName?: string;
  loanType: string;
  items: string;
  reason: string;
  principalAmount: number;
  profitAmount: number;
  totalPayable: number;
  installmentPerMonth: number;
  totalInstallments: number;
  totalPaidAmount: number;
  remainingBalance: number;
  status: string;
}

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");

  // New States for Sorting & Pagination
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    fetchContracts();
  }, []);

  const fetchContracts = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action: "admin_get_contracts",
          ADMIN_SECRET: process.env.NEXT_PUBLIC_ADMIN_SECRET 
        }),
      });
      const result = await res.json();
      if (result.success && Array.isArray(result.data)) {
        const mapped = result.data.map((item: any) => {
          const totalPaidAmount = Number(item.paidAmount || 0);
          const totalPayable = Number(item.totalPayable || 0);
          const totalInstallments = Number(item.duration || 0);
          const installmentPerMonth = totalInstallments > 0 ? totalPayable / totalInstallments : 0;
          const approvedDateStr = String(item.approvedDate || "");
          let status = String(item.status || "กำลังผ่อน");

          // --- AUTO-TRACKING LOGIC ---
          if (status !== "ปิดยอดแล้ว" && approvedDateStr) {
            const appDate = new Date(approvedDateStr);
            if (!isNaN(appDate.getTime())) {
              const today = new Date();
              let monthsPassed = (today.getFullYear() - appDate.getFullYear()) * 12 + (today.getMonth() - appDate.getMonth());
              if (today.getDate() < appDate.getDate()) {
                monthsPassed--;
              }
              monthsPassed = Math.max(0, monthsPassed);
              monthsPassed = Math.min(monthsPassed, totalInstallments);
              
              const expectedPaid = monthsPassed * installmentPerMonth;
              
              if (totalPaidAmount < expectedPaid) {
                status = "ค้างชำระ";
              } else {
                status = "กำลังผ่อน";
              }
            }
          }
          if (status !== "ปิดยอดแล้ว" && totalPaidAmount >= totalPayable && totalPayable > 0) {
            status = "ปิดยอดแล้ว";
          }

          return {
            contractId: String(item.contractId || ""),
            requestId: String(item.requestId || ""),
            approvedDate: String(item.approvedDate || ""),
            lineId: String(item.lineId || ""),
            fullName: String(item.memberName || ""),
            loanType: String(item.loanType || ""),
            principalAmount: Number(item.amount || 0),
            profitAmount: Number(item.interest || 0),
            totalPayable: totalPayable,
            installmentPerMonth,
            totalInstallments,
            totalPaidAmount,
            remainingBalance: Number(item.remainingBalance || 0),
            status,
            lineName: String(item.lineName || ""),
            items: String(item.items || "ทั่วไป"),
            reason: String(item.reason || ""),
          };
        });
        setContracts(mapped);
      }
    } catch (error) {
      toast.error("ดึงข้อมูลไม่สำเร็จ");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredContracts = contracts.filter((c) => {
    const matchStatus = filterStatus === "all" || c.status === filterStatus;
    const matchType = filterType === "all" || c.loanType === filterType;
    const s = searchTerm.toLowerCase();
    return matchStatus && matchType && (
      c.fullName.toLowerCase().includes(s) ||
      c.contractId.toLowerCase().includes(s) ||
      c.items.toLowerCase().includes(s)
    );
  });

  // Sort Logic
  const sortedContracts = [...filteredContracts].sort((a, b) => {
    if (!sortConfig) return 0;
    const { key, direction } = sortConfig;
    let aVal: string | number = (a[key as keyof Contract] as string | number) || "";
    let bVal: string | number = (b[key as keyof Contract] as string | number) || "";

    if (key === "principalAmount" || key === "remainingBalance" || key === "totalPayable") {
      aVal = Number(aVal) || 0;
      bVal = Number(bVal) || 0;
    } else {
      aVal = String(aVal).toLowerCase();
      bVal = String(bVal).toLowerCase();
    }

    if (aVal < bVal) return direction === "asc" ? -1 : 1;
    if (aVal > bVal) return direction === "asc" ? 1 : -1;
    return 0;
  });

  // Pagination Logic
  const totalPages = Math.ceil(sortedContracts.length / itemsPerPage) || 1;
  const paginatedContracts = sortedContracts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, filterType]);

  const handleSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const exportToCSV = () => {
    const headers = ["ID สัญญา", "วันที่อนุมัติ", "ชื่อผู้กู้", "Line ID", "ประเภท", "สินค้า/รายการ", "ยอดรวมสุทธิ", "จำนวนงวดทั้งหมด", "ชำระแล้ว", "คงเหลือ", "สถานะ"];
    const rows = sortedContracts.map(c => [
      c.contractId, c.approvedDate, c.fullName, c.lineName || '-', c.loanType, c.items, c.totalPayable, c.totalInstallments, c.totalPaidAmount, c.remainingBalance, c.status
    ]);
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF"
      + headers.join(",") + "\n"
      + rows.map(e => e.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `contracts_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const stats = {
    overdue: contracts.filter(c => c.status === "ค้างชำระ").length,
    ongoing: contracts.filter(c => c.status === "กำลังผ่อน").length,
    finished: contracts.filter(c => c.status === "ปิดยอดแล้ว").length,
  };

  const getStatusBadge = (status: string) => {
    if (status === "ปิดยอดแล้ว") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
          <CheckCircle2 size={14} /> สำเร็จ
        </span>
      );
    }
    if (status === "ค้างชำระ") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-rose-50 text-rose-600 border border-rose-200">
          <AlertCircle size={14} className="animate-pulse" /> ค้างชำระ
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-50 text-amber-600 border border-amber-200">
        <RotateCcw size={14} /> ปกติ (กำลังผ่อน)
      </span>
    );
  };

  const getTypeStyle = (type: string) => {
    if (type === 'ฉุกเฉิน') return 'bg-rose-50 text-rose-600 border-rose-100';
    if (type === 'ก้อดฮาซัน') return 'bg-emerald-50 text-emerald-600 border-emerald-100';
    return 'bg-blue-50 text-blue-600 border-blue-100';
  };

  return (
    <div className="min-h-screen p-4 lg:p-6 font-sans text-slate-900 bg-slate-50/50">

      {/* --- Section 1: สรุปภาพรวม & Auto-Tracker System --- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div 
          className="cursor-pointer bg-gradient-to-br from-slate-800 to-slate-950 p-5 rounded-2xl text-white shadow-lg shadow-slate-900/20 flex flex-col justify-between"
          onClick={() => setFilterStatus("all")}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-2.5 bg-white/10 rounded-xl text-sky-300 backdrop-blur-md"><Users size={24} /></div>
            <span className="text-xs font-medium text-slate-400 bg-white/5 px-2 py-1 rounded-full">ทั้งหมด</span>
          </div>
          <div>
            <p className="text-3xl font-black">{contracts.length} <span className="text-sm font-normal text-slate-400">สัญญา</span></p>
          </div>
        </div>

        {[
          { label: "ค้างชำระ", count: stats.overdue, icon: <AlertCircle size={24} />, color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-200" },
          { label: "กำลังผ่อน", count: stats.ongoing, icon: <RotateCcw size={24} />, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
          { label: "ปิดยอดแล้ว", count: stats.finished, icon: <CheckCircle2 size={24} />, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" }
        ].map((s, i) => (
          <div 
            key={i} 
            className={`cursor-pointer bg-white p-5 rounded-2xl border ${s.border} shadow-sm flex flex-col justify-between transition-transform hover:-translate-y-1 duration-300`}
            onClick={() => setFilterStatus(s.label)}
          >
            <div className={`flex items-center justify-between mb-4`}>
              <div className={`p-2.5 ${s.bg} ${s.color} rounded-xl`}>{s.icon}</div>
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{s.label === 'ค้างชำระ' ? 'ต้องตามทวงเตือน' : s.label}</span>
            </div>
            <div>
              <p className={`text-3xl font-black ${s.color}`}>{s.count} <span className="text-sm font-bold opacity-60">สัญญา</span></p>
            </div>
          </div>
        ))}
      </div>

      {/* --- Section 2: ตารางและการกรองข้อมูล --- */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden text-[15px]">

        {/* Toolbar */}
        <div className="p-4 lg:p-5 bg-white border-b border-slate-100 flex flex-col lg:flex-row gap-4 justify-between items-center">
          <div className="flex gap-2 p-1.5 bg-slate-100/80 rounded-xl w-full lg:w-auto overflow-x-auto no-scrollbar">
            {["all", "กำลังผ่อน", "ค้างชำระ", "ปิดยอดแล้ว"].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all flex-1 lg:flex-none text-center ${filterStatus === st ? "bg-white text-blue-600 shadow-sm ring-1 ring-slate-200/50" : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"
                  }`}
              >
                {st === "all" ? "ทั้งหมด" : st}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto items-center">
            <select
              className="w-full sm:w-auto px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right .5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em', paddingRight: '2.5rem' }}
            >
              <option value="all">ทุกประเภท</option>
              <option value="ฉุกเฉิน">ฉุกเฉิน</option>
              <option value="ก้อดฮาซัน">ก้อดฮาซัน</option>
              <option value="ซื้อขาย">ซื้อขาย</option>
            </select>

            <div className="relative flex-1 w-full sm:w-80 group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
              <input
                type="text"
                placeholder="ค้นหาชื่อ, สินค้า, หรือสัญญา..."
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white outline-none font-medium transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500 p-1 rounded-full transition-colors"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <div className="hidden sm:flex gap-2">
              <button
                onClick={exportToCSV}
                className="p-2.5 bg-emerald-50 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-all active:scale-95 shadow-sm"
                title="ดาวน์โหลด CSV"
              >
                <Download size={20} />
              </button>
              <button
                onClick={fetchContracts}
                className="p-2.5 bg-slate-50 text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 rounded-xl transition-all active:scale-95 shadow-sm"
                title="รีเฟรชข้อมูล"
              >
                <RotateCcw size={20} className={isLoading ? "animate-spin" : ""} />
              </button>
            </div>
          </div>
        </div>

        {/* --- Content Area --- */}
        <div className="bg-slate-50/30">

          {/* Loading Skeletons */}
          {isLoading ? (
            <div className="divide-y divide-slate-100 p-4 lg:p-0">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="animate-pulse flex flex-col lg:flex-row items-start lg:items-center p-4 lg:p-6 gap-4">
                  <div className="flex-1 space-y-3 w-full">
                    <div className="h-4 bg-slate-200 rounded-md w-1/3"></div>
                    <div className="h-3 bg-slate-100 rounded-md w-1/2"></div>
                  </div>
                  <div className="flex-1 space-y-3 hidden lg:block">
                    <div className="h-4 bg-slate-200 rounded-md w-1/4"></div>
                    <div className="h-3 bg-slate-100 rounded-md w-1/3"></div>
                  </div>
                  <div className="h-8 bg-slate-200 rounded-full w-24"></div>
                </div>
              ))}
            </div>
          ) : paginatedContracts.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <SearchX size={28} className="text-slate-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">ไม่พบข้อมูลสัญญา</h3>
              <p className="text-slate-500 text-sm max-w-sm">ไม่พบเอกสารที่ตรงกับคำค้นหาหรือตัวกรองที่คุณเลือก กรุณาลองค้นหาด้วยคำอื่น</p>
              {(searchTerm !== "" || filterStatus !== "all" || filterType !== "all") && (
                <button
                  onClick={() => { setSearchTerm(""); setFilterStatus("all"); setFilterType("all"); }}
                  className="mt-4 px-5 py-2 bg-blue-50 text-blue-600 font-bold rounded-xl hover:bg-blue-100 text-sm transition-colors"
                >
                  ล้างตัวกรองทั้งหมด
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Desktop Table View (Hidden on mobile) */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100/50 text-slate-500 text-xs uppercase tracking-widest font-black border-y border-slate-200">
                      <th className="py-4 px-6 cursor-pointer hover:bg-slate-200/50 transition-colors" onClick={() => handleSort("approvedDate")}>
                        <div className="flex items-center gap-1 group">ข้อมูลสัญญา {sortConfig?.key === "approvedDate" && (sortConfig.direction === "asc" ? <ChevronUp size={14} className="text-blue-500" /> : <ChevronDown size={14} className="text-blue-500" />)}</div>
                      </th>
                      <th className="py-4 px-6 cursor-pointer hover:bg-slate-200/50 transition-colors" onClick={() => handleSort("fullName")}>
                        <div className="flex items-center gap-1 group">ผู้กู้ {sortConfig?.key === "fullName" && (sortConfig.direction === "asc" ? <ChevronUp size={14} className="text-blue-500" /> : <ChevronDown size={14} className="text-blue-500" />)}</div>
                      </th>
                      <th className="py-4 px-6 text-center cursor-pointer hover:bg-slate-200/50 transition-colors" onClick={() => handleSort("loanType")}>
                        <div className="flex justify-center items-center gap-1 group">ประเภท {sortConfig?.key === "loanType" && (sortConfig.direction === "asc" ? <ChevronUp size={14} className="text-blue-500" /> : <ChevronDown size={14} className="text-blue-500" />)}</div>
                      </th>
                      <th className="py-4 px-6 text-right cursor-pointer hover:bg-slate-200/50 transition-colors" onClick={() => handleSort("remainingBalance")}>
                        <div className="flex justify-end items-center gap-1 group">ยอดคงเหลือ {sortConfig?.key === "remainingBalance" && (sortConfig.direction === "asc" ? <ChevronUp size={14} className="text-blue-500" /> : <ChevronDown size={14} className="text-blue-500" />)}</div>
                      </th>
                      <th className="py-4 px-6 text-center cursor-pointer hover:bg-slate-200/50 transition-colors" onClick={() => handleSort("status")}>
                        <div className="flex justify-center items-center gap-1 group">สถานะ {sortConfig?.key === "status" && (sortConfig.direction === "asc" ? <ChevronUp size={14} className="text-blue-500" /> : <ChevronDown size={14} className="text-blue-500" />)}</div>
                      </th>
                      <th className="py-4 px-6 text-center w-24">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {paginatedContracts.map((item, idx) => {
                      const paidCount = Math.round(item.totalPaidAmount / item.installmentPerMonth);
                      const remaining = Math.max(0, item.totalInstallments - paidCount);

                      return (
                        <tr key={idx} className="hover:bg-blue-50/30 transition-colors group">
                          <td className="py-5 px-6">
                            <div className="font-mono bg-slate-100 p-2 rounded-full text-[12px] font-bold text-slate-400 mb-1.5 uppercase w-max">ID: {item.contractId}</div>
                            <div className="flex items-center gap-2 font-black text-slate-800 text-sm">
                              <ShoppingBag size={14} className="text-blue-500 shrink-0" /> <span className="truncate">{item.items}</span>
                            </div>
                            <div className="text-[12px] text-slate-400 font-medium mt-1">
                              อนุมัติเมื่อ: {item.approvedDate}
                            </div>
                          </td>

                          <td className="py-5 px-6">
                            <div className="flex items-center gap-3">
                              <div>
                                <div className="font-bold text-slate-900 text-sm border-b border-transparent group-hover:border-blue-200 transition-colors">{item.fullName}</div>
                                <div className="text-[12px] text-slate-400 font-medium mt-0.5">Line: {item.lineName || '-'}</div>
                              </div>
                            </div>
                          </td>

                          <td className="py-5 px-6 text-center">
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${getTypeStyle(item.loanType)}`}>
                              {item.loanType}
                            </span>
                          </td>

                          <td className="py-5 px-6 text-right">
                            <div className="text-base font-black text-slate-800 mb-0.5">{item.remainingBalance.toLocaleString()} <span className="text-[12px] text-slate-400">฿</span></div>
                            <div className={`text-[12px] font-bold ${remaining <= 3 && remaining > 0 ? 'text-amber-600' : 'text-slate-500'}`}>
                              เหลือ {remaining}/{item.totalInstallments} งวด
                            </div>
                          </td>

                          <td className="py-5 px-6 text-center">
                            {getStatusBadge(item.status)}
                          </td>

                          <td className="py-5 px-6 text-center">
                            <Link
                              href={`/admin/contracts/${item.contractId}`}
                              className="inline-flex items-center justify-center w-9 h-9 bg-white border border-slate-200 text-slate-500 hover:text-white hover:border-blue-600 hover:bg-blue-600 rounded-xl transition-all shadow-sm active:scale-95"
                              title="จัดการ"
                            >
                              <ArrowUpRight size={18} />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View (Hidden on desktop) */}
              <div className="lg:hidden p-4 space-y-4 bg-slate-50/50">
                {paginatedContracts.map((item, idx) => {
                  const paidCount = Math.round(item.totalPaidAmount / item.installmentPerMonth);
                  const remaining = Math.max(0, item.totalInstallments - paidCount);

                  return (
                    <Link href={`/admin/contracts/${item.contractId}`} key={idx} className="block bg-white border border-slate-200 rounded-2xl p-5 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] hover:border-blue-300 active:scale-[0.98] transition-all">
                      <div className="flex justify-between items-start mb-4 gap-2">
                        <div className="flex-1">
                          <div className="font-mono text-[9px] font-bold text-slate-400 mb-1 uppercase tracking-wider">ID: {item.contractId}</div>
                          <div className="font-black text-slate-800 text-base leading-tight">
                            {item.items}
                          </div>
                        </div>
                        <div className="shrink-0">{getStatusBadge(item.status)}</div>
                      </div>

                      <div className="flex items-center gap-3 mb-4 p-3 bg-slate-50/80 rounded-xl border border-slate-100">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600 text-xs shrink-0">
                          {item.fullName.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-sm text-slate-900 truncate">{item.fullName}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">ประเภท: <span className={`font-bold ${item.loanType === 'ฉุกเฉิน' ? 'text-rose-600' : 'text-blue-600'}`}>{item.loanType}</span></div>
                        </div>
                      </div>

                      <div className="flex justify-between items-end border-t border-slate-100 pt-3 border-dashed mt-2">
                        <div>
                          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">ยอดคงเหลือ</div>
                          <div className="text-lg font-black text-rose-600 leading-none">{item.remainingBalance.toLocaleString()} <span className="text-xs text-rose-300">฿</span></div>
                        </div>
                        <div className="text-right">
                          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">จำนวนงวด</div>
                          <div className={`text-sm font-black ${remaining <= 3 && remaining > 0 ? 'text-amber-600' : 'text-slate-700'}`}>
                            {remaining}<span className="text-[10px] text-slate-400 font-bold">/{item.totalInstallments}</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between p-4 lg:px-6 bg-white border-t border-slate-200/60 rounded-b-[2rem]">
                  <p className="text-sm font-bold text-slate-500">
                    หน้า <span className="text-slate-800">{currentPage}</span> จาก {totalPages}
                    <span className="hidden sm:inline font-medium ml-2 text-slate-400">
                      (รายการที่ {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, sortedContracts.length)} จากทั้งหมด {sortedContracts.length})
                    </span>
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-2 sm:px-4 sm:py-2 flex items-center gap-1 bg-slate-50 text-slate-600 rounded-xl hover:bg-blue-50 hover:text-blue-600 disabled:opacity-50 disabled:hover:bg-slate-50 disabled:hover:text-slate-600 transition-colors font-bold text-sm"
                    >
                      <ChevronLeft size={18} /> <span className="hidden sm:block">ก่อนหน้า</span>
                    </button>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2 sm:px-4 sm:py-2 flex items-center gap-1 bg-slate-50 text-slate-600 rounded-xl hover:bg-blue-50 hover:text-blue-600 disabled:opacity-50 disabled:hover:bg-slate-50 disabled:hover:text-slate-600 transition-colors font-bold text-sm"
                    >
                      <span className="hidden sm:block">ถัดไป</span> <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}