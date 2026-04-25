"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import { Search, X, XCircle, Receipt, CheckCircle, Loader2, ExternalLink, ArrowUpDown, ArrowUp, ArrowDown, FileClock, AlertCircle, Eye, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";
import { NumericFormat } from "react-number-format";
import Swal from "sweetalert2";
import { formatDateTime } from "@/lib/utils";
import { TableSkeleton } from "@/components/ui/TableSkeleton";

type RepaymentSlip = {
  id: string;
  lineId: string;
  name: string;
  itemName: string;
  contractId: string;
  amount: number;
  date: string;
  status: "pending" | "approved" | "rejected";
  slipUrl: string;
};

type Contract = {
  id: string;
  lineId: string;
  name: string;
  type: string;
  amount: number;
  balance: number;
  status: string;
};

type FilterStatus = "pending" | "approved" | "rejected" | "all";
type SortColumn = "id" | "name" | "amount" | "date" | "status";
type SortDirection = "asc" | "desc";

const SortIcon = ({ column, sortConfig }: { column: SortColumn, sortConfig: { column: SortColumn, direction: SortDirection } }) => {
  if (sortConfig.column !== column) return <ArrowUpDown size={14} className="inline ml-1 text-slate-300" />;
  return sortConfig.direction === "asc" ?
    <ArrowUp size={14} className="inline ml-1 text-indigo-500" /> :
    <ArrowDown size={14} className="inline ml-1 text-indigo-500" />;
};

