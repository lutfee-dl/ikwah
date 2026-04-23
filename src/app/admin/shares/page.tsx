"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Search, Download, Users, Wallet, ArrowUpDown, ArrowUp, ArrowDown,
  Printer, X, Activity, TrendingUp, ChevronLeft, ChevronRight,
  Landmark, ShieldCheck, PieChart, RefreshCw, BookOpen, Eye,
  CalendarDays, BarChart3,
} from "lucide-react";

const API_URL = "/api/member";

type ShareRow = {
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

type HistoricalForm = { [year: string]: number };

type ShareStats = {
  totalFund: number;
  selectedYear: number;
  thaiYear: number;
  memberCount: number;
  activeCount: number;
};

type SortConfig = { key: string; direction: "asc" | "desc" };

const thaiMonths = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const thaiYears = ["ปี65", "ปี66", "ปี67", "ปี68", "ปี69"];
const fullThaiYears: Record<string, string> = {
  "ปี65": "2565", "ปี66": "2566", "ปี67": "2567", "ปี68": "2568", "ปี69": "2569",
};

function fmt(n: number | undefined) {
  return (Number(n) || 0).toLocaleString("th-TH");
}

export default function AdminSharesPage() {
  const [data, setData] = useState<ShareRow[]>([]);
  const [stats, setStats] = useState<ShareStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: "ชื่อ", direction: "asc" });
  const [page, setPage] = useState(1);
  const [perPage] = useState(25);
  const [fiscalYear, setFiscalYear] = useState(new Date().getFullYear());

  // Modal states
  const [selectedMember, setSelectedMember] = useState<ShareRow | null>(null);
  const [editingHistorical, setEditingHistorical] = useState<ShareRow | null>(null);
  const [histForm, setHistForm] = useState<HistoricalForm>({ "2565": 0, "2566": 0, "2567": 0, "2568": 0, "2569": 0 });
  const [savingHist, setSavingHist] = useState(false);

  // View mode: 'year' = show year columns, 'month' = show month columns, 'both' = all
  const [viewMode, setViewMode] = useState<"both" | "year" | "month">("both");

  useEffect(() => { fetchShares(); }, [fiscalYear]);

  const fetchShares = async () => {
    try {
      console.log("Fetching shares with year:", fiscalYear);
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "admin_get_shares_report",
          ADMIN_SECRET: process.env.NEXT_PUBLIC_ADMIN_SECRET,
          options: { year: fiscalYear }
        }),
      });
      const text = await res.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch {
        console.error("Invalid JSON from GAS:", text);
        return;
      }
      console.log("Shares API Result:", result);
      if (result.success) {
        setData(result.data);
        setStats(result.stats);
        console.log("Data set to state:", result.data.length, "rows");
      } else {
        console.error("API Error Message:", result.msg);
      }
    } catch (err) {
      console.error("Fetch Shares Error:", err);
    }
    finally { setLoading(false); }
  };

  const yearColumns = useMemo(() => {
    if (!data.length) return thaiYears;
    return Object.keys(data[0]).filter(k => k.startsWith("ปี")).sort();
  }, [data]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return data
      .filter(r => String(r["ชื่อ"] || "").toLowerCase().includes(q) || String(r.ID_No || "").toLowerCase().includes(q) || String(r.Phone || "").includes(q))
      .sort((a, b) => {
        const av = a[sortConfig.key] as number || 0;
        const bv = b[sortConfig.key] as number || 0;
        return sortConfig.direction === "asc" ? (av < bv ? -1 : 1) : (av > bv ? -1 : 1);
      });
  }, [data, search, sortConfig]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const displayed = filtered.slice((page - 1) * perPage, page * perPage);

  const sort = (key: string) =>
    setSortConfig(p => ({ key, direction: p.key === key && p.direction === "asc" ? "desc" : "asc" }));

  const openStatement = (row: ShareRow) => setSelectedMember(row);
  const openHistEdit = (row: ShareRow) => {
    setEditingHistorical(row);
    setHistForm({
      "2565": (row["ปี65"] as number) || 0, "2566": (row["ปี66"] as number) || 0,
      "2567": (row["ปี67"] as number) || 0, "2568": (row["ปี68"] as number) || 0,
      "2569": (row["ปี69"] as number) || 0,
    });
  };

  const handleSaveHistorical = async () => {
    if (!editingHistorical) return;
    setSavingHist(true);
    try {
      const res = await fetch(API_URL, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "admin_update_historical_shares",
          ADMIN_SECRET: process.env.NEXT_PUBLIC_ADMIN_SECRET,
          payload: { memberId: editingHistorical.ID_No, years: histForm }
        }),
      });
      const r = await res.json();
      if (r.success) { setEditingHistorical(null); fetchShares(); }
      else alert(r.msg || "เกิดข้อผิดพลาด");
    } catch { alert("ไม่สามารถบันทึกข้อมูลได้"); }
    finally { setSavingHist(false); }
  };

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

  // Show yearly columns?
  const showYears = viewMode === "both" || viewMode === "year";
  // Show monthly columns?
  const showMonths = viewMode === "both" || viewMode === "month";

  return (
    <div className="space-y-0 font-sans">

      {/* ── KPI Strip (Bank-style) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "มูลค่าหุ้นรวมสุทธิ", value: `฿ ${fmt(stats?.totalFund)}`, sub: "ยอดเงินคงเหลือในระบบ", icon: Landmark, accent: "blue" },
          { label: "สมาชิกทั้งหมด", value: `${stats?.memberCount || 0} คน`, sub: "สมาชิกที่ลงทะเบียนแล้ว", icon: Users, accent: "slate" },
          { label: "สมาชิกสถานะปกติ", value: `${stats?.activeCount || 0} คน`, sub: "บัญชีที่ยังคงสมบูรณ์", icon: Activity, accent: "emerald" },
          { label: "ปีงบประมาณ", value: `พ.ศ. ${fiscalYear + 543}`, sub: `ค.ศ. ${fiscalYear}`, icon: CalendarDays, accent: "amber" },
        ].map((kpi, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-start gap-4 hover:shadow-md transition-shadow">
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

      {/* ── Toolbar ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
          {/* Search */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 w-full sm:max-w-sm focus-within:ring-4 focus-within:ring-blue-100 focus-within:border-blue-300 focus-within:bg-white transition-all">
            <Search size={15} className="text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="ค้นหาชื่อ / รหัสสมาชิก / เบอร์โทร..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="bg-transparent outline-none text-sm text-slate-700 w-full placeholder:text-slate-400 font-medium"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Year Navigator */}
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
              <button onClick={() => setFiscalYear(v => v - 1)} className="px-3 py-2.5 hover:bg-slate-100 transition-colors text-slate-500 border-r border-slate-200">
                <ChevronLeft size={15} />
              </button>
              <span className="px-4 text-[12px] font-black text-slate-700 whitespace-nowrap">พ.ศ. {fiscalYear + 543}</span>
              <button onClick={() => setFiscalYear(v => v + 1)} className="px-3 py-2.5 hover:bg-slate-100 transition-colors text-slate-500 border-l border-slate-200">
                <ChevronRight size={15} />
              </button>
            </div>

            {/* View Mode Tabs */}
            <div className="flex bg-slate-50 border border-slate-200 rounded-xl overflow-hidden text-[11px] font-black">
              {([["both", "ปี + เดือน"], ["year", "แยกปี"], ["month", "แยกเดือน"]] as const).map(([v, label]) => (
                <button
                  key={v}
                  onClick={() => setViewMode(v)}
                  className={`px-3 py-2.5 transition-all ${viewMode === v ? "bg-blue-600 text-white shadow" : "text-slate-500 hover:bg-slate-100"}`}
                >
                  {label}
                </button>
              ))}
            </div>

            <button onClick={fetchShares} className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm">
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            </button>
            <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm text-[11px] font-black">
              <Download size={14} /> ส่งออก CSV
            </button>
          </div>
        </div>

        {/* ── Table ── */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse whitespace-nowrap" style={{ minWidth: showYears && showMonths ? 1800 : showYears ? 1000 : 1200 }}>
            <thead>
              {/* Group header row */}
              <tr className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest">
                <th colSpan={2} className="sticky left-0 z-30 bg-slate-900 py-3 px-6 text-left border-r border-slate-700">ข้อมูลสมาชิก</th>
                <th colSpan={2} className="py-3 px-4 text-right border-r border-slate-700">ยอดบัญชี</th>
                {showYears && (
                  <th colSpan={yearColumns.length} className="py-3 px-4 text-center border-r border-slate-700 bg-amber-900/60">
                    <span className="flex items-center justify-center gap-1.5"><BarChart3 size={12} />ยอดสะสมย้อนหลัง (ยกมา)</span>
                  </th>
                )}
                {showMonths && (
                  <th colSpan={12} className="py-3 px-4 text-center bg-blue-900/60">
                    <span className="flex items-center justify-center gap-1.5"><CalendarDays size={12} />ยอดฝากรายเดือน พ.ศ. {fiscalYear + 543}</span>
                  </th>
                )}
                <th className="py-3 px-4 text-center">จัดการ</th>
              </tr>

              {/* Sub header */}
              <tr className="bg-slate-50 border-b-2 border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                {/* Sticky cols */}
                <th className="sticky left-0 z-30 bg-slate-50 py-3.5 px-6 text-left min-w-[90px]">รหัส</th>
                <th className="sticky left-[90px] z-30 bg-slate-50 py-3.5 px-6 text-left min-w-[210px] border-r-2 border-slate-200">
                  <button onClick={() => sort("ชื่อ")} className="hover:text-blue-600 transition-colors">ชื่อ-นามสกุล <SortIcon col="ชื่อ" /></button>
                </th>
                <th className="py-3.5 px-4 text-right min-w-[120px]">
                  <button onClick={() => sort("รวมเงินคงเหลือ")} className="hover:text-blue-600 transition-colors">คงเหลือ (฿) <SortIcon col="รวมเงินคงเหลือ" /></button>
                </th>
                <th className="py-3.5 px-4 text-right min-w-[110px] border-r-2 border-slate-200">
                  <button onClick={() => sort("ถอนเงิน")} className="hover:text-blue-600 transition-colors">ถอนแล้ว (฿) <SortIcon col="ถอนเงิน" /></button>
                </th>

                {/* Year cols */}
                {showYears && yearColumns.map(y => (
                  <th key={y} className="py-3.5 px-4 text-right min-w-[90px] text-amber-600/80 border-r border-amber-100 last:border-r-2 last:border-r-slate-200">
                    <button onClick={() => sort(y)} className="hover:text-amber-700 transition-colors">{y} <SortIcon col={y} /></button>
                  </th>
                ))}

                {/* Month cols */}
                {showMonths && thaiMonths.map((m, i) => (
                  <th key={m} className={`py-3.5 px-3 text-right min-w-[75px] text-blue-500/80 ${i < 11 ? "border-r border-blue-100" : ""}`}>
                    <button onClick={() => sort(m)} className="hover:text-blue-700 transition-colors">{m} <SortIcon col={m} /></button>
                  </th>
                ))}

                <th className="py-3.5 px-4 text-center min-w-[130px]">ดูรายละเอียด</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={40} className="py-24 text-center">
                  <div className="flex flex-col items-center gap-3 text-slate-400">
                    <RefreshCw size={28} className="animate-spin text-blue-500" />
                    <p className="text-sm font-bold">กำลังโหลดข้อมูลบัญชี...</p>
                  </div>
                </td></tr>
              ) : displayed.length === 0 ? (
                <tr><td colSpan={40} className="py-24 text-center text-slate-400 text-sm font-bold">ไม่พบข้อมูลสมาชิกในระบบ</td></tr>
              ) : displayed.map((row, idx) => {
                const balance = Number(row["รวมเงินคงเหลือ"]) || 0;
                const isActive = row["สถานะ"] === "ปกติ";
                return (
                  <tr key={idx} className="hover:bg-blue-50/30 transition-colors group">
                    {/* Sticky: รหัสสมาชิก */}
                    <td className="sticky left-0 z-20 bg-white group-hover:bg-blue-50/30 transition-colors py-4 px-6">
                      <div className="flex items-center gap-2.5">
                        {row.pictureUrl ? (
                          <img src={String(row.pictureUrl)} className="w-9 h-9 rounded-xl border border-slate-200 object-cover shadow-sm" />
                        ) : (
                          <div className="w-9 h-9 rounded-xl bg-linear-to-tr from-blue-500 to-sky-400 flex items-center justify-center text-white font-black text-[11px] shadow-sm">
                            {String(row.ID_No || "").slice(-2) || "IK"}
                          </div>
                        )}
                        <p className="font-black text-slate-800 text-[12px] tracking-tight">{row.ID_No || "-"}</p>
                      </div>
                    </td>

                    {/* Sticky: ชื่อ */}
                    <td className="sticky left-[90px] z-20 bg-white group-hover:bg-blue-50/30 transition-colors py-4 px-6 border-r-2 border-slate-200">
                      <p className="font-black text-slate-800 text-[13px]">{row.prefix} {row["ชื่อ"]}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black border ${isActive ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-600 border-red-200"}`}>
                          {row["สถานะ"]}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">{row.Phone || "-"}</span>
                      </div>
                    </td>

                    {/* ยอดคงเหลือ */}
                    <td className="py-4 px-4 text-right tabular-nums">
                      <span className={`text-base font-black ${balance > 0 ? "text-blue-700" : "text-slate-400"}`}>
                        {fmt(balance)}
                      </span>
                    </td>

                    {/* ถอนเงิน */}
                    <td className="py-4 px-4 text-right border-r-2 border-slate-200">
                      <span className="text-sm font-bold text-rose-500 tabular-nums">
                        {Number(row["ถอนเงิน"]) > 0 ? fmt(Number(row["ถอนเงิน"])) : <span className="text-slate-200">—</span>}
                      </span>
                    </td>

                    {/* Year columns */}
                    {showYears && yearColumns.map((y, yi) => (
                      <td key={y} className={`py-4 px-4 text-right tabular-nums ${yi === yearColumns.length - 1 ? "border-r-2 border-slate-200" : "border-r border-amber-100/50"}`}>
                        {Number(row[y]) > 0
                          ? <span className="text-sm font-bold text-amber-700">{fmt(Number(row[y]))}</span>
                          : <span className="text-slate-200 text-sm">—</span>}
                      </td>
                    ))}

                    {/* Month columns */}
                    {showMonths && thaiMonths.map((m, mi) => {
                      const val = Number(row[m]) || 0;
                      return (
                        <td key={m} className={`py-4 px-3 text-right tabular-nums ${mi < 11 ? "border-r border-blue-100/50" : ""}`}>
                          {val > 0
                            ? <span className="text-[12px] font-black text-slate-800">{fmt(val)}</span>
                            : <span className="text-slate-200 text-[12px]">—</span>}
                        </td>
                      );
                    })}

                    {/* Actions */}
                    <td className="py-4 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openStatement(row)}
                          className="cursor-pointer flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 text-white rounded-lg text-[11px] font-black hover:bg-blue-700 transition-colors shadow-sm"
                        >
                          <Eye size={12} /> Statement
                        </button>
                        <button
                          onClick={() => openHistEdit(row)}
                          className="cursor-pointer flex items-center gap-1 px-2.5 py-1.5 bg-amber-500 text-white rounded-lg text-[11px] font-black hover:bg-amber-600 transition-colors shadow-sm"
                        >
                          <BookOpen size={12} /> แก้ไข
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Summary Footer */}
            {!loading && displayed.length > 0 && (
              <tfoot>
                <tr className="bg-slate-900 text-white text-[11px] font-black">
                  <td colSpan={2} className="sticky left-0 z-20 bg-slate-900 py-3.5 px-6">
                    รวม {filtered.length} รายการ (หน้า {page}/{totalPages || 1})
                  </td>
                  <td className="py-3.5 px-4 text-right tabular-nums text-blue-300">
                    ฿ {fmt(displayed.reduce((s, r) => s + (Number(r["รวมเงินคงเหลือ"]) || 0), 0))}
                  </td>
                  <td className="py-3.5 px-4 text-right tabular-nums text-rose-300 border-r-2 border-slate-700">
                    ฿ {fmt(displayed.reduce((s, r) => s + (Number(r["ถอนเงิน"]) || 0), 0))}
                  </td>
                  {showYears && yearColumns.map(y => (
                    <td key={y} className="py-3.5 px-4 text-right tabular-nums text-amber-300 border-r border-slate-700">
                      {fmt(displayed.reduce((s, r) => s + (Number(r[y]) || 0), 0))}
                    </td>
                  ))}
                  {showMonths && thaiMonths.map(m => (
                    <td key={m} className="py-3.5 px-3 text-right tabular-nums text-sky-300 border-r border-slate-700">
                      {fmt(displayed.reduce((s, r) => s + (Number(r[m]) || 0), 0))}
                    </td>
                  ))}
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Pagination */}
        {filtered.length > 0 && (
          <div className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
            <p className="text-[12px] text-slate-500 font-medium">
              แสดง {(page - 1) * perPage + 1}–{Math.min(page * perPage, filtered.length)} จาก {filtered.length} รายการ
            </p>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setPage(1)} disabled={page === 1} className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-30 transition-all text-xs font-bold">หน้าแรก</button>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-30 transition-all">
                <ChevronLeft size={15} />
              </button>
              <span className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-black shadow-sm">
                {page} / {totalPages || 1}
              </span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-30 transition-all">
                <ChevronRight size={15} />
              </button>
              <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-30 transition-all text-xs font-bold">หน้าสุดท้าย</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Statement Modal ── */}
      {selectedMember && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setSelectedMember(null)}>
          <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]" onClick={e => e.stopPropagation()}>
            {/* Statement header – bank style */}
            <div className="bg-slate-900 relative overflow-hidden px-8 py-7 flex-shrink-0">
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top_right,_#3b82f6,_transparent_60%)]" />
              <div className="relative flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center shadow-xl shadow-blue-600/30">
                    <Landmark size={22} className="text-white" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.25em] mb-1">กองทุนอิควะห์ · สมาคมออมทรัพย์</p>
                    <h2 className="text-xl font-black text-white tracking-tight">บัญชีเงินหุ้นสัจจะรายบุคคล</h2>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">Share Savings Account Statement</p>
                  </div>
                </div>
                <button onClick={() => setSelectedMember(null)} className="p-2 rounded-xl text-slate-400 hover:bg-white/10 transition-all">
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1">
              {/* Member Info Strip */}
              <div className="px-8 py-6 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50/50">
                <div className="flex items-center gap-4">
                  {selectedMember.pictureUrl ? (
                    <img src={String(selectedMember.pictureUrl)} className="w-14 h-14 rounded-2xl border-2 border-slate-200 object-cover shadow-sm" />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-linear-to-tr from-blue-500 to-sky-400 flex items-center justify-center text-white font-black text-xl shadow-sm">
                      {String(selectedMember["ชื่อ"] || "").charAt(0)}
                    </div>
                  )}
                  <div>
                    <p className="text-lg font-black text-slate-900">{selectedMember.prefix} {selectedMember["ชื่อ"]}</p>
                    <p className="text-[11px] text-blue-600 font-bold mt-0.5">ทะเบียน: {selectedMember.ID_No} · โทร. {selectedMember.Phone || "-"}</p>
                    <span className={`inline-flex mt-1 px-2 py-0.5 rounded text-[9px] font-black border ${selectedMember["สถานะ"] === "ปกติ" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-600 border-red-200"}`}>
                      {selectedMember["สถานะ"]}
                    </span>
                  </div>
                </div>
                <div className="bg-blue-600 px-7 py-4 rounded-2xl text-right shadow-lg shadow-blue-600/20">
                  <p className="text-[9px] font-black text-blue-200 uppercase tracking-[0.2em] mb-1">ยอดเงินหุ้นคงเหลือสุทธิ</p>
                  <p className="text-3xl font-black text-white tracking-tight">฿ {fmt(Number(selectedMember["รวมเงินคงเหลือ"]))}</p>
                  {Number(selectedMember["ถอนเงิน"]) > 0 && (
                    <p className="text-[10px] text-blue-200 mt-1">ถอนแล้ว: ฿ {fmt(Number(selectedMember["ถอนเงิน"]))}</p>
                  )}
                </div>
              </div>

              <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Monthly Breakdown */}
                <div className="space-y-4">
                  <h4 className="flex items-center gap-2 font-black text-slate-800">
                    <CalendarDays size={17} className="text-blue-600" />
                    ยอดฝากรายเดือน พ.ศ. {fiscalYear + 543}
                  </h4>
                  <div className="rounded-2xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="text-left py-2.5 px-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">เดือน</th>
                          <th className="text-right py-2.5 px-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">จำนวน (฿)</th>
                          <th className="text-right py-2.5 px-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">สถานะ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {thaiMonths.map((m, i) => {
                          const val = Number(selectedMember[m]) || 0;
                          return (
                            <tr key={m} className={val > 0 ? "bg-white" : "bg-slate-50/50 opacity-50"}>
                              <td className="py-2.5 px-4 font-bold text-slate-500 text-xs">เดือน {i + 1} ({m})</td>
                              <td className="py-2.5 px-4 text-right font-black text-slate-800 tabular-nums text-sm">{val > 0 ? fmt(val) : "—"}</td>
                              <td className="py-2.5 px-4 text-right">
                                {val > 0
                                  ? <span className="inline-flex px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[9px] font-black">ชำระแล้ว</span>
                                  : <span className="inline-flex px-1.5 py-0.5 bg-slate-100 text-slate-400 rounded text-[9px] font-black">ยังไม่ชำระ</span>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-900 text-white">
                          <td className="py-3 px-4 font-black text-xs">รวมปี {fiscalYear + 543}</td>
                          <td colSpan={2} className="py-3 px-4 text-right font-black text-blue-300 tabular-nums">
                            ฿ {fmt(thaiMonths.reduce((s, m) => s + (Number(selectedMember[m]) || 0), 0))}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Yearly Carry-Forward */}
                <div className="space-y-4">
                  <h4 className="flex items-center gap-2 font-black text-slate-800">
                    <PieChart size={17} className="text-amber-600" />
                    ยอดสะสมย้อนหลัง (ยกมา)
                  </h4>
                  <div className="rounded-2xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-amber-50 border-b border-amber-100">
                          <th className="text-left py-2.5 px-4 text-[10px] font-black text-amber-600 uppercase tracking-wider">ปีพุทธศักราช</th>
                          <th className="text-right py-2.5 px-4 text-[10px] font-black text-amber-600 uppercase tracking-wider">ยอดสะสม (฿)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {thaiYears.map(y => {
                          const val = Number(selectedMember[y]) || 0;
                          const fullY = fullThaiYears[y] || y;
                          return (
                            <tr key={y} className={val > 0 ? "bg-white" : "bg-slate-50/50 opacity-40"}>
                              <td className="py-3 px-4 font-bold text-slate-600 text-sm">{fullY} ({y})</td>
                              <td className="py-3 px-4 text-right font-black text-amber-700 tabular-nums">{val > 0 ? fmt(val) : "—"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-amber-900 text-white">
                          <td className="py-3 px-4 font-black text-xs">รวมยอดยกมาทั้งหมด</td>
                          <td className="py-3 px-4 text-right font-black text-amber-300 tabular-nums">
                            ฿ {fmt(thaiYears.reduce((s, y) => s + (Number(selectedMember[y]) || 0), 0))}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Total summary box */}
                  <div className="bg-slate-900 p-5 rounded-2xl text-right">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">ยอดสะสมรวมทุกปี (ก่อนหักถอน)</p>
                    <p className="text-2xl font-black text-white">฿ {fmt(Number(selectedMember["รวมยอดทั้งหมด"]))}</p>
                    <p className="text-[10px] text-emerald-400 font-bold mt-1">คงเหลือสุทธิ: ฿ {fmt(Number(selectedMember["รวมเงินคงเหลือ"]))}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-8 py-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center flex-shrink-0">
              <p className="text-[10px] text-slate-400 font-medium">พิมพ์เมื่อ: {new Date().toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" })}</p>
              <div className="flex gap-2">
                <button onClick={() => setSelectedMember(null)} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-black hover:bg-slate-100 transition-all">ปิด</button>
                <button onClick={() => window.print()} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-black flex items-center gap-1.5 hover:bg-slate-800 transition-all shadow-sm">
                  <Printer size={14} /> พิมพ์รายงาน
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Historical Edit Modal ── */}
      {editingHistorical && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-amber-500 px-7 py-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"><TrendingUp size={20} className="text-white" /></div>
                <div>
                  <h2 className="font-black text-white">แก้ไขยอดยกมา</h2>
                  <p className="text-[10px] text-amber-100 font-bold">Historical Carry-Forward Entry</p>
                </div>
              </div>
              <button onClick={() => setEditingHistorical(null)} className="p-2 rounded-xl hover:bg-black/10 transition-all text-white"><X size={18} /></button>
            </div>

            <div className="p-7 space-y-5">
              <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="w-11 h-11 rounded-xl bg-linear-to-tr from-blue-500 to-sky-400 text-white flex items-center justify-center font-black">
                  {String(editingHistorical["ชื่อ"] || "").charAt(0)}
                </div>
                <div>
                  <p className="font-black text-slate-800">{editingHistorical.prefix} {editingHistorical["ชื่อ"]}</p>
                  <p className="text-xs text-blue-600 font-bold">{editingHistorical.ID_No}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {["2565", "2566", "2567", "2568", "2569"].map(year => (
                  <div key={year} className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">ปี {year}</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">฿</span>
                      <input
                        type="number"
                        value={histForm[year] || 0}
                        onChange={e => setHistForm({ ...histForm, [year]: Number(e.target.value) })}
                        className="w-full pl-8 pr-3 py-3 border border-slate-200 rounded-xl text-sm font-black text-slate-700 bg-slate-50 focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-400 focus:bg-white transition-all"
                        placeholder="0"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl text-center">
                <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">รวมยอดยกมาทั้งหมด</p>
                <p className="text-2xl font-black text-amber-700">
                  ฿ {(Object.values(histForm) as number[]).reduce((a, b) => a + (Number(b) || 0), 0).toLocaleString()}
                </p>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setEditingHistorical(null)} className="cursor-pointer flex-1 py-3 border border-slate-200 rounded-xl text-slate-600 text-sm font-black hover:bg-slate-50 transition-all">ยกเลิก</button>
                <button onClick={handleSaveHistorical} disabled={savingHist} className="cursor-pointer flex-1 py-3 bg-slate-900 text-white rounded-xl text-sm font-black flex items-center justify-center gap-2 hover:bg-slate-800 transition-all disabled:opacity-50 shadow-sm">
                  {savingHist ? <RefreshCw size={15} className="animate-spin" /> : <ShieldCheck size={15} />}
                  บันทึกข้อมูล
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          body * { visibility: hidden; }
          .fixed * { visibility: visible !important; }
          .fixed { position: absolute; left: 0; top: 0; width: 100%; height: auto; }
        }
        .tabular-nums { font-variant-numeric: tabular-nums; }
      ` }} />
    </div>
  );
}
