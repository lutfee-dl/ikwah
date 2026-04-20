"use client";

import { useEffect, useState, useMemo } from "react";
import { Search, Download, Printer, Users, Wallet, Loader2, ArrowUpDown, ArrowUp, ArrowDown, ExternalLink, FileText, X, History, DollarSign, Activity, TrendingUp } from "lucide-react";

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
  [key: string]: string | number | undefined; // For years and months
};

type ShareStats = {
  totalFund: number;
  monthlyChart: { name: string; value: number }[];
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
  
  const [selectedMember, setSelectedMember] = useState<ShareRow | null>(null);

  useEffect(() => {
    fetchShares();
  }, []);

  const fetchShares = async () => {
    try {
      setLoading(true);
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "admin_get_shares_report" })
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

  const filteredData = useMemo(() => {
    const filtered = data.filter(row => 
      String(row["ชื่อ"] || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(row["ID_No"] || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

    return filtered.sort((a, b) => {
      const aVal = a[sortConfig.key] || "";
      const bVal = b[sortConfig.key] || "";
      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [data, searchQuery, sortConfig]);

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc"
    }));
  };

  const exportCSV = () => {
    if (data.length === 0) return;
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(","),
      ...data.map(row => headers.map(h => `"${row[h] || 0}"`).join(","))
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `ikuwah_shares_report_${new Date().getFullYear()}.csv`;
    link.click();
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortConfig.key !== column) return <ArrowUpDown size={14} className="inline ml-1 text-slate-300" />;
    return sortConfig.direction === "asc" ?
      <ArrowUp size={14} className="inline ml-1 text-sky-500" /> :
      <ArrowDown size={14} className="inline ml-1 text-sky-500" />;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-slate-50/50 min-h-screen space-y-8 font-sans">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">ระบบจัดเก็บหุ้นบัญชีส่วนตัว</h1>
          <p className="text-slate-500 mt-1 font-medium">จัดการกองทุนและดู Statement หุ้นสมาชิกรายบุคคลระดับองค์กร</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchShares}
            className="flex items-center justify-center gap-2 bg-white text-slate-700 font-bold px-5 py-2.5 rounded-xl border border-slate-200 shadow-sm hover:bg-slate-50 transition-all active:scale-95"
          >
            <Loader2 className={`w-4 h-4 ${loading ? 'animate-spin text-sky-500' : ''}`} />
            รีเฟรชข้อมูล
          </button>
          <button 
            onClick={exportCSV}
            className="flex items-center justify-center gap-2 bg-slate-900 text-white font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-slate-200 hover:bg-slate-800 transition-all active:scale-95"
          >
            <Download className="w-4 h-4" />
            Excel
          </button>
        </div>
      </div>

      {/* Modern Mini-KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-indigo-500 to-blue-600 p-6 rounded-3xl text-white shadow-xl shadow-indigo-200/50 relative overflow-hidden group">
          <div className="absolute -right-6 -bottom-6 opacity-20 group-hover:scale-110 transition-transform duration-500">
            <Wallet size={120} />
          </div>
          <div className="relative z-10">
            <p className="text-indigo-50 text-xs font-bold uppercase tracking-widest mb-1">ยอดหุ้นสะสมรวม (ทั้งหมด)</p>
            <h3 className="text-4xl font-black tracking-tight mt-2 flex items-baseline gap-2">
              <span className="text-xl font-bold bg-white/20 px-2 py-1 rounded-xl">฿</span>
              {(stats?.totalFund || 0).toLocaleString()}
            </h3>
            <p className="mt-4 text-xs bg-black/10 inline-block px-3 py-1.5 rounded-full font-medium">
              ยอดสุทธิ ณ ปัจจุบัน
            </p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm flex flex-col justify-between hover:border-sky-200 transition-colors">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">สมาชิกทั้งหมด</p>
              <h3 className="text-3xl font-black text-slate-800">{data.length} <span className="text-lg text-slate-400 font-bold">บัญชี</span></h3>
            </div>
            <div className="bg-sky-50 p-3 rounded-2xl text-sky-500">
              <Users size={24} />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm text-slate-500 font-medium bg-slate-50 p-2 rounded-xl">
            <Activity size={16} className="text-emerald-500" /> อัตราการฝากปกติ
          </div>
        </div>
      </div>

      {/* Main Members List */}
      <div className="bg-white rounded-3xl shadow-lg shadow-slate-200/40 border border-slate-100 overflow-hidden flex flex-col">
        <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white">
          <h2 className="text-lg sm:text-xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="text-sky-500" size={20} />
            ทะเบียนสมาชิกรายบุคคล
          </h2>
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="ค้นหาชื่อ หรือ รหัสสมาชิก..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-11 pr-4 py-2 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition-all font-medium text-slate-700"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th onClick={() => handleSort("lineName")} className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-widest cursor-pointer hover:bg-slate-200 transition-colors whitespace-nowrap">
                  โปรไฟล์ / ชื่อไลน์ <SortIcon column="lineName"/>
                </th>
                <th onClick={() => handleSort("ชื่อ")} className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-widest cursor-pointer hover:bg-slate-200 transition-colors">
                  ข้อมูลสมาชิก <SortIcon column="ชื่อ"/>
                </th>
                <th onClick={() => handleSort("Phone")} className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-widest cursor-pointer hover:bg-slate-200 transition-colors hidden md:table-cell">
                  เบอร์โทร <SortIcon column="Phone"/>
                </th>
                <th onClick={() => handleSort("สถานะ")} className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-widest cursor-pointer hover:bg-slate-200 transition-colors text-center hidden sm:table-cell">
                  สถานะ <SortIcon column="สถานะ"/>
                </th>
                <th onClick={() => handleSort("รวมยอดทั้งหมด")} className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-widest cursor-pointer hover:bg-slate-200 transition-colors text-right">
                  หุ้นสะสม <SortIcon column="รวมยอดทั้งหมด"/>
                </th>
                <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">
                  ข้อมูลบัญชี
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center text-slate-400">
                     <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-sky-500" />
                     <p className="font-semibold text-sm">กำลังโหลดข้อมูลบัญชีทั้งหมด...</p>
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center text-slate-400 font-medium">ไม่พบข้อมูลบัญชีที่ค้นหา</td>
                </tr>
              ) : (
                filteredData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-sky-50/30 transition-colors group">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-4">
                        {row.pictureUrl ? (
                          <img 
                            src={row.pictureUrl} 
                            alt={row.lineName || "Profile"} 
                            className="w-12 h-12 rounded-full border-2 border-white shadow-sm object-cover bg-slate-100 shrink-0" 
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 border-2 border-white shadow-sm flex items-center justify-center shrink-0">
                            <Users size={24} />
                          </div>
                        )}
                        <div>
                          {row.lineName && row.lineName.trim() !== "" ? (
                            <p className="font-bold text-slate-800 line-clamp-1 text-[15px]">{row.lineName}</p>
                          ) : (
                            <p className="font-bold text-amber-600 line-clamp-1 text-xs px-2 py-0.5 bg-amber-50 rounded-full border border-amber-200 inline-block">ยังไม่ยืนยันตัวตน (LINE)</p>
                          )}
                          <p className="text-xs text-slate-400 font-medium mt-0.5">
                            {row.lineUserId ? `รหัส: ${row.lineUserId.substring(0,8)}...` : (row["ID_No"] || "ไม่มีรหัส")}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div>
                        <p className="font-bold text-slate-800 text-[15px]">{row.prefix} {row["ชื่อ"]}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                          <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-medium">{row["Phone"] || "ไม่มีเบอร์"}</span>
                          <span className="text-slate-300">|</span>
                          <span className="text-slate-500">บัตร: {row.idCard || "-"}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-slate-500 text-sm font-medium hidden md:table-cell">
                      {row["Phone"] || "—"}
                    </td>
                    <td className="py-4 px-6 text-center hidden sm:table-cell">
                      <span className={`inline-flex px-3 py-1 rounded-full text-[11px] font-black tracking-wide ${row["สถานะ"] === "ปกติ" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                        {row["สถานะ"]}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <p className="font-black text-slate-800 text-base">
                        ฿ {(Number(row["รวมยอดทั้งหมด"]) || 0).toLocaleString()}
                      </p>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <button 
                        onClick={() => setSelectedMember(row)}
                        className="inline-flex items-center gap-1.5 bg-white border border-slate-200 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 text-slate-600 font-bold px-4 py-2 rounded-xl transition-all text-sm shadow-sm hover:shadow active:scale-95"
                      >
                        <FileText size={15} /> Statement
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="bg-slate-50 p-4 border-t border-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider flex justify-between items-center">
          <p>แสดงผล {filteredData.length} จาก {data.length} บัญชี</p>
        </div>
      </div>

      {/* STATEMENT MODAL (Passbook Style) */}
      {selectedMember && (
        <div 
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300"
          onClick={() => setSelectedMember(null)}
        >
          {/* Print Styles injected locally for this modal */}
          <style dangerouslySetInnerHTML={{__html: `
            @media print {
              body * { visibility: hidden; }
              #printable-statement, #printable-statement * { visibility: visible; border-color: #e2e8f0 !important; }
              #printable-statement { position: absolute; left: 0; top: 0; width: 100%; height: auto; box-shadow: none !important; }
              .print-hide { display: none !important; }
            }
          `}} />

          <div 
            id="printable-statement"
            className="bg-white w-full max-w-4xl sm:rounded-[2rem] rounded-t-[2rem] shadow-2xl flex flex-col max-h-[95vh] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-5 sm:slide-in-from-bottom-0 duration-300"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-slate-900 px-6 py-5 sm:px-8 sm:py-6 flex justify-between items-center text-white shrink-0">
              <div className="flex items-center gap-4">
                <div className="bg-white/10 p-3.5 rounded-2xl print-hide">
                  <FileText className="text-white" size={24} />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight">Statement บัญชีหุ้นส่วนบุคคล</h2>
                  <p className="text-sky-400 font-bold text-xs uppercase tracking-widest mt-1">สหกรณ์กองทุนบัญชีหุ้น</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => window.print()}
                  className="print-hide flex items-center gap-2 bg-sky-500 hover:bg-sky-400 text-white px-5 py-2.5 rounded-xl font-bold transition-all hover:shadow-lg hover:shadow-sky-500/30 active:scale-95"
                >
                  <Printer size={18} /> <span className="hidden sm:inline">พิมพ์เอกสาร</span>
                </button>
                <button 
                  onClick={() => setSelectedMember(null)}
                  className="print-hide p-2 bg-white/10 hover:bg-white/20 hover:text-rose-400 rounded-full transition-colors"
                >
                  <X size={22} />
                </button>
              </div>
            </div>

            {/* Modal Body Scroll */}
            <div className="overflow-y-auto flex-1 p-5 sm:p-8 space-y-6 sm:space-y-8 bg-slate-50/50">
              
              {/* Info & Global KPI Block */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Profile Card */}
                <div className="lg:col-span-1 bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-bl-[4rem] -z-10"></div>
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-5">ข้อมูลสมาชิก</h3>
                  <div className="space-y-5">
                    <div className="flex items-center gap-4 relative z-10">
                      {selectedMember.pictureUrl ? (
                         <img src={selectedMember.pictureUrl} className="w-16 h-16 rounded-full border-4 border-white shadow-sm object-cover" />
                      ) : (
                         <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center border-4 border-white shadow-sm"><Users size={32}/></div>
                      )}
                      <div>
                         <p className="font-black text-slate-800 tracking-tight text-lg leading-tight">{selectedMember.lineName || "ไม่ระบุชื่อไลน์"}</p>
                         <p className="text-xs text-slate-500 font-medium">{selectedMember.lineUserId ? `LINE ID: ${selectedMember.lineUserId.substring(0,10)}...` : "ไม่มีข้อมูล LINE ID"}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-500 uppercase tracking-widest font-bold mb-1">รหัสบัญชีภายใน</p>
                      <p className="font-black text-indigo-900 text-xl tracking-tight">{selectedMember["ID_No"] || "ไม่มีรหัส"}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-500 uppercase tracking-widest font-bold mb-1">ข้อมูลยืนยันตัวตน</p>
                      <p className="font-bold text-slate-800 text-lg">{selectedMember.prefix} {selectedMember["ชื่อ"]}</p>
                      <p className="text-sm text-slate-500 font-medium">บัตร ปชช: {selectedMember.idCard || "-"} | โทร: {selectedMember["Phone"] || "-"}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-black tracking-wide ${selectedMember["สถานะ"] === "ปกติ" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-600"}`}>
                        สถานะ: {selectedMember["สถานะ"]}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Main Balances */}
                <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  {/* Total Deposited */}
                  <div className="bg-sky-50 p-6 rounded-[2rem] border border-sky-100 flex flex-col justify-center relative overflow-hidden">
                    <div className="absolute right-0 bottom-0 opacity-10">
                       <Wallet size={120} className="translate-x-4 translate-y-4" />
                    </div>
                    <p className="text-sky-600/80 text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                       <Wallet size={14} /> ยอดฝากสะสมทั้งหมด
                    </p>
                    <h3 className="text-4xl sm:text-5xl font-black text-sky-700 tracking-tighter">
                      <span className="text-xl sm:text-2xl mr-1 font-bold">฿</span>
                      {(Number(selectedMember["รวมยอดทั้งหมด"]) || 0).toLocaleString()}
                    </h3>
                  </div>

                  {/* Sub Balances */}
                  <div className="space-y-4 flex flex-col">
                    <div className="flex-1 bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm flex items-center justify-between">
                      <div>
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">ยอดถอนสุทธิ</p>
                        <h4 className="text-2xl font-black text-rose-500">฿ {(Number(selectedMember["ถอนเงิน"]) || 0).toLocaleString()}</h4>
                      </div>
                      <div className="bg-rose-50 p-3 rounded-2xl text-rose-500"><History size={24}/></div>
                    </div>
                    <div className="flex-1 bg-emerald-500 p-5 rounded-[2rem] shadow-lg shadow-emerald-200 flex items-center justify-between text-white relative overflow-hidden">
                      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
                      <div className="relative z-10">
                        <p className="text-emerald-100 text-[10px] font-black uppercase tracking-widest mb-1 pt-1">เงินคงเหลือสามารถใช้งานได้</p>
                        <h4 className="text-2xl font-black">฿ {(Number(selectedMember["รวมเงินคงเหลือ"]) || 0).toLocaleString()}</h4>
                      </div>
                      <div className="bg-black/10 p-3 rounded-2xl relative z-10"><DollarSign size={24}/></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Monthly Heatmap / Passbook Grid */}
              <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-indigo-100 text-indigo-600 p-2 rounded-xl"><FileText size={16} /></div>
                    <h3 className="font-bold text-slate-800">แจกแจงรายการฝาก (รายเดือน)</h3>
                  </div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">การเคลื่อนไหวปีล่าสุด</span>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {monthNamesThai.map((month, idx) => {
                      const amount = Number(selectedMember[month]) || 0;
                      return (
                        <div key={idx} className={`p-4 rounded-2xl border transition-all ${amount > 0 ? "border-emerald-200 bg-emerald-50/30" : "border-slate-100 bg-slate-50/50"}`}>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex justify-between items-center">
                            {month}
                            {amount > 0 && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>}
                          </p>
                          <p className={`text-[17px] font-black tracking-tight ${amount > 0 ? "text-emerald-600" : "text-slate-300"}`}>
                            {amount > 0 ? `฿${amount.toLocaleString()}` : "—"}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Historical Year Summaries */}
              <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-5">
                  <History size={16} /> สรุปยอดสะสมย้อนหลัง (รายปี)
                </h3>
                <div className="flex flex-wrap gap-3">
                  {Object.keys(selectedMember)
                    .filter(k => k.startsWith("ปี") && Number(selectedMember[k]) > 0)
                    .sort()
                    .map((yearKey, idx) => (
                      <div key={idx} className="bg-slate-50 border border-slate-200 px-5 py-3 rounded-2xl flex items-center gap-4 hover:border-sky-300 transition-colors">
                        <div className="bg-white border border-slate-200 px-3 py-1 rounded-lg text-slate-400 font-bold text-[10px] tracking-widest uppercase">
                          {yearKey}
                        </div>
                        <div className="font-black text-slate-700 text-lg">
                          ฿{(Number(selectedMember[yearKey]) || 0).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  {Object.keys(selectedMember).filter(k => k.startsWith("ปี") && Number(selectedMember[k]) > 0).length === 0 && (
                    <div className="text-sm font-medium text-slate-400 p-4 border border-dashed border-slate-200 rounded-2xl w-full text-center bg-slate-50">
                      ไม่มีประวัติรายการย้อนหลังข้ามปีที่แสดงยอดเงินสะสม
                    </div>
                  )}
                </div>
              </div>

              {/* Print Footer Signature (Only visible on print) */}
              <div className="hidden print-hide mt-16 pt-8 border-t border-slate-200" style={{display: 'none'}} id="print-signature">
                <div className="flex justify-between px-16">
                  <div className="text-center w-64">
                    <p className="mb-12 border-b border-dashed border-slate-400"></p>
                    <p className="font-bold text-sm">( ..................................................... )</p>
                    <p className="text-xs text-slate-500 mt-1 font-medium">เจ้าหน้าที่กองทุน / ผู้ออกรายงาน</p>
                  </div>
                  <div className="text-center w-64">
                    <p className="mb-12 border-b border-dashed border-slate-400"></p>
                    <p className="font-bold text-sm">( {selectedMember["ชื่อ"]} )</p>
                    <p className="text-xs text-slate-500 mt-1 font-medium">ลายมือชื่อสมาชิกยืนยันยอด</p>
                  </div>
                </div>
                <p className="text-center text-[11px] font-bold text-slate-400 mt-12 bg-slate-50 py-2 rounded-xl">
                  พิมพ์จากระบบฐานข้อมูล IQ-SAHAM วันที่ {new Date().toLocaleDateString('th-TH')} เวลา {new Date().toLocaleTimeString('th-TH')}
                </p>
              </div>

              {/* Hack to force show print footer ONLY when printing */}
              <style dangerouslySetInnerHTML={{__html: `
                @media print {
                  #print-signature { display: block !important; }
                }
              `}} />

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