export default function RepaymentsPage() {
  const [repayments, setRepayments] = useState<RepaymentSlip[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
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

  const [selectedPay, setSelectedPay] = useState<RepaymentSlip | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const [selectedContractId, setSelectedContractId] = useState("");
  const [editAmount, setEditAmount] = useState(0);

  const fetchRepaymentSlips = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "admin_get_repayment_slips",
          ADMIN_SECRET: process.env.NEXT_PUBLIC_ADMIN_SECRET
        })
      });
      const data = await res.json();
      if (data.success) {
        setRepayments(data.data);
      }
    } catch (err) {
      console.error(err);
      toast.error("ดึงข้อมูลสลิปไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  const fetchContracts = async () => {
    try {
      const res = await fetch("/api/member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "admin_get_contracts",
          ADMIN_SECRET: process.env.NEXT_PUBLIC_ADMIN_SECRET
        })
      });
      const data = await res.json();
      if (data.success) {
        const mapped = data.data.map((item: any) => ({
          id: item.contractId,
          lineId: item.lineId,
          name: item.memberName,
          type: item.loanType,
          amount: Number(item.totalPayable),
          balance: Number(item.remainingBalance),
          status: item.status
        }));
        setContracts(mapped);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchRepaymentSlips();
    fetchContracts();
  }, []);

  const filteredAndSortedRepayments = useMemo(() => {
    if (!Array.isArray(repayments)) return [];

    // 1. Filter
    const result = repayments.filter((r) => {
      const matchStatus = filterStatus === "all" || r.status === filterStatus;
      const matchSearch = (r.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.id || "").toLowerCase().includes(searchQuery.toLowerCase());
      return matchStatus && matchSearch;
    });

    // 2. Sort
    result.sort((a, b) => {
      let valA: string | number = a[sortConfig.column];
      let valB: string | number = b[sortConfig.column];

      if (sortConfig.column === 'date') {
        valA = new Date(a.date).getTime();
        valB = new Date(b.date).getTime();
      }

      if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
      if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [repayments, filterStatus, searchQuery, sortConfig]);

  // Paginated Data
  const paginatedRepayments = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedRepayments.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedRepayments, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredAndSortedRepayments.length / itemsPerPage);

  // Reset page when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, searchQuery, itemsPerPage]);

  const handleSort = (column: SortColumn) => {
    setSortConfig(prev => ({
      column,
      direction: prev.column === column && prev.direction === "asc" ? "desc" : "asc"
    }));
  };

  const stats = useMemo(() => {
    const today = new Date().toLocaleDateString('en-CA');
    return repayments.reduce((acc, r) => {
      if (r.status === "pending") {
        acc.pendingAmount += (Number(r.amount) || 0);
        acc.pendingCount++;
      } else if (r.status === "approved") {
        acc.totalApproved += (Number(r.amount) || 0);
        const rDate = new Date(r.date).toLocaleDateString('en-CA');
        if (rDate === today) {
          acc.approvedToday += (Number(r.amount) || 0);
        }
      }
      return acc;
    }, { pendingAmount: 0, pendingCount: 0, approvedToday: 0, totalApproved: 0 });
  }, [repayments]);

  const memberActiveContracts = useMemo(() => {
    if (!selectedPay) return [];
    return contracts.filter(c => c.lineId === selectedPay.lineId && c.status === "กำลังผ่อน");
  }, [selectedPay, contracts]);

  const handleApprove = async () => {
    if (!selectedPay) return;

    if (!selectedContractId) {
      toast.error("กรุณาเลือกสัญญาที่ต้องการตัดยอด");
      return;
    }

    const confirmResult = await Swal.fire({
      title: 'ยืนยันรับชำระค่างวด?',
      text: `คุณต้องการบันทึกการรับชำระเป็นเงิน ${editAmount.toLocaleString()} ฿ ใช่หรือไม่?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ยืนยันอนุมัติ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#3b82f6', // sky-500
    });

    if (!confirmResult.isConfirmed) return;

    setIsUpdating(true);
    try {
      const res = await fetch("/api/member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "admin_update_loan_repayment",
          ADMIN_SECRET: process.env.NEXT_PUBLIC_ADMIN_SECRET,
          depositId: selectedPay.id,
          status: "approved",
          contractId: selectedContractId,
          amount: editAmount
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success("อนุมัติรับชำระสำเร็จ");
        fetchRepaymentSlips();
        setIsModalOpen(false);
      } else {
        toast.error(data.msg || "เกิดข้อผิดพลาด");
      }
    } catch (err) {
      console.error(err);
      toast.error("ติดต่อเซิร์ฟเวอร์ไม่ได้");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleReject = async () => {
    if (!selectedPay) return;

    const confirmResult = await Swal.fire({
      title: 'ยืนยันการปฏิเสธ?',
      text: 'คุณต้องการปฏิเสธสลิปชำระเงินนี้ใช่หรือไม่?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ยืนยันปฏิเสธ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#ef4444', // rose-500
    });

    if (!confirmResult.isConfirmed) return;

    setIsUpdating(true);
    try {
      const res = await fetch("/api/member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "admin_update_loan_repayment",
          ADMIN_SECRET: process.env.NEXT_PUBLIC_ADMIN_SECRET,
          depositId: selectedPay.id,
          status: "rejected"
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success("ปฏิเสธสลิปเรียบร้อย");
        fetchRepaymentSlips();
        setIsModalOpen(false);
      } else {
        toast.error(data.msg || "เกิดข้อผิดพลาด");
      }
    } catch (err) {
      console.error(err);
      toast.error("ติดต่อเซิร์ฟเวอร์ไม่ได้");
    } finally {
      setIsUpdating(false);
    }
  };

  const openDetails = (pay: RepaymentSlip) => {
    setSelectedPay(pay);
    setEditAmount(pay.amount);
    setSelectedContractId(pay.contractId || "");
    setIsModalOpen(true);
  };

  const getDriveImageUrl = (url: string) => {
    if (!url) return "";
    const matches = url.match(/[-\w]{25,}/g);
    const fileId = matches ? matches.find(m => !['drive', 'google', 'file', 'view'].includes(m.toLowerCase())) : null;
    return fileId ? `https://docs.google.com/thumbnail?id=${fileId}&sz=w1200` : url;
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800">ตรวจสอบชำระค่างวด</h1>
          <p className="text-slate-500 text-sm mt-1">
            ตรวจสลิปยืนยันการจ่ายค่างวดสินเชื่อของสมาชิก
          </p>
        </div>
        <button
          onClick={fetchRepaymentSlips}
          className="group flex items-center gap-2 bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all hover:border-slate-300"
        >
          <Loader2 size={16} className={`${loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
          รีเฟรชข้อมูล
        </button>
      </div>

      {/* 2. SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending Amount */}
        <div className="bg-white border-2 border-amber-100 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform">
            <Receipt size={100} className="text-amber-500" />
          </div>
          <div className="relative z-10">
            <p className="text-amber-500 text-[10px] font-black uppercase tracking-widest mb-1 flex items-center gap-1">
              <FileClock size={12} /> ยอดรอตรวจสอบ
            </p>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">{stats.pendingAmount.toLocaleString()} <span className="text-xs font-medium text-slate-400">฿</span></h2>
            <div className="flex items-center justify-between mt-2">
              <span className="text-[10px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full font-bold">{stats.pendingCount} รายการ</span>
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Approved Today */}
        <div className="bg-indigo-600 rounded-3xl p-5 text-white shadow-lg shadow-indigo-100 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:rotate-12 transition-transform">
            <CheckCircle2 size={80} />
          </div>
          <div className="relative z-10">
            <p className="text-indigo-100 text-[10px] font-black uppercase tracking-widest mb-1 flex items-center gap-1">
              <CheckCircle size={12} /> รับชำระแล้ว (วันนี้)
            </p>
            <h2 className="text-2xl font-black tracking-tight">{stats.approvedToday.toLocaleString()} <span className="text-xs font-medium opacity-70">฿</span></h2>
            <div className="h-1 w-12 bg-white/30 rounded-full mt-3"></div>
          </div>
        </div>

        {/* Total Approved */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex items-center gap-4 hover:border-indigo-200 transition-all group">
          <div className="bg-indigo-50 p-4 rounded-2xl text-indigo-500 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
            <Receipt size={24} />
          </div>
          <div>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-0.5">ยอดรวมค่างวดสะสม</p>
            <h2 className="text-xl font-black text-slate-700">{stats.totalApproved.toLocaleString()} <span className="text-xs font-medium text-slate-400">฿</span></h2>
          </div>
        </div>

        {/* Rejected Stats */}
        <div className="bg-rose-50 border border-rose-100 rounded-3xl p-5 flex items-center gap-4 relative overflow-hidden">
          <div className="absolute -right-2 -top-2 opacity-5">
            <AlertCircle size={60} className="text-rose-600" />
          </div>
          <div className="bg-white p-4 rounded-2xl text-rose-500 border border-rose-100">
            <XCircle size={24} />
          </div>
          <div>
            <p className="text-rose-400 text-[10px] font-bold uppercase tracking-widest mb-0.5">รายการมีปัญหา</p>
            <h2 className="text-xl font-black text-rose-700">
              {repayments.filter(r => r.status === 'rejected').length} <span className="text-xs font-medium">รายการ</span>
            </h2>
          </div>
        </div>
      </div>

      {/* 3. CONTROLS (TABS & SEARCH) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-3xl shadow-sm border border-slate-100">
        {/* Tabs for Filtering */}
        <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto overflow-x-auto no-scrollbar">
          {[
            { id: "pending", label: "รอตรวจสลิป" },
            { id: "approved", label: "รับชำระแล้ว" },
            { id: "rejected", label: "มีปัญหา" },
            { id: "all", label: "ทั้งหมด" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id as FilterStatus)}
              className={`cursor-pointer flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${filterStatus === tab.id
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-100"
                : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
                }`}
            >
              {tab.label}
              {tab.id === "pending" && repayments.filter(r => r.status === "pending").length > 0 && (
                <span className={`ml-2 inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold rounded-full ${filterStatus === tab.id ? 'bg-white text-indigo-600' : 'bg-rose-500 text-white'}`}>
                  {repayments.filter(r => r.status === "pending").length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search & Items Per Page */}
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="รหัสโอน, ชื่อผู้กู้..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
            />
          </div>
          <select
            value={itemsPerPage}
            onChange={(e) => setItemsPerPage(Number(e.target.value))}
            className="cursor-pointer bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value={10}>10 รายการ / หน้า</option>
            <option value={20}>20 รายการ / หน้า</option>
            <option value={50}>50 รายการ / หน้า</option>
            <option value={100}>100 รายการ / หน้า</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200">
                <th onClick={() => handleSort('id')} className="py-4 px-6 font-semibold text-slate-600 text-sm whitespace-nowrap hover:bg-slate-100 transition-colors cursor-pointer">
                  รหัสรายการ <SortIcon column="id" sortConfig={sortConfig} />
                </th>
                <th onClick={() => handleSort('name')} className="py-4 px-6 font-semibold text-slate-600 text-sm hover:bg-slate-100 transition-colors cursor-pointer">
                  ชื่อสมาชิก <SortIcon column="name" sortConfig={sortConfig} />
                </th>
                <th className="py-4 px-6 font-semibold text-slate-600 text-sm hover:bg-slate-100 transition-colors">
                  ชื่อรายการ
                </th>
                <th onClick={() => handleSort('amount')} className="py-4 px-6 font-semibold text-slate-600 text-sm text-right hover:bg-slate-100 transition-colors cursor-pointer">
                  จำนวนเงิน <SortIcon column="amount" sortConfig={sortConfig} />
                </th>
                <th onClick={() => handleSort('date')} className="py-4 px-6 font-semibold text-slate-600 text-sm hover:bg-slate-100 transition-colors cursor-pointer">
                  วันที่แจ้ง <SortIcon column="date" sortConfig={sortConfig} />
                </th>
                <th onClick={() => handleSort('status')} className="py-4 px-6 font-semibold text-slate-600 text-sm text-center hover:bg-slate-100 transition-colors cursor-pointer">
                  สถานะ <SortIcon column="status" sortConfig={sortConfig} />
                </th>
                <th className="py-4 px-6 font-semibold text-slate-600 text-sm text-center">
                  จัดการ
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-0">
                    <TableSkeleton rows={5} cols={6} hasHeader={false} />
                  </td>
                </tr>
              ) : paginatedRepayments.length === 0 ? (
                <tr><td colSpan={6} className="py-12 text-center text-slate-400">ไม่พบรายการ...</td></tr>
              ) : (
                paginatedRepayments.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 even:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6 text-slate-700 font-medium whitespace-nowrap">
                      {item.id}
                    </td>
                    <td className="py-4 px-6 text-slate-600 font-medium">
                      {item.name}
                    </td>
                    <td className="py-4 px-6 text-slate-500 text-sm">
                      {item.itemName || "ชำระสินเชื่อ"}
                    </td>
                    <td className="py-4 px-6 text-right font-bold text-indigo-600">
                      {(item.amount || 0).toLocaleString()} ฿
                    </td>
                    <td className="py-4 px-6 text-slate-500 text-sm">
                      {formatDateTime(item.date)}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap gap-1 items-center ${item.status === "approved" ? "bg-emerald-100 text-emerald-700" :
                        item.status === "rejected" ? "bg-rose-100 text-rose-700" :
                          "bg-amber-100 text-amber-700"
                        }`}>
                        {item.status === "pending" ? "รอตรวจสลิป" : item.status === "approved" ? "รับชำระแล้ว" : "มีปัญหา"}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <button
                        onClick={() => openDetails(item)}
                        className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${item.status === "pending"
                          ? "bg-indigo-50 text-indigo-600 hover:bg-indigo-500 hover:text-white border border-indigo-100 shadow-sm"
                          : "bg-slate-50 text-slate-500 hover:bg-slate-200 border border-slate-200"
                          }`}
                      >
                        <Receipt size={16} />
                        {item.status === "pending" ? "ตรวจสลิป" : "ดูข้อมูล"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {!loading && filteredAndSortedRepayments.length > 0 && (
          <div className="bg-slate-50 border-t border-slate-100 p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              แสดง {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredAndSortedRepayments.length)} จากทั้งหมด {filteredAndSortedRepayments.length}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:bg-white hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
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
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                        : 'bg-white text-slate-500 border border-slate-100 hover:border-indigo-200 hover:text-indigo-600'}`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:bg-white hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal - Mobile-first Bottom Sheet */}
      {isModalOpen && selectedPay && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl shadow-2xl flex flex-col max-h-[95svh] sm:max-h-[90vh] overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Handle bar for mobile */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 bg-slate-300 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-base text-slate-800">บันทึกรับชำระค่างวด</h3>
                <p className="text-xs text-slate-500 mt-0.5">{selectedPay.id}</p>
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
              {/* Member Info */}
              <div className="px-5 pt-4 pb-3 bg-slate-50 border-b border-slate-100">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-slate-500">ผู้ชำระ</p>
                    <p className="font-bold text-slate-800 text-sm mt-0.5">
                      {selectedPay.name}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">{formatDateTime(selectedPay.date)}</p>
                  </div>
                  <span className={`shrink-0 inline-flex px-3 py-1 rounded-full text-xs font-bold ${selectedPay.status === "pending"
                    ? "bg-amber-100 text-amber-700"
                    : selectedPay.status === "approved"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-rose-100 text-rose-700"
                    }`}>
                    {selectedPay.status === "pending" ? "รอตรวจสอบ" : selectedPay.status === "approved" ? "รับชำระแล้ว" : "มีปัญหา"}
                  </span>
                </div>
              </div>

              {/* Slip Image */}
              <div className="px-5 pt-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">รูปสลิป</p>
                <div className="bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 flex justify-center items-center min-h-[220px] relative">
                  {selectedPay.slipUrl ? (
                    <div
                      className="cursor-zoom-in relative group"
                      onClick={() => setIsZoomOpen(true)}
                    >
                      <Image
                        src={getDriveImageUrl(selectedPay.slipUrl)}
                        alt="Slip"
                        width={500}
                        height={800}
                        className="w-full h-auto max-h-[60svh] object-contain rounded-lg border border-slate-200 shadow-sm transition-transform duration-300 group-hover:scale-[1.02]"
                        unoptimized
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = "https://placehold.co/400x600?text=Invalid+Image";
                        }}
                      />
                    </div>
                  ) : (
                    <p className="text-slate-400 text-sm py-8">ไม่พบรูปสลิป</p>
                  )}
                </div>
                <button
                  onClick={() => window.open(selectedPay.slipUrl, '_blank')}
                  className="mt-2 w-full text-xs text-indigo-600 font-bold flex items-center gap-1 justify-center py-2 hover:bg-indigo-50 rounded-lg transition-colors"
                >
                  <ExternalLink size={12} /> เปิดดูรูปต้นฉบับ
                </button>
              </div>

              {/* Contract Selection & Amount */}
              <div className="px-5 pt-4 pb-2 space-y-4">
                {selectedPay.status === "pending" ? (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">เลือกสัญญาที่ต้องการตัดยอด</label>
                      {memberActiveContracts.length > 0 ? (
                        <select
                          value={selectedContractId}
                          onChange={(e) => setSelectedContractId(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                        >
                          <option value="">-- โปรดเลือกสัญญา --</option>
                          {memberActiveContracts.map(c => (
                            <option key={c.id} value={c.id}>
                              {c.id} - ({c.type}) คงเหลือ {c.balance.toLocaleString()} ฿
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="p-4 bg-amber-50 text-amber-600 rounded-xl border border-amber-100 text-sm flex gap-2">
                          <AlertCircle size={18} /> ไม่พบสัญญาที่กำลังผ่อนอยู่ของสมาชิกรายนี้
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">ยอดเงินชำระ (แก้ไขได้)</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-lg">฿</span>
                        <NumericFormat
                          thousandSeparator={true}
                          inputMode="decimal"
                          value={editAmount}
                          onValueChange={(values) => {
                            setEditAmount(values.floatValue || 0);
                          }}
                          className="w-full text-3xl font-black text-indigo-600 bg-white border-2 border-indigo-200 rounded-2xl pl-10 pr-4 py-3.5 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-right"
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">ยอดเงินชำระ</p>
                      <p className="text-3xl font-black text-indigo-600">฿{(selectedPay.amount || 0).toLocaleString()}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="h-4" />
            </div>

            {/* Sticky Action Buttons */}
            <div className="p-4 border-t border-slate-100 bg-white">
              {selectedPay.status === "pending" ? (
                <div className="flex gap-2">
                  <button
                    disabled={isUpdating}
                    onClick={handleReject}
                    className="cursor-pointer flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-2xl transition-all disabled:opacity-50 active:scale-95"
                  >
                    {isUpdating ? <Loader2 size={18} className="animate-spin" /> : <XCircle size={18} />} ปฏิเสธ
                  </button>
                  <button
                    disabled={isUpdating || !selectedContractId}
                    onClick={handleApprove}
                    className="cursor-pointer flex-2 flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-2xl transition-all shadow-sm shadow-indigo-100 disabled:opacity-50 active:scale-95"
                  >
                    {isUpdating ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />} อนุมัติยอด
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-full py-3.5 text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  ปิดหน้าต่าง
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 🔍 Zoom Modal (Lightbox) */}
      {isZoomOpen && selectedPay && (
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center bg-black/90 backdrop-blur-md transition-all duration-300 animate-in fade-in"
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
            className="relative max-w-[95vw] max-h-[90vh] w-auto h-auto transition-transform duration-500 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={getDriveImageUrl(selectedPay.slipUrl)}
              alt="Zoomed Slip"
              className="w-auto h-auto max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl border border-white/10"
            />
          </div>
        </div>
      )}
    </div>
  );
}
