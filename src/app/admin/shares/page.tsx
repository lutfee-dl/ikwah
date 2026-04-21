"use client";

import { useEffect, useState, useMemo } from "react";
import { Search, Download, Users, Wallet, ArrowUpDown, ArrowUp, ArrowDown, Printer, X, Activity, TrendingUp, ChevronLeft, ChevronRight, Landmark, ShieldCheck, PieChart, RefreshCw } from "lucide-react";

const API_URL = "/api/member";

type ShareRow = {
  ID_No: string;
  lineUserId?: string;
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
  [key: string]: any;
};

type HistoricalForm = {
  [year: string]: number;
};

type ShareStats = {
  totalFund: number;
  selectedYear: number;
  thaiYear: number;
  memberCount: number;
  activeCount: number;
};

type SortConfig = {
  key: string;
  direction: "asc" | "desc";
};

const monthNamesThai = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

export default function AdminSharesPage() {
  const [data, setData] = useState<ShareRow[]>([]);
  const [stats, setStats] = useState<ShareStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: "ชื่อ", direction: "asc" });

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [fiscalYear, setFiscalYear] = useState(new Date().getFullYear());

  const [selectedMember, setSelectedMember] = useState<ShareRow | null>(null);
  const [editingHistorical, setEditingHistorical] = useState<ShareRow | null>(null);
  const [histForm, setHistForm] = useState<HistoricalForm>({
    "2565": 0, "2566": 0, "2567": 0, "2568": 0, "2569": 0
  });
  const [savingHist, setSavingHist] = useState(false);

  useEffect(() => {
    fetchShares();
  }, [fiscalYear]);

  const fetchShares = async () => {
    try {
      setLoading(true);
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "admin_get_shares_report",
          options: { year: fiscalYear }
        })
      });
      const result = await res.json();
      if (result.success) {
        setData(result.data);
        setStats(result.stats);
      }
    } catch (err) {
      console.error("Fetch shares failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const yearColumns = useMemo(() => {
    if (data.length === 0) return [];
    return Object.keys(data[0])
      .filter(key => key.startsWith("ปี"))
      .sort();
  }, [data]);

  const filteredData = useMemo(() => {
    const filtered = data.filter(row =>
      String(row["ชื่อ"] || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(row["ID_No"] || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(row["Phone"] || "").includes(searchQuery)
    );

    return filtered.sort((a, b) => {
      const aVal = a[sortConfig.key] || 0;
      const bVal = b[sortConfig.key] || 0;
      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [data, searchQuery, sortConfig]);

  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const displayedData = filteredData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc"
    }));
  };

  const handleOpenEditHistorical = (row: ShareRow) => {
    setEditingHistorical(row);
    setHistForm({
      "2565": row["ปี65"] || 0,
      "2566": row["ปี66"] || 0,
      "2567": row["ปี67"] || 0,
      "2568": row["ปี68"] || 0,
      "2569": row["ปี69"] || 0,
    });
  };

  const handleSaveHistorical = async () => {
    if (!editingHistorical) return;
    try {
      setSavingHist(true);
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "admin_update_historical_shares",
          ADMIN_SECRET: localStorage.getItem("ADMIN_SECRET"), // สมมติว่าเก็บไว้ในนี้
          payload: {
            memberId: editingHistorical.ID_No,
            years: histForm
          }
        })
      });
      const result = await res.json();
      if (result.success) {
        setEditingHistorical(null);
        fetchShares(); // โหลดใหม่เพื่ออัปเดตยอด
      } else {
        alert(result.msg || "เกิดข้อผิดพลาด");
      }
    } catch (err) {
      console.error(err);
      alert("ไม่สามารถบันทึกข้อมูลได้");
    } finally {
      setSavingHist(false);
    }
  };

  const exportCSV = () => {
    if (data.length === 0) return;
    const allHeaders = Object.keys(data[0]);
    const csvContent = [
      allHeaders.join(","),
      ...data.map(row => allHeaders.map(h => `"${row[h] || 0}"`).join(","))
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `report_${fiscalYear}.csv`;
    link.click();
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortConfig.key !== column) return <ArrowUpDown size={14} className="inline ml-1 opacity-20" />;
    return sortConfig.direction === "asc" ?
      <ArrowUp size={14} className="inline ml-1 text-sky-500" /> :
      <ArrowDown size={14} className="inline ml-1 text-sky-500" />;
  };

  return (
    <div className="space-y-6 relative font-sans p-6 bg-slate-50 min-h-screen">

      {/* 🚀 Header: สไตล์เดียวกับ Members */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">ทะเบียนคุมยอดหุ้นสะสม</h1>
          <p className="text-slate-500 text-sm mt-1">
            รายงานความเคลื่อนไหวทางบัญชี ยอดฝากสะสม และสรุปยอดรายเดือนแยกตามปีงบประมาณ
          </p>
        </div>
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          {/* Year Selector */}
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
            <button onClick={() => setFiscalYear(v => v - 1)} className="p-1.5 hover:bg-slate-50 rounded-md transition-colors text-slate-400">
              <ChevronLeft size={18} />
            </button>
            <div className="px-4 text-center border-x border-slate-100">
              <span className="text-xs font-bold text-slate-600">พ.ศ. {fiscalYear + 543}</span>
            </div>
            <button onClick={() => setFiscalYear(v => v + 1)} className="p-1.5 hover:bg-slate-50 rounded-md transition-colors text-slate-400">
              <ChevronRight size={18} />
            </button>
          </div>

          <button onClick={exportCSV} className="px-4 py-2 bg-white text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium flex items-center gap-2 shadow-sm">
            <Download size={16} /> ส่งออกข้อมูล
          </button>
          <button onClick={fetchShares} className="px-4 py-2 bg-sky-50 text-sky-600 rounded-lg hover:bg-sky-100 transition-colors text-sm font-medium flex items-center gap-2 shadow-sm">
            <RefreshCw className={loading ? "animate-spin" : ""} size={16} /> รีเฟรช
          </button>
        </div>
      </div>

      {/* 📊 Status Cards: สไตล์เดียวกับ Members */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "มูลค่าหุ้นรวม", value: stats?.totalFund || 0, icon: Wallet, unit: "฿", color: "sky" },
          { label: "สมาชิกทั้งหมด", value: stats?.memberCount || 0, icon: Users, unit: "คน", color: "slate" },
          { label: "สมาชิกปกติ", value: stats?.activeCount || 0, icon: Activity, unit: "คน", color: "emerald" },
          { label: "ปีงบประมาณ", value: fiscalYear + 543, icon: PieChart, unit: "พ.ศ.", color: "amber" },
        ].map((kpi, idx) => (
          <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center md:items-start gap-3">
            <div className={`w-10 h-10 md:w-12 md:h-12 bg-${kpi.color}-50 text-${kpi.color}-600 rounded-xl flex items-center justify-center shrink-0`}>
              <kpi.icon size={24} />
            </div>
            <div className="text-center md:text-left">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">{kpi.label}</p>
              <p className="text-lg md:text-xl font-black text-slate-800 tracking-tight">
                {kpi.value.toLocaleString()} <span className="text-[10px] font-medium text-slate-400 uppercase">{kpi.unit}</span>
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* 🔍 Search Input */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
          placeholder="ค้นหารายชื่อสมาชิก / รหัส / เบอร์โทรศัพท์..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition-all shadow-sm"
        />
      </div>

      {/* 🧾 Main Table: เลย์เอาต์เดียวกับ Members */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500 font-medium">แสดง</span>
            <select
              value={rowsPerPage}
              onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
              className="border border-slate-200 rounded-lg text-sm p-1.5 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white shadow-sm"
            >
              {[10, 20, 50, 100].map(v => <option key={v} value={v}>{v}</option>)}
            </select>
            <span className="text-sm text-slate-500 font-medium">รายการต่อหน้า</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap table-auto min-w-[1500px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="sticky left-0 z-30 bg-slate-50 py-4 px-6 font-bold text-slate-500 text-[11px] uppercase tracking-wider min-w-[220px]">
                  ID / สมาชิก
                </th>
                <th className="sticky left-[220px] z-30 bg-slate-50 py-4 px-6 font-bold text-slate-500 text-[11px] uppercase tracking-wider min-w-[250px] border-r border-slate-200">
                  ชื่อ-นามสกุล / ข้อมูล
                </th>
                <th onClick={() => handleSort("รวมเงินคงเหลือ")} className="py-4 px-6 font-bold text-slate-500 text-[11px] uppercase tracking-wider text-right cursor-pointer hover:text-sky-600 transition-colors">
                  คงเหลือ (฿) <SortIcon column="รวมเงินคงเหลือ" />
                </th>
                <th onClick={() => handleSort("ถอนเงิน")} className="py-4 px-6 font-bold text-slate-500 text-[11px] uppercase tracking-wider text-right cursor-pointer hover:text-sky-600 transition-colors border-r border-slate-100">
                  ถอนแล้ว <SortIcon column="ถอนเงิน" />
                </th>
                {yearColumns.map(year => (
                  <th key={year} onClick={() => handleSort(year)} className="py-4 px-6 font-bold text-slate-400 text-[10px] uppercase tracking-wider text-right border-r border-slate-100/50">
                    {year} <SortIcon column={year} />
                  </th>
                ))}
                {monthNamesThai.map(month => (
                  <th key={month} onClick={() => handleSort(month)} className="py-4 px-5 font-bold text-slate-400 text-[10px] uppercase tracking-wider text-right border-r border-slate-100/30">
                    {month}
                  </th>
                ))}
                <th className="py-4 px-6 font-bold text-slate-500 text-[11px] uppercase tracking-wider text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={30} className="py-20 text-center text-slate-400 font-medium">กำลังโหลดข้อมูลบัญชี...</td></tr>
              ) : displayedData.length === 0 ? (
                <tr><td colSpan={30} className="py-20 text-center text-slate-400 font-medium italic">ไม่พบข้อมูลสมาชิกในระบบ</td></tr>
              ) : displayedData.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="sticky left-0 z-20 bg-inherit group-hover:bg-slate-50 transition-colors py-4 px-6">
                    <div className="flex items-center gap-3">
                      {row.pictureUrl ? (
                        <img src={row.pictureUrl} className="w-10 h-10 rounded-full border-2 border-white shadow-sm object-cover bg-slate-100" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 border-2 border-white shadow-sm flex items-center justify-center font-black text-[10px]">
                          {row.ID_No?.slice(-2) || "IK"}
                        </div>
                      )}
                      <div>
                        <p className="font-black text-slate-900 tracking-tight text-sm">{row.ID_No || "-"}</p>
                        <p className="text-[10px] text-slate-400 font-medium truncate max-w-[100px]">{row.lineName || "-"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="sticky left-[220px] z-20 bg-inherit group-hover:bg-slate-50 transition-colors py-4 px-6 border-r border-slate-200">
                    <p className="font-bold text-slate-700 text-sm">{row.prefix} {row["ชื่อ"]}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold ${row["สถานะ"] === "ปกติ" ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"}`}>
                        {row["สถานะ"]}
                      </span>
                      <span className="text-[10px] text-slate-400">|</span>
                      <span className="text-[10px] text-slate-400">{row.Phone || "-"}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-right font-black text-sky-600 text-base tabular-nums">
                    {(Number(row["รวมเงินคงเหลือ"]) || 0).toLocaleString()}
                  </td>
                  <td className="py-4 px-6 text-right font-bold text-slate-500 text-sm border-r border-slate-100">
                    {(Number(row["ถอนเงิน"]) || 0).toLocaleString()}
                  </td>
                  {yearColumns.map(year => (
                    <td key={year} className="py-4 px-6 text-right font-medium text-slate-500 text-sm border-r border-slate-100/50">
                      {row[year] > 0 ? (Number(row[year])).toLocaleString() : <span className="opacity-10">-</span>}
                    </td>
                  ))}
                  {monthNamesThai.map(month => (
                    <td key={month} className={`py-4 px-5 text-right font-medium text-xs border-r border-slate-100/30 ${row[month] > 0 ? "text-slate-800" : "text-slate-200"}`}>
                      {row[month] > 0 ? (Number(row[month])).toLocaleString() : "0"}
                    </td>
                  ))}
                  <td className="py-4 px-6 text-center flex items-center justify-center gap-2">
                    <button
                      onClick={() => handleOpenEditHistorical(row)}
                      className="cursor-pointer inline-flex items-center justify-center gap-2 px-2.5 py-1.5 bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white rounded-lg text-xs font-bold transition-all border border-amber-100 shadow-sm"
                    >
                      แก้ไขประวัติต้นปี
                    </button>
                    <button
                      onClick={() => setSelectedMember(row)}
                      className="cursor-pointer inline-flex items-center justify-center gap-2 px-3 py-1.5 bg-white text-slate-600 hover:bg-sky-500 hover:text-white rounded-lg text-xs font-bold transition-all border border-slate-200 hover:border-sky-500 shadow-sm"
                    >
                      Audit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination: สไตล์เดียวกับ Members */}
        {filteredData.length > 0 && (
          <div className="bg-slate-50 border-t border-slate-200 p-4 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-sm font-medium text-slate-500">
              แสดง {(currentPage - 1) * rowsPerPage + 1} ถึง {Math.min(currentPage * rowsPerPage, filteredData.length)} จาก {filteredData.length} รายการ
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 transition-all shadow-sm"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="px-4 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-bold text-sky-600 shadow-sm">
                {currentPage} / {totalPages || 1}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 transition-all shadow-sm"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 📘 Detail Statement Modal */}
      {selectedMember && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" onClick={() => setSelectedMember(null)}>
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[95vh]" onClick={e => e.stopPropagation()}>
            <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Landmark className="text-sky-400" />
                <div>
                  <h2 className="text-xl font-bold">Statement รายบุคคล</h2>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest">Official Financial Audit Report</p>
                </div>
              </div>
              <button onClick={() => setSelectedMember(null)} className="p-2 hover:bg-white/10 rounded-full transition-all"><X /></button>
            </div>

            <div className="overflow-y-auto p-8 space-y-8">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-slate-100 pb-8">
                <div className="flex items-center gap-5">
                  <div className="w-20 h-20 bg-slate-50 rounded-2xl border-2 border-slate-100 flex items-center justify-center overflow-hidden shadow-sm uppercase font-black text-slate-300">
                    {selectedMember.pictureUrl ? <img src={selectedMember.pictureUrl} className="w-full h-full object-cover" /> : "IMG"}
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-800">{selectedMember.prefix}{selectedMember["ชื่อ"]}</p>
                    <p className="text-sm font-medium text-sky-600 mt-1">ทะเบียน: {selectedMember.ID_No} | {selectedMember["สถานะ"]}</p>
                  </div>
                </div>
                <div className="bg-sky-50 px-6 py-4 rounded-2xl border border-sky-100 text-right min-w-[250px]">
                  <p className="text-[10px] font-bold text-sky-600 uppercase mb-1">ยอดเงินคงเหลือสุทธิ</p>
                  <p className="text-3xl font-black text-sky-700 tracking-tight">฿ {(Number(selectedMember["รวมเงินคงเหลือ"]) || 0).toLocaleString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h4 className="font-bold text-slate-800 flex items-center gap-2"><Activity size={18} className="text-sky-500" /> รายเดือนปี {fiscalYear + 543}</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {monthNamesThai.map(m => (
                      <div key={m} className={`p-3 rounded-xl border text-center ${selectedMember[m] > 0 ? "bg-white border-sky-100 shadow-sm" : "bg-slate-50 border-slate-100 opacity-30"}`}>
                        <p className="text-[10px] font-bold text-slate-400 mb-1">{m}</p>
                        <p className="text-sm font-bold text-slate-700">{(selectedMember[m] || 0).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="font-bold text-slate-800 flex items-center gap-2"><PieChart size={18} className="text-amber-500" /> ยอดสรุปรายปี</h4>
                  <div className="space-y-2">
                    {yearColumns.map(y => (
                      <div key={y} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                        <span className="text-xs font-bold text-slate-500">{y}</span>
                        <span className="font-bold text-slate-800">{(selectedMember[y] || 0).toLocaleString()} <span className="text-[10px] text-slate-400">฿</span></span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
              <button onClick={() => window.print()} className="px-6 py-2.5 bg-slate-800 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-slate-900 transition-all text-sm shadow-lg shadow-slate-200">
                <Printer size={18} /> พิมพ์รายงาน
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📝 Historical Edit Modal */}
      {editingHistorical && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col">
            <div className="bg-amber-500 p-6 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                   <TrendingUp size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold leading-tight">แก้ไขข้อมูลยอดยกมา</h2>
                  <p className="text-[10px] text-amber-100 uppercase font-black">Historical Carry-Forward Entry</p>
                </div>
              </div>
              <button onClick={() => setEditingHistorical(null)} className="p-2 hover:bg-black/10 rounded-full transition-all"><X /></button>
            </div>

            <div className="p-8 space-y-6">
              <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-400 font-bold uppercase overflow-hidden">
                    {editingHistorical.pictureUrl ? <img src={editingHistorical.pictureUrl} /> : <span>{editingHistorical.ID_No?.slice(-2)}</span>}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">{editingHistorical.prefix}{editingHistorical["ชื่อ"]}</h3>
                    <p className="text-xs text-sky-600 font-medium tracking-tight">รหัสสมาชิก: {editingHistorical.ID_No}</p>
                  </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {["2565", "2566", "2567", "2568", "2569"].map(year => (
                  <div key={year} className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">ยอดสะสมเดิม ปี {year}</label>
                    <div className="relative group">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 font-bold text-sm tracking-tighter group-focus-within:text-amber-500 transition-colors">฿</div>
                      <input 
                        type="number"
                        value={histForm[year] || 0}
                        onChange={(e) => setHistForm({ ...histForm, [year]: Number(e.target.value) })}
                        className="w-full pl-7 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-black text-slate-700 focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all placeholder:text-slate-300"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-emerald-50 p-5 rounded-3xl border border-emerald-100 flex flex-col items-center">
                 <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">รวมยอดสะสมปีก่อนหน้าทั้งหมด</p>
                 <p className="text-3xl font-black text-emerald-700 tracking-tighter">
                   ฿ {(Object.values(histForm) as number[]).reduce((a, b) => a + (Number(b) || 0), 0).toLocaleString()}
                 </p>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3">
               <button 
                 onClick={() => setEditingHistorical(null)}
                 className="flex-1 px-6 py-3 bg-white border border-slate-200 rounded-2xl text-slate-500 font-bold text-sm hover:bg-slate-100 transition-all shadow-sm"
               >
                 ยกเลิก
               </button>
               <button 
                 onClick={handleSaveHistorical}
                 disabled={savingHist}
                 className="flex-1 px-6 py-3 bg-slate-900 border border-slate-900 rounded-2xl text-white font-bold text-sm hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 disabled:opacity-50 flex items-center justify-center gap-2"
               >
                 {savingHist ? <RefreshCw className="animate-spin" size={16}/> : <ShieldCheck size={18}/>}
                 บันทึกข้อมูล
               </button>
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
           `}} />

    </div>
  );
}
