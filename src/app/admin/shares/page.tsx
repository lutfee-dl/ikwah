"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Search,
  Download,
  Users,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  Activity,
  ChevronLeft,
  ChevronRight,
  Landmark,
  RefreshCw,
  BookOpen,
  Edit3,
  CalendarDays,
  BarChart3,
  RotateCw,
  RefreshCcw,
} from "lucide-react";
import { formatDate, formatCurrency as fmt } from "@/lib/utils";
import Link from "next/link";
import HistoricalEditModal from "./HistoricalEditModal";
import { toast } from "react-hot-toast";
import Swal from "sweetalert2";

import { TableSkeleton } from "@/components/ui/TableSkeleton";

const API_URL = "/api/member";

export type ShareRow = {
  ID_No: string;
  lineId?: string;
  lineName?: string;
  pictureUrl?: string;
  idCard?: string;
  prefix?: string;
  ชื่อ: string;
  Phone?: string;
  รวมยอดทั้งหมด: number;
  สถานะ: string;
  ถอนเงิน: number;
  รวมเงินคงเหลือ: number;
  รวมยอดหุ้นสุทธิ?: number;
  totalLoanDebt?: number;
  [key: string]: any;
};

export type HistoricalForm = { [year: string]: number };

type ShareStats = {
  totalFund: number;
  selectedYear: number;
  thaiYear: number;
  memberCount: number;
  activeCount: number;
};

type SortConfig = { key: string; direction: "asc" | "desc" };

export const thaiMonths = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
];

// สร้างรายการปีแบบ Dynamic
const currentYear = new Date().getFullYear();
const currentThaiYear = currentYear + 543;
const startThaiYear = 2565;
const dynamicThaiYears: string[] = [];
const dynamicFullThaiYears: Record<string, string> = {};

for (let y = startThaiYear; y <= Math.max(currentThaiYear, 2569); y++) {
  const shortYear = `ปี${String(y).slice(-2)}`;
  dynamicThaiYears.push(shortYear);
  dynamicFullThaiYears[shortYear] = String(y);
}

interface TableColumn {
  key: string;
  label: string;
  sticky?: string;
  z?: string;
  minW?: string;
  align?: "left" | "right" | "center";
  type?: string;
  border?: boolean;
  color?: string;
  bg?: string;
}

