"use client";

import { useState, useEffect } from "react";
import { Search, CheckCircle2, TrendingUp, Eye } from "lucide-react";
import { toast } from "react-hot-toast";
import ContractDetailModal from "./ContractDetailModal";

interface Contract {
  contractId: string;
  requestId: string;
  approvedDate: string;
  lineUserId: string;
  fullName: string;
  loanType: string;
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
  
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);

  useEffect(() => {
    fetchContracts();
  }, []);

  const fetchContracts = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "admin_get_contracts" }),
      });
      const result = await res.json();
      
      if (result.success && Array.isArray(result.data)) {
        const mapped = result.data.map((row: unknown[]) => ({
          contractId: String(row[0] || ""),
          requestId: String(row[1] || ""),
          approvedDate: String(row[2] || ""),
          lineUserId: String(row[3] || ""),
          fullName: String(row[4] || ""),
          loanType: String(row[5] || ""),
          principalAmount: Number(row[6] || 0),
          profitAmount: Number(row[7] || 0),
          totalPayable: Number(row[8] || 0),
          installmentPerMonth: Number(row[9] || 0),
          totalInstallments: Number(row[10] || 0),
          totalPaidAmount: Number(row[11] || 0),
          remainingBalance: Number(row[12] || 0),
          status: String(row[13] || "กำลังผ่อน"),
        }));
        setContracts(mapped);
      } else {
        if (!result.success && result.msg) {
             toast.error(result.msg);
        }
        setContracts([]);
      }
    } catch (error) {
      console.error(error);
      toast.error("ดึงข้อมูลสัญญาไม่สำเร็จ");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredContracts = contracts.filter((c) => {
    const matchStatus = filterStatus === "all" || c.status === filterStatus;
    const matchSearch =
      c.fullName.includes(searchTerm) ||
      c.contractId.includes(searchTerm) ||
      c.lineUserId.includes(searchTerm);
    return matchStatus && matchSearch;
  });

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">ทะเบียนสัญญา / ซื้อขายสินค้า</h1>
          <p className="text-slate-500 text-sm mt-1">ดูรายการหนี้สินทั้งหมด การผ่อนชำระ และยอดคงเหลือแต่ละบุคคล</p>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex bg-slate-100 p-1 rounded-xl overflow-x-auto no-scrollbar w-full sm:w-auto">
            {[
              { id: "all", label: "ทั้งหมด" },
              { id: "กำลังผ่อน", label: "กำลังผ่อนชำระ" },
              { id: "ปิดยอดแล้ว", label: "ปิดยอดแล้ว" },
              { id: "ค้างชำระ", label: "ค้างชำระ" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id)}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  filterStatus === tab.id
                    ? "bg-white text-sky-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหาชื่อ, รหัสสัญญา..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-sky-500 text-sm outline-none"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200">
                <th className="py-4 px-6 font-semibold text-slate-600 text-sm whitespace-nowrap">รหัสสัญญา</th>
                <th className="py-4 px-6 font-semibold text-slate-600 text-sm">ผู้กู้</th>
                <th className="py-4 px-6 font-semibold text-slate-600 text-sm">ประเภท</th>
                <th className="py-4 px-6 font-semibold text-slate-600 text-sm">ยอดชำระต่อเดือน</th>
                <th className="py-4 px-6 font-semibold text-slate-600 text-sm">ยอดคงเหลือ</th>
                <th className="py-4 px-6 font-semibold text-slate-600 text-sm text-center">สถานะ</th>
                <th className="py-4 px-6 font-semibold text-slate-600 text-sm text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={7} className="py-12 text-center text-slate-400">กำลังโหลดข้อมูลสัญญา...</td></tr>
              ) : filteredContracts.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-slate-400">ยังไม่มีข้อมูลสัญญา</td></tr>
              ) : (
                filteredContracts.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-6 text-slate-700 font-mono text-xs">{item.contractId}</td>
                    <td className="py-4 px-6 text-slate-700 font-medium">
                      {item.fullName}
                      <p className="text-[10px] text-slate-400 mt-0.5">{item.lineUserId.substring(0,8)}...</p>
                    </td>
                    <td className="py-4 px-6">
                      <span className="bg-blue-50 text-blue-600 border border-blue-100 px-2 py-1 rounded text-xs font-semibold">
                        {item.loanType}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-medium text-slate-700">
                      {item.installmentPerMonth.toLocaleString()} ฿
                      <span className="text-xs text-slate-400 ml-1">({item.totalInstallments} งวด)</span>
                    </td>
                    <td className="py-4 px-6 font-bold text-rose-600">
                      {item.remainingBalance.toLocaleString()} ฿
                    </td>
                     <td className="py-4 px-6 text-center">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                          item.status === "ปิดยอดแล้ว" ? "bg-emerald-100 text-emerald-700" :
                          item.status === "กำลังผ่อน" ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"
                      }`}>
                         {item.status === "ปิดยอดแล้ว" ? <CheckCircle2 size={12}/> : <TrendingUp size={12}/>}
                         {item.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                       <button 
                         onClick={() => setSelectedContract(item)}
                         className="p-2 text-sky-600 hover:bg-sky-50 rounded-lg transition-colors inline-flex items-center justify-center border border-sky-200"
                        >
                         <Eye size={16} className="mr-1"/> เปิดดู
                       </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedContract && (
        <ContractDetailModal 
          contract={selectedContract} 
          onClose={() => setSelectedContract(null)} 
          onRepaymentAdded={fetchContracts}
        />
      )}
    </div>
  );
}
