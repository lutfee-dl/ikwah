"use client";

import { useState, useMemo } from "react";
import { Search, X, XCircle, Receipt, CheckCircle } from "lucide-react";

const mockRepayments = [
  { id: "PAY001", loanId: "L002", name: "สุดที่รัก พิทักษ์ไทย", type: "กัรฏฮะซัน", amount: 2500, period: "งวดที่ 1/12 (พ.ย. 66)", date: "15/11/2023", status: "pending", slipUrl: "https://placehold.co/400x600/e2e8f0/64748b.png?text=Slip+Pay1" },
  { id: "PAY002", loanId: "L001", name: "อนุชา รักสงบ", type: "ฉุกเฉิน", amount: 2500, period: "งวดที่ 3/6 (พ.ย. 66)", date: "10/11/2023", status: "approved", slipUrl: "https://placehold.co/400x600/e2e8f0/64748b.png?text=Slip+Pay2" },
  { id: "PAY003", loanId: "L005", name: "สมชาย ใจดี", type: "ซื้อขาย", amount: 4500, period: "งวดที่ 5/24 (พ.ย. 66)", date: "12/11/2023", status: "pending", slipUrl: "https://placehold.co/400x600/e2e8f0/64748b.png?text=Slip+Pay3" },
];

type FilterStatus = "pending" | "approved" | "rejected" | "all";

export default function RepaymentsPage() {
  const [repayments, setRepayments] = useState(mockRepayments);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("pending");
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedPay, setSelectedPay] = useState<typeof mockRepayments[0] | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filteredData = useMemo(() => {
    return repayments.filter((r) => {
      const matchStatus = filterStatus === "all" || r.status === filterStatus;
      const matchSearch = r.name.includes(searchQuery) || r.loanId.includes(searchQuery) || r.id.includes(searchQuery);
      return matchStatus && matchSearch;
    });
  }, [repayments, filterStatus, searchQuery]);

  const handleApprove = (id: string) => {
    setRepayments((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "approved" } : r))
    );
    setIsModalOpen(false);
  };

  const handleReject = (id: string) => {
    setRepayments((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "rejected" } : r))
    );
    setIsModalOpen(false);
  };

  const openDetails = (pay: typeof mockRepayments[0]) => {
    setSelectedPay(pay);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6 relative">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">ตรวจสอบชำระค่างวด</h1>
          <p className="text-slate-500 text-sm mt-1">
            ตรวจสลิปยืนยันการจ่ายค่างวดสินเชื่อของสมาชิก
          </p>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto overflow-x-auto no-scrollbar">
            {[
              { id: "pending", label: "รอตรวจสลิป" },
              { id: "approved", label: "รับชำระแล้ว" },
              { id: "rejected", label: "มีปัญหา/รอเคลียร์" },
              { id: "all", label: "รายการทั้งหมด" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id as FilterStatus)}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  filterStatus === tab.id
                    ? "bg-white text-sky-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {tab.label}
                {tab.id === "pending" && repayments.filter(r => r.status === "pending").length > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold text-white bg-rose-500 rounded-full">
                    {repayments.filter(r => r.status === "pending").length}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="รหัสโอน, รหัสกู้, ชื่อผู้กู้..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-sm"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200">
                <th className="py-4 px-6 font-semibold text-slate-600 text-sm">ข้อมูลการชำระ</th>
                <th className="py-4 px-6 font-semibold text-slate-600 text-sm">ผู้กู้ (รหัสสัญญา)</th>
                <th className="py-4 px-6 font-semibold text-slate-600 text-sm">งวดที่ส่ง/ประเภท</th>
                <th className="py-4 px-6 font-semibold text-slate-600 text-sm text-right">ยอดชำระเบิก</th>
                <th className="py-4 px-6 font-semibold text-slate-600 text-sm text-center">สถานะ</th>
                <th className="py-4 px-6 font-semibold text-slate-600 text-sm text-center">ตรวจสลิป</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.length === 0 ? (
                <tr><td colSpan={6} className="py-12 text-center text-slate-400">ไม่พบรายการ...</td></tr>
              ) : (
                filteredData.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-6">
                      <p className="font-semibold text-slate-700">{item.id}</p>
                      <p className="text-xs text-slate-500">{item.date}</p>
                    </td>
                    <td className="py-4 px-6">
                      <p className="font-medium text-slate-700">{item.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">สัญญา: {item.loanId}</p>
                    </td>
                    <td className="py-4 px-6">
                      <p className="text-sm font-semibold text-slate-700">{item.period}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold border border-slate-200">
                        {item.type}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right font-bold text-sky-600">
                      {item.amount.toLocaleString()} ฿
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${
                        item.status === "pending" ? "bg-amber-100 text-amber-700" : 
                        item.status === "approved" ? "bg-emerald-100 text-emerald-700" :
                        "bg-rose-100 text-rose-700"
                      }`}>
                        {item.status === "pending" ? "รอตรวจสลิป" : item.status === "approved" ? "รับชำระแล้ว" : "มีปัญหา"}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <button
                        onClick={() => openDetails(item)}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                          item.status === "pending"
                            ? "bg-sky-50 text-sky-600 hover:bg-sky-500 hover:text-white border border-sky-100 hover:border-sky-500"
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
      </div>

      {/* Modal View details */}
      {isModalOpen && selectedPay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in">
            <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Receipt className="text-sky-500" size={20} />
                บันทึกรับชำระค่างวด
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:bg-slate-200 p-1.5 rounded-full"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl text-sm space-y-2">
                <div className="flex justify-between"><span className="text-slate-500">รหัสการโอน:</span><span className="font-bold">{selectedPay.id}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">สัญญา:</span><span className="font-bold text-sky-600">{selectedPay.loanId}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">ผู้ชำระ:</span><span className="font-medium text-slate-800">{selectedPay.name}</span></div>
                <div className="flex justify-between items-center border-t border-slate-200 pt-2 mt-2">
                  <span className="text-slate-500">ทำรายการสำหรับ:</span>
                  <span className="px-2 py-1 bg-amber-100 text-amber-800 rounded font-bold text-xs">{selectedPay.period}</span>
                </div>
                <div className="flex justify-between items-end pt-1">
                  <span className="font-medium text-slate-600">ยอดที่แจ้งโอน:</span>
                  <span className="font-bold text-xl text-sky-600">{selectedPay.amount.toLocaleString()} ฿</span>
                </div>
              </div>

              <div>
                <p className="text-slate-500 text-sm mb-2 text-center">สลิปหลักฐานการโอน</p>
                <div className="bg-slate-100 p-2 rounded-xl flex justify-center border">
                  <img src={selectedPay.slipUrl} alt="slip" className="max-h-64 object-contain rounded-lg shadow-sm" />
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100">
              {selectedPay.status === "pending" ? (
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => handleReject(selectedPay.id)} className="flex justify-center items-center gap-2 py-3 bg-rose-50 text-rose-600 font-bold rounded-xl border border-rose-200">
                    <XCircle size={18} /> สลิปมีปัญหา
                  </button>
                  <button onClick={() => handleApprove(selectedPay.id)} className="flex justify-center items-center gap-2 py-3 bg-emerald-500 text-white font-bold rounded-xl shadow-sm hover:bg-emerald-600 tracking-wide">
                    <CheckCircle size={18} /> ตัดยอดค่างวด
                  </button>
                </div>
              ) : (
                <button onClick={() => setIsModalOpen(false)} className="w-full py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200">
                  ปิดหน้าต่าง
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