export default function AdminSharesPage() {
  const [data, setData] = useState<ShareRow[]>([]);
  const [stats, setStats] = useState<ShareStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "ID_No",
    direction: "asc",
  });
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [fiscalYear, setFiscalYear] = useState(new Date().getFullYear());
  const [editingHistorical, setEditingHistorical] = useState<ShareRow | null>(
    null,
  );
  const [histForm, setHistForm] = useState<HistoricalForm>({});
  const [savingHist, setSavingHist] = useState(false);
  const [rebuilding, setRebuilding] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [viewMode, setViewMode] = useState<"both" | "year" | "month">("both");
  const showYears = viewMode === "both" || viewMode === "year";
  const showMonths = viewMode === "both" || viewMode === "month";

  // Header Filters
  const [headerFilters, setHeaderFilters] = useState({
    ID_No: "",
    ชื่อ: "",
  });

  useEffect(() => {
    fetchShares();
  }, [fiscalYear]);
  useEffect(() => {
    setPage(1);
  }, [search, perPage, viewMode]);

  const fetchShares = async () => {
    setLoading(true);
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "admin_get_shares_report",
          ADMIN_SECRET: process.env.NEXT_PUBLIC_ADMIN_SECRET,
          options: { year: fiscalYear },
        }),
      });
      const result = await res.json();

      if (result.success && result.data) {
        setData(result.data);
      } else {
        toast.error(result.msg || "ไม่สามารถดึงข้อมูลได้");
      }
    } catch (err) {
      console.error("❌ Fetch Shares Error:", err);
      toast.error("การเชื่อมต่อล้มเหลว");
    } finally {
      setLoading(false);
    }
  };

  const yearColumns = useMemo(() => {
    if (!data.length) return dynamicThaiYears;
    const keys = Object.keys(data[0]).filter((k) => k.startsWith("ปี"));
    return keys;
  }, [data]);

  // --- Dynamic Column Configuration ---
  const tableColumns = useMemo<TableColumn[]>(() => {
    const cols: TableColumn[] = [
      { key: "ID_No", label: "รหัส", sticky: "left-0", z: "z-30", minW: "80px", align: "left", type: "id" },
      { key: "ชื่อ", label: "ชื่อ-นามสกุล", sticky: "left-[80px]", z: "z-30", minW: "250px", align: "left", type: "name", border: true },
      { key: "รวมเงินคงเหลือ", label: "คงเหลือ", align: "right", minW: "120px", type: "currency" },
      { key: "ถอนเงิน", label: "ถอน", align: "right", minW: "110px", type: "currency", border: true },
    ];

    if (showMonths) {
      thaiMonths.forEach(m => {
        cols.push({ key: m, label: m, align: "right", minW: "80px", type: "currency", color: "text-blue-600" });
      });
      cols.push({ key: "รวมยอดหุ้นสุทธิ", label: "รวมยอดหุ้นสุทธิ", align: "right", minW: "140px", type: "currency", color: "text-emerald-600", bg: "bg-emerald-50", border: true });
    }

    if (showYears) {
      yearColumns.forEach(y => {
        cols.push({ key: y, label: y, align: "right", minW: "110px", type: "currency", color: "text-amber-600" });
      });
    }

    return cols;
  }, [showMonths, showYears, yearColumns]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return data
      .filter((r) => {
        // Global Search
        const matchGlobal =
          String(r["ชื่อ"] || "")
            .toLowerCase()
            .includes(q) ||
          String(r.ID_No || "")
            .toLowerCase()
            .includes(q) ||
          String(r.Phone || "").includes(q);

        // Header Filters
        const matchID = String(r.ID_No || "")
          .toLowerCase()
          .includes(headerFilters.ID_No.toLowerCase());
        const matchName = String(r["ชื่อ"] || "")
          .toLowerCase()
          .includes(headerFilters["ชื่อ"].toLowerCase());

        return matchGlobal && matchID && matchName;
      })
      .sort((a, b) => {
        const av = a[sortConfig.key] || 0;
        const bv = b[sortConfig.key] || 0;

        // Handle ID_No specifically if it's alphanumeric
        if (sortConfig.key === "ID_No") {
          return sortConfig.direction === "asc"
            ? av.localeCompare(bv, undefined, {
              numeric: true,
              sensitivity: "base",
            })
            : bv.localeCompare(av, undefined, {
              numeric: true,
              sensitivity: "base",
            });
        }

        return sortConfig.direction === "asc"
          ? av < bv
            ? -1
            : 1
          : av > bv
            ? -1
            : 1;
      });
  }, [data, search, sortConfig, headerFilters]);

  const handleRebuild = async () => {
    const result = await Swal.fire({
      title: 'เริ่มการจัดระเบียบตาราง?',
      text: "ระบบจะล้างตารางสรุปและสร้างใหม่จากข้อมูลธุรกรรมจริงเพื่อให้ข้อมูลตรงกันที่สุด",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'เริ่มจัดระเบียบ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#2563eb',
    });

    if (!result.isConfirmed) return;

    setRebuilding(true);
    setLoading(true);
    const toastId = toast.loading("กำลังจัดระเบียบตารางใน Google Sheets...", { id: "shares-rebuild" });
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "admin_rebuild_summary",
          ADMIN_SECRET: process.env.NEXT_PUBLIC_ADMIN_SECRET,
        }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success("จัดระเบียบตารางใหม่เรียบร้อยแล้ว ✅", { id: toastId });
        await fetchShares();
      } else {
        toast.error(result.msg || "เกิดข้อผิดพลาด", { id: toastId });
      }
    } catch (err) {
      toast.error("การเชื่อมต่อผิดพลาด", { id: toastId });
    } finally {
      setLoading(false);
      setRebuilding(false);
    }
  };

  const handleRecalculateAll = async () => {
    const result = await Swal.fire({
      title: 'คำนวณยอดหุ้นใหม่ทั้งหมด?',
      text: "ระบบจะตรวจสอบทุกรายการฝาก/ถอนเพื่อให้ยอดสะสมถูกต้องที่สุด (อาจใช้เวลาสักครู่)",
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'เริ่มคำนวณใหม่',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#6366f1', // indigo-600
    });

    if (!result.isConfirmed) return;

    setRecalculating(true);
    setLoading(true);
    const toastId = toast.loading("กำลังคำนวณยอดหุ้นสะสมใหม่...", { id: "shares-recalc" });
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "admin_recalculate_all_shares",
          ADMIN_SECRET: process.env.NEXT_PUBLIC_ADMIN_SECRET,
        }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success(result.msg || "คำนวณยอดใหม่เรียบร้อยแล้ว ✅", { id: toastId });
        await fetchShares();
      } else {
        toast.error(result.msg || "เกิดข้อผิดพลาด", { id: toastId });
      }
    } catch (err) {
      toast.error("การเชื่อมต่อผิดพลาด", { id: toastId });
    } finally {
      setLoading(false);
      setRecalculating(false);
    }
  };

  const totalPages = Math.ceil(filtered.length / perPage);
  const displayed = filtered.slice((page - 1) * perPage, page * perPage);

  const sort = (key: string) =>
    setSortConfig((p) => ({
      key,
      direction: p.key === key && p.direction === "asc" ? "desc" : "asc",
    }));

  const exportCSV = () => {
    if (!data.length) return;

    // เรียงคอลัมน์ใหม่ให้ถูกต้องตามฟอร์แมตที่ต้องการ
    const headers = [
      "รหัสสมาชิก",
      "LINE_ID",
      "ชื่อ-นามสกุล",
      "สถานะ",
      "รวมเงินคงเหลือ",
      "ถอนเงิน",
      ...thaiMonths, // ม.ค. ถึง ธ.ค.
      "รวมยอดหุ้นสุทธิ",
      ...yearColumns, // แถวที่เป็นปีทั้งหมด (ปี 65, ปี 66...)
    ];

    const csv = [
      headers.join(","),
      ...data.map((r) => {
        return [
          r.ID_No || "",
          r.lineId || "",
          r["ชื่อ"] || "",
          r.สถานะ || "",
          r.รวมเงินคงเหลือ || 0,
          r.ถอนเงิน || 0,
          ...thaiMonths.map((m) => r[m] || 0),
          r.รวมยอดหุ้นสุทธิ || 0,
          ...yearColumns.map((y) => r[y] || 0),
        ]
          .map((v) => `"${v}"`)
          .join(",");
      }),
    ].join("\n");

    const a = document.createElement("a");
    a.href = URL.createObjectURL(
      new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }),
    );
    a.download = `หุ้นสะสม_${fiscalYear + 543}.csv`;
    a.click();
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (sortConfig.key !== col)
      return <ArrowUpDown size={11} className="inline ml-1 opacity-20" />;
    return sortConfig.direction === "asc" ? (
      <ArrowUp size={11} className="inline ml-1 text-blue-500" />
    ) : (
      <ArrowDown size={11} className="inline ml-1 text-blue-500" />
    );
  };

  const handleSaveHistorical = async () => {
    if (!editingHistorical) return;

    setSavingHist(true);
    const toastId = toast.loading("กำลังบันทึกข้อมูลประวัติหุ้น...");
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "admin_update_historical_shares",
          ADMIN_SECRET: process.env.NEXT_PUBLIC_ADMIN_SECRET,
          payload: {
            memberId: editingHistorical.ID_No,
            lineId: editingHistorical.lineId, // ส่ง LINE_ID ไปเช็คด้วย
            years: histForm,
          },
        }),
      });

      const result = await res.json();

      if (result.success) {
        setEditingHistorical(null);
        toast.success("บันทึกข้อมูลเรียบร้อยแล้ว ✅", { id: toastId });
        await fetchShares();
      } else {
        toast.error(result.msg || "เกิดข้อผิดพลาดในการบันทึกข้อมูล", { id: toastId });
      }
    } catch (err) {
      console.error("Save Historical Error:", err);
      toast.error("ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้", { id: toastId });
    } finally {
      setSavingHist(false);
    }
  };

  const exportToCSV = () => {
    if (data.length === 0) return;
    const dynamicYears = Object.keys(data[0]).filter(k => k.startsWith("ปี"));
    const headers = ["รหัสสมาชิก", "ชื่อ-นามสกุล", "สถานะ", "รวมคงเหลือ", "ถอน", ...thaiMonths, ...dynamicYears].join(",");

    const rows = data.map(r => {
      const rowData = [
        r.ID_No,
        `"${r.prefix || ""}${r["ชื่อ"]}"`,
        r["สถานะ"],
        r["รวมเงินคงเหลือ"] || 0,
        r["ถอนเงิน"] || 0,
        ...thaiMonths.map(m => r[m] || 0),
        ...dynamicYears.map(y => r[y] || 0)
      ];
      return rowData.join(",");
    });

    const csvContent = "\uFEFF" + [headers, ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `IKWAH_Shares_Report_${fiscalYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 animate-[fadeIn_0.5s] pb-10">
      {/* ── KPI Strip ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          {
            label: "มูลค่าหุ้นรวมสุทธิ",
            value: `฿ ${fmt(stats?.totalFund)}`,
            sub: "ยอดรวมทั้งระบบ",
            icon: Landmark,
            gradient: "from-blue-600 to-indigo-600",
            accent: "blue",
          },
          {
            label: "สมาชิกทั้งหมด",
            value: `${stats?.memberCount || 0} คน`,
            sub: "ทะเบียนสมาชิก",
            icon: Users,
            gradient: "from-slate-700 to-slate-900",
            accent: "slate",
          },
          {
            label: "สมาชิกปกติ",
            value: `${stats?.activeCount || 0} คน`,
            sub: "Active Users",
            icon: Activity,
            gradient: "from-emerald-600 to-teal-500",
            accent: "emerald",
          },
          {
            label: "ปีงบประมาณ",
            value: `พ.ศ. ${fiscalYear + 543}`,
            sub: `Fiscal Year ${fiscalYear}`,
            icon: CalendarDays,
            gradient: "from-amber-500 to-orange-500",
            accent: "amber",
          },
        ].map((kpi, i) => (
          <div
            key={i}
            className="group bg-white rounded-[2rem] p-6 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 border border-slate-100 transition-all duration-500 flex items-center gap-5 overflow-hidden relative"
          >
            <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${kpi.gradient} opacity-[0.03] rounded-full -mr-8 -mt-8`}></div>
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-500
              ${kpi.accent === "blue" ? "bg-blue-600 text-white shadow-blue-600/20" :
                  kpi.accent === "emerald" ? "bg-emerald-500 text-white shadow-emerald-500/20" :
                    kpi.accent === "amber" ? "bg-amber-500 text-white shadow-amber-500/20" :
                      "bg-slate-800 text-white shadow-slate-800/20"}`}
            >
              <kpi.icon size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">
                {kpi.label}
              </p>
              <p className="text-xl font-black text-slate-900 tracking-tight">
                {kpi.value}
              </p>
              <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                {kpi.sub}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Main Content Container ── */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/40 overflow-hidden flex flex-col">
        {/* ── Enhanced Toolbar ── */}
        <div className="px-8 py-6 border-b border-slate-100 flex flex-col xl:flex-row items-start xl:items-center gap-6 justify-between bg-white">
          <div className="flex flex-col sm:flex-row gap-4 w-full xl:max-w-3xl">
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 flex-1 focus-within:ring-4 focus-within:ring-blue-100 focus-within:bg-white transition-all shadow-inner">
              <Search size={18} className="text-slate-400" />
              <input
                type="text"
                placeholder="ค้นหาชื่อ / รหัสสมาชิก / เบอร์โทร..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-transparent outline-none text-sm text-slate-700 w-full placeholder:text-slate-400 font-bold"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={perPage}
                onChange={(e) => setPerPage(Number(e.target.value))}
                className="cursor-pointer bg-white border border-slate-200 rounded-2xl px-4 py-3 text-[12px] font-black text-slate-600 focus:outline-none hover:bg-slate-50 transition-colors shadow-sm"
              >
                {[10, 25, 50, 100].map((v) => (
                  <option key={v} value={v}>{v} / Page</option>
                ))}
              </select>

              <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <button
                  onClick={() => setFiscalYear((v) => v - 1)}
                  className="p-3 hover:bg-slate-200 text-slate-500 border-r border-slate-200 transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="px-5 text-[12px] font-black text-slate-700">
                  พ.ศ. {fiscalYear + 543}
                </span>
                <button
                  onClick={() => setFiscalYear((v) => v + 1)}
                  className="p-3 hover:bg-slate-200 text-slate-500 border-l border-slate-200 transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto justify-end">
            <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 shadow-inner">
              {(["both", "year", "month"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setViewMode(v)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === v ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                >
                  {v === "both" ? "All" : v === "year" ? "Yearly" : "Monthly"}
                </button>
              ))}
            </div>

            <div className="h-8 w-[1px] bg-slate-200 mx-1 hidden sm:block" />

            <div className="flex gap-2">
              <button
                onClick={handleRecalculateAll}
                disabled={recalculating}
                className="group p-3 bg-white border border-slate-200 text-slate-600 rounded-2xl hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-100 transition-all shadow-sm disabled:opacity-50"
                title="Recalculate All"
              >
                <RotateCw size={18} className={recalculating ? "animate-spin" : "group-hover:rotate-180 transition-transform duration-500"} />
              </button>

              <button
                onClick={handleRebuild}
                disabled={rebuilding}
                className="group p-3 bg-white border border-slate-200 text-slate-600 rounded-2xl hover:bg-blue-50 hover:text-blue-600 hover:border-blue-100 transition-all shadow-sm disabled:opacity-50"
                title="Rebuild Matrix"
              >
                <RefreshCcw size={18} className={rebuilding ? "animate-spin" : "group-hover:rotate-180 transition-transform duration-500"} />
              </button>

              <button
                onClick={exportToCSV}
                disabled={loading || data.length === 0}
                className="flex items-center gap-2 px-5 py-3 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 transition-all font-black text-[11px] uppercase tracking-widest shadow-lg shadow-emerald-600/20 disabled:opacity-50"
              >
                <Download size={16} />
                <span className="hidden sm:inline">Export</span>
              </button>

              <button
                onClick={fetchShares}
                disabled={loading}
                className="px-5 py-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all font-black text-[11px] uppercase tracking-widest shadow-lg shadow-blue-600/20 flex items-center gap-2"
              >
                <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── Optimized Table Area ── */}
        <div className="overflow-x-auto relative no-scrollbar">
          <table
            className="w-full text-sm border-collapse table-auto whitespace-nowrap"
            style={{ minWidth: showYears && showMonths ? "1600px" : "1000px" }}
          >
            <thead>
              <tr className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-[0.3em]">
                <th
                  colSpan={2}
                  className="sticky left-0 z-40 bg-slate-900 py-4 px-8 text-left border-r border-slate-800"
                >
                  Member Information
                </th>
                <th
                  colSpan={2}
                  className="py-4 px-6 text-right border-r border-slate-800 bg-slate-800/50"
                >
                  Balances
                </th>
                {showMonths && (
                  <th
                    colSpan={13}
                    className="py-4 px-6 text-center bg-blue-600/10 text-blue-400 border-r border-slate-800"
                  >
                    <span className="flex items-center justify-center gap-2">
                      <CalendarDays size={14} /> Monthly Contributions {fiscalYear + 543}
                    </span>
                  </th>
                )}
                {showYears && (
                  <th
                    colSpan={yearColumns.length}
                    className="py-4 px-6 text-center border-r border-slate-800 bg-amber-600/10 text-amber-500"
                  >
                    <span className="flex items-center justify-center gap-2">
                      <BarChart3 size={14} /> Historical Data
                    </span>
                  </th>
                )}
                <th className="py-4 px-6 text-center sticky right-0 z-40 bg-slate-900 border-l border-slate-800">
                  Manage
                </th>
              </tr>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                {tableColumns.map((col) => (
                  <th
                    key={col.key}
                    className={`py-4 px-6 ${col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"} 
                      ${col.sticky ? `sticky ${col.sticky} ${col.z || "z-30"} bg-slate-50` : ""} 
                      ${col.border ? "border-r border-slate-200" : "border-r border-slate-100"}
                      cursor-pointer hover:bg-white hover:text-blue-600 transition-all`}
                    onClick={() => sort(col.key)}
                  >
                    <div className={`flex items-center gap-1.5 ${col.align === "right" ? "justify-end" : col.align === "center" ? "justify-center" : ""}`}>
                      <span className={col.color}>{col.label}</span>
                      <SortIcon col={col.key} />
                    </div>
                  </th>
                ))}
                <th className="py-4 px-6 text-center sticky right-0 z-30 bg-slate-50 min-w-[150px] border-l border-slate-200 shadow-[-10px_0_15px_rgba(0,0,0,0.02)]">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={50} className="p-0">
                    <TableSkeleton rows={8} cols={10} hasHeader={false} />
                  </td>
                </tr>
              ) : displayed.length === 0 ? (
                <tr>
                  <td colSpan={50} className="py-32 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                        <Users size={32} />
                      </div>
                      <p className="text-slate-400 font-bold text-base tracking-tight">ไม่พบข้อมูลสมาชิกที่ค้นหา</p>
                    </div>
                  </td>
                </tr>
              ) : (
                displayed.map((row, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-blue-50/30 even:bg-slate-50/30 transition-all group"
                  >
                    {tableColumns.map((col) => (
                      <td
                        key={col.key}
                        className={`py-5 px-6 ${col.align === "right" ? "text-right" : "text-left"} 
                          ${col.sticky ? `sticky ${col.sticky} ${col.z || "z-20"} bg-white group-hover:bg-blue-50/50 transition-all border-r border-slate-100` : "border-r border-slate-50"} 
                          ${col.bg ? col.bg : ""} 
                          ${col.type === "currency" ? "tabular-nums" : ""}`}
                      >
                        {col.type === "id" && (
                          <span className="font-black text-slate-900 text-xs bg-slate-100 px-2 py-1 rounded-lg border border-slate-200">{row[col.key]}</span>
                        )}
                        {col.type === "name" && (
                          <div className="flex flex-col">
                            <p className="font-black text-slate-800 text-[14px] tracking-tight">{row["ชื่อ"]}</p>
                            <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">{row.Phone || "No Contact"}</p>
                          </div>
                        )}
                        {col.type === "currency" && (
                          <span className={`font-black ${col.color || "text-slate-700"} ${col.key === "รวมเงินคงเหลือ" ? "text-base text-blue-600" : "text-[13px]"}`}>
                            {Number(row[col.key]) > 0 ? fmt(Number(row[col.key])) : "—"}
                          </span>
                        )}
                      </td>
                    ))}
                    <td className="py-5 px-6 text-center sticky right-0 z-20 bg-white group-hover:bg-blue-50/50 border-l border-slate-200 shadow-[-15px_0_25px_rgba(0,0,0,0.03)] transition-all">
                      <div className="flex gap-2 justify-center">
                        <Link
                          href={`/admin/shares/${row.ID_No}`}
                          className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm border border-blue-100"
                          title="View Details"
                        >
                          <BookOpen size={16} />
                        </Link>
                        <button
                          onClick={() => {
                            setEditingHistorical(row);
                            const initialForm: HistoricalForm = {};
                            yearColumns.forEach((y) => {
                              const yearMatch = y.match(/\d+/);
                              if (yearMatch) {
                                const fullYear = "25" + yearMatch[0];
                                initialForm[fullYear] = Number(row[y] as number) || 0;
                              }
                            });
                            setHistForm(initialForm);
                          }}
                          className="p-2.5 bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-600 hover:text-white transition-all shadow-sm border border-amber-100"
                          title="Edit History"
                        >
                          <Edit3 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Premium Pagination ── */}
        <div className="px-8 py-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-6 bg-slate-50/30">
          <p className="text-xs text-slate-500 font-black uppercase tracking-widest">
            Showing <span className="text-slate-900 bg-white px-2 py-1 rounded-lg border border-slate-200">{Math.min(filtered.length, (page - 1) * perPage + 1)}</span>
            to <span className="text-slate-900 bg-white px-2 py-1 rounded-lg border border-slate-200">{Math.min(page * perPage, filtered.length)}</span>
            of <span className="text-blue-600 bg-blue-50 px-3 py-1 rounded-lg border border-blue-100">{filtered.length}</span> Members
          </p>

          <div className="flex items-center gap-3">
            <button
              disabled={page === 1}
              onClick={() => setPage(1)}
              className="p-3 rounded-xl border border-slate-200 bg-white text-slate-400 hover:text-blue-600 hover:border-blue-200 disabled:opacity-30 transition-all shadow-sm"
            >
              <ChevronLeft size={18} className="double-icon" />
            </button>
            <div className="flex items-center px-6 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-black text-slate-800 shadow-sm">
              Page {page} <span className="mx-2 text-slate-300">/</span> {totalPages || 1}
            </div>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="p-3 rounded-xl border border-slate-200 bg-white text-slate-400 hover:text-blue-600 hover:border-blue-200 disabled:opacity-30 transition-all shadow-sm"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {editingHistorical && (
        <HistoricalEditModal
          member={editingHistorical}
          histForm={histForm}
          saving={savingHist}
          onSave={handleSaveHistorical}
          onFormChange={setHistForm}
          onClose={() => setEditingHistorical(null)}
        />
      )}

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .tabular-nums { font-variant-numeric: tabular-nums; }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
