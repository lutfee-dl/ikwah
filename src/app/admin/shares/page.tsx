"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Search, Download, Users, ArrowUpDown, ArrowUp, ArrowDown,
  Printer, X, Activity, TrendingUp, ChevronLeft, ChevronRight,
  Landmark, ShieldCheck, PieChart, RefreshCw, BookOpen, Edit3,
  CalendarDays, BarChart3,
} from "lucide-react";
import { formatDate, formatCurrency as fmt } from "@/lib/utils";
import Link from "next/link";
import HistoricalEditModal from "./HistoricalEditModal";
import { toast } from "react-hot-toast";


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
  totalLoanDebt?: number;
  [key: string]: unknown;
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

export const thaiMonths = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

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

export default function AdminSharesPage() {
  const [data, setData] = useState<ShareRow[]>([]);
  const [stats, setStats] = useState<ShareStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: "ID_No", direction: "asc" });
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [fiscalYear, setFiscalYear] = useState(new Date().getFullYear());
  const [editingHistorical, setEditingHistorical] = useState<ShareRow | null>(null);
  const [histForm, setHistForm] = useState<HistoricalForm>({});
  const [savingHist, setSavingHist] = useState(false);
  const [viewMode, setViewMode] = useState<"both" | "year" | "month">("both");

  // Header Filters
  const [headerFilters, setHeaderFilters] = useState({
    ID_No: "",
    "ชื่อ": "",
  });

  useEffect(() => { fetchShares(); }, [fiscalYear]);
  useEffect(() => { setPage(1); }, [search, perPage, viewMode]);

  const fetchShares = async () => {
    setLoading(true);
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "admin_get_shares_report",
          ADMIN_SECRET: process.env.NEXT_PUBLIC_ADMIN_SECRET,
          options: { year: fiscalYear }
        }),
      });
      const result = await res.json();
      if (result.success) {
        setData(result.data);
        setStats(result.stats);
      }
    } catch (err) {
      console.error("Fetch Shares Error:", err);
    } finally { setLoading(false); }
  };

  const yearColumns = useMemo(() => {
    if (!data.length) return dynamicThaiYears;
    return Object.keys(data[0]).filter(k => k.startsWith("ปี")).sort();
  }, [data]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return data
      .filter(r => {
        // Global Search
        const matchGlobal =
          String(r["ชื่อ"] || "").toLowerCase().includes(q) ||
          String(r.ID_No || "").toLowerCase().includes(q) ||
          String(r.Phone || "").includes(q);

        // Header Filters
        const matchID = String(r.ID_No || "").toLowerCase().includes(headerFilters.ID_No.toLowerCase());
        const matchName = String(r["ชื่อ"] || "").toLowerCase().includes(headerFilters["ชื่อ"].toLowerCase());

        return matchGlobal && matchID && matchName;
      })
      .sort((a, b) => {
        const av = a[sortConfig.key] as any || 0;
        const bv = b[sortConfig.key] as any || 0;

        // Handle ID_No specifically if it's alphanumeric
        if (sortConfig.key === "ID_No") {
          return sortConfig.direction === "asc"
            ? av.localeCompare(bv, undefined, { numeric: true, sensitivity: 'base' })
            : bv.localeCompare(av, undefined, { numeric: true, sensitivity: 'base' });
        }

        return sortConfig.direction === "asc" ? (av < bv ? -1 : 1) : (av > bv ? -1 : 1);
      });
  }, [data, search, sortConfig, headerFilters]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const displayed = filtered.slice((page - 1) * perPage, page * perPage);

  const sort = (key: string) =>
    setSortConfig(p => ({ key, direction: p.key === key && p.direction === "asc" ? "desc" : "asc" }));

  const exportCSV = () => {
    if (!data.length) return;
    const headers = Object.keys(data[0]);
    const csv = [headers.join(","), ...data.map(r => headers.map(h => `"${r[h] || 0}"`).join(","))].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }));
    a.download = `หุ้นสะสม_${fiscalYear + 543}.csv`;
    a.click();
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (sortConfig.key !== col) return <ArrowUpDown size={11} className="inline ml-1 opacity-20" />;
    return sortConfig.direction === "asc"
      ? <ArrowUp size={11} className="inline ml-1 text-blue-500" />
      : <ArrowDown size={11} className="inline ml-1 text-blue-500" />;
  };

  const showYears = viewMode === "both" || viewMode === "year";
  const showMonths = viewMode === "both" || viewMode === "month";

  const handleSaveHistorical = async () => {
    if (!editingHistorical) return;

    setSavingHist(true);
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "admin_update_historical_shares",
          ADMIN_SECRET: process.env.NEXT_PUBLIC_ADMIN_SECRET,
          payload: { memberId: editingHistorical.ID_No, years: histForm }
        }),
      });

      const result = await res.json();

      if (result.success) {
        setEditingHistorical(null);
        toast.success("บันทึกข้อมูลเรียบร้อยแล้ว");
        await fetchShares();
      } else {
        toast.error(result.msg || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
      }
    } catch (err) {
      console.error("Save Historical Error:", err);
      toast.error("ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้");
    } finally {
      setSavingHist(false);
    }
  };


  return (
    <div className="space-y-6 font-sans pb-10">

      {/* ── KPI Strip ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "มูลค่าหุ้นรวมสุทธิ", value: `฿ ${fmt(stats?.totalFund)}`, sub: "ยอดรวมในระบบ", icon: Landmark, accent: "blue" },
          { label: "สมาชิกทั้งหมด", value: `${stats?.memberCount || 0} คน`, sub: "ทะเบียนสมาชิก", icon: Users, accent: "slate" },
          { label: "สมาชิกสถานะปกติ", value: `${stats?.activeCount || 0} คน`, sub: "Active Users", icon: Activity, accent: "emerald" },
          { label: "ปีงบประมาณ", value: `พ.ศ. ${fiscalYear + 543}`, sub: `ค.ศ. ${fiscalYear}`, icon: CalendarDays, accent: "amber" },
        ].map((kpi, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-start gap-4">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 
              ${kpi.accent === "blue" ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                : kpi.accent === "emerald" ? "bg-emerald-50 text-emerald-600"
                  : kpi.accent === "amber" ? "bg-amber-50 text-amber-600"
                    : "bg-slate-100 text-slate-500"}`}>
              <kpi.icon size={21} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{kpi.label}</p>
              <p className="text-xl font-black text-slate-900 tracking-tight mt-1">{kpi.value}</p>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">{kpi.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Main Content Container ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

        {/* ── Toolbar ── */}
        <div className="px-6 py-4 border-b border-slate-100 flex flex-col xl:flex-row items-start xl:items-center gap-4 justify-between bg-white">
          <div className="flex flex-col sm:flex-row gap-3 w-full xl:max-w-2xl">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 flex-1 focus-within:ring-4 focus-within:ring-blue-100 transition-all">
              <Search size={15} className="text-slate-400" />
              <input
                type="text"
                placeholder="ค้นหาชื่อ / รหัสสมาชิก / เบอร์โทร..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="bg-transparent outline-none text-sm text-slate-700 w-full placeholder:text-slate-400 font-medium"
              />
            </div>
            <select
              value={perPage}
              onChange={(e) => setPerPage(Number(e.target.value))}
              className="cursor-pointer bg-white border border-slate-200 rounded-xl px-3 py-2 text-[12px] font-bold text-slate-600 focus:outline-none"
            >
              {[10, 25, 50, 100].map(v => <option key={v} value={v}>{v} / หน้า</option>)}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto justify-end">
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
              <button onClick={() => setFiscalYear(v => v - 1)} className="p-2.5 hover:bg-slate-100 text-slate-500 border-r border-slate-200"><ChevronLeft size={15} /></button>
              <span className="px-4 text-[12px] font-black text-slate-700">พ.ศ. {fiscalYear + 543}</span>
              <button onClick={() => setFiscalYear(v => v + 1)} className="p-2.5 hover:bg-slate-100 text-slate-500 border-l border-slate-200"><ChevronRight size={15} /></button>
            </div>

            <div className="flex bg-slate-50 border border-slate-200 rounded-xl overflow-hidden text-[11px] font-black">
              {(["both", "year", "month"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setViewMode(v)}
                  className={`px-3 py-2.5 transition-all ${viewMode === v ? "bg-blue-600 text-white shadow" : "text-slate-500 hover:bg-slate-100"}`}
                >
                  {v === "both" ? "ทั้งหมด" : v === "year" ? "เฉพาะปี" : "เฉพาะเดือน"}
                </button>
              ))}
            </div>

            <button onClick={fetchShares} className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-blue-600 shadow-sm transition-all">
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            </button>
            <button onClick={exportCSV} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:border-blue-200 text-[11px] font-black shadow-sm transition-all">
              <Download size={14} /> CSV
            </button>
          </div>
        </div>

        {/* ── Table Area ── */}
        <div className="overflow-x-auto relative">
          <table className="w-full text-sm border-collapse table-auto whitespace-nowrap"
            style={{ minWidth: showYears && showMonths ? "1800px" : "1100px" }}>
            <thead>
              <tr className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest">
                <th colSpan={2} className="sticky left-0 z-40 bg-slate-900 py-3 px-6 text-left border-r border-slate-700">ข้อมูลสมาชิก</th>
                <th colSpan={2} className="py-3 px-4 text-right border-r border-slate-700">ยอดบัญชี</th>
                {showYears && (
                  <th colSpan={yearColumns.length} className="py-3 px-4 text-center border-r border-slate-700 bg-amber-900/60">
                    <span className="flex items-center justify-center gap-1.5 text-amber-100"><BarChart3 size={12} /> ยอดยกมา</span>
                  </th>
                )}
                {showMonths && (
                  <th colSpan={12} className="py-3 px-4 text-center bg-blue-900/60 text-blue-100">
                    <span className="flex items-center justify-center gap-1.5"><CalendarDays size={12} /> ยอดฝากรายเดือน {fiscalYear + 543}</span>
                  </th>
                )}
                <th className="py-3 px-4 text-center sticky right-0 z-40 bg-slate-900">จัดการ</th>
              </tr>
              <tr className="bg-slate-50 border-b-2 border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                <th
                  className="sticky left-0 z-30 bg-slate-50 py-3 px-6 text-left min-w-[100px] cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => sort("ID_No")}
                >
                  <div className="flex items-center gap-1">
                    รหัส <SortIcon col="ID_No" />
                  </div>
                </th>
                <th
                  className="sticky left-[100px] z-30 bg-slate-50 py-3 px-6 text-left min-w-[220px] border-r-2 border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => sort("ชื่อ")}
                >
                  <div className="flex items-center gap-1">
                    ชื่อ-นามสกุล <SortIcon col="ชื่อ" />
                  </div>
                </th>
                <th className="py-3 px-4 text-right min-w-[120px] cursor-pointer" onClick={() => sort("รวมเงินคงเหลือ")}>
                  คงเหลือ <SortIcon col="รวมเงินคงเหลือ" />
                </th>
                <th className="py-3 px-4 text-right min-w-[110px] border-r-2 border-slate-200 cursor-pointer" onClick={() => sort("ถอนเงิน")}>
                  ถอน <SortIcon col="ถอนเงิน" />
                </th>
                {showYears && yearColumns.map(y => (
                  <th key={y} className="py-3 px-4 text-right text-amber-600 border-r border-amber-100 last:border-r-slate-200 last:border-r-2 cursor-pointer" onClick={() => sort(y)}>
                    {y} <SortIcon col={y} />
                  </th>
                ))}
                {showMonths && thaiMonths.map(m => (
                  <th key={m} className="py-3 px-3 text-right text-blue-600 border-r border-blue-50 border-b-blue-200 cursor-pointer" onClick={() => sort(m)}>
                    {m} <SortIcon col={m} />
                  </th>
                ))}
                <th className="py-3 px-4 text-center sticky right-0 z-30 bg-slate-50 min-w-[140px]">
                  <div>Actions</div>
                  {(headerFilters.ID_No || headerFilters["ชื่อ"]) && (
                    <button
                      onClick={() => setHeaderFilters({ ID_No: "", "ชื่อ": "" })}
                      className="mt-2 text-[9px] text-rose-500 hover:text-rose-700 font-bold flex items-center gap-1 mx-auto"
                    >
                      <X size={10} /> ล้างฟิวเตอร์
                    </button>
                  )}
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={50} className="p-0">
                    <TableSkeleton rows={5} cols={8} hasHeader={false} />
                  </td>
                </tr>
              ) : displayed.length === 0 ? (
                <tr><td colSpan={5} className="py-24 text-center text-slate-400 font-bold">ไม่พบข้อมูล</td></tr>
              ) : displayed.map((row, idx) => (
                <tr key={idx} className="hover:bg-blue-50/40 even:bg-slate-50/50 transition-colors group">
                  <td className="sticky left-0 text-xs z-20 bg-white group-hover:bg-slate-50 transition-colors py-4 px-6 font-bold text-slate-700">{row.ID_No}</td>
                  <td className="sticky left-[100px] z-20 bg-white group-hover:bg-slate-50 transition-colors py-4 px-6 border-r-2 border-slate-200">
                    <p className="font-black text-slate-800 text-[13px]">{row.prefix}{row["ชื่อ"]}</p>
                    <p className="text-[10px] text-slate-400">{row.Phone || "-"}</p>
                  </td>
                  <td className="py-4 px-4 text-right font-black text-blue-700 tabular-nums text-base">{fmt(row.รวมเงินคงเหลือ)}</td>
                  <td className="py-4 px-4 text-right border-r-2 border-slate-200 font-bold text-rose-500 tabular-nums">{row.ถอนเงิน > 0 ? fmt(row.ถอนเงิน) : "—"}</td>
                  {showYears && yearColumns.map(y => (
                    <td key={y} className="py-4 px-4 text-right border-r border-amber-50 text-amber-700 font-bold tabular-nums">
                      {Number(row[y]) > 0 ? fmt(Number(row[y])) : "—"}
                    </td>
                  ))}
                  {showMonths && thaiMonths.map(m => (
                    <td key={m} className="py-4 px-3 text-right border-r border-blue-50 text-slate-700 font-medium tabular-nums">
                      {Number(row[m]) > 0 ? fmt(Number(row[m])) : "—"}
                    </td>
                  ))}
                  <td className="py-4 px-4 text-center sticky right-0 z-20 bg-white group-hover:bg-slate-50 shadow-[-10px_0_15px_rgba(0,0,0,0.02)]">
                    <div className="flex gap-1.5 justify-center">
                      <Link href={`/admin/shares/${row.ID_No}`} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all"><BookOpen size={14} /></Link>
                      <button
                        onClick={() => {
                          setEditingHistorical(row);
                          setHistForm(Object.fromEntries(yearColumns.map(y => ["25" + y.slice(-2), Number(row[y]) || 0])));
                        }}
                        className="p-2 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-600 hover:text-white transition-all"
                      >
                        <Edit3 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Pagination Bar (Outside Table) ── */}
        <div className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50">
          <p className="text-[12px] text-slate-500 font-medium">
            แสดง <span className="text-slate-900 font-black">{Math.min(filtered.length, (page - 1) * perPage + 1)}</span> ถึง
            <span className="text-slate-900 font-black"> {Math.min(page * perPage, filtered.length)}</span> จากทั้งหมด
            <span className="text-slate-900 font-black"> {filtered.length}</span> รายการ
          </p>

          <div className="flex items-center gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage(1)}
              className="p-2 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-blue-600 disabled:opacity-30 transition-all"
            >
              <ChevronLeft size={16} className="double-icon" />
            </button>
            <div className="flex items-center px-4 py-1.5 bg-white border border-slate-200 rounded-lg text-[13px] font-black text-blue-600 shadow-sm">
              {page} / {totalPages || 1}
            </div>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
              className="p-2 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-blue-600 disabled:opacity-30 transition-all"
            >
              <ChevronRight size={16} />
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

      {/* --- Styles for printing and table fixes --- */}
      <style jsx global>{`
        .tabular-nums { font-variant-numeric: tabular-nums; }
        @media print {
          .no-print { display: none !important; }
        }
        /* ล็อค Scrollbar ให้ดูสวยงาม */
        ::-webkit-scrollbar { height: 8px; width: 8px; }
        ::-webkit-scrollbar-track { background: #f1f5f9; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>

    </div>
  );
}