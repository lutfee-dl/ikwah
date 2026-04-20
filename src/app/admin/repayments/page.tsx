"use client";

import { useState, useMemo, useEffect } from "react";
import { Search, X, XCircle, Receipt, CheckCircle, Loader2, ExternalLink } from "lucide-react";
import toast from "react-hot-toast";
import { NumericFormat } from "react-number-format";
import Swal from "sweetalert2";

type RepaymentSlip = {
  id: string;
  lineUserId: string;
  name: string;
  amount: number;
  date: string;
  status: "pending" | "approved" | "rejected";
  slipUrl: string;
};

type Contract = {
  id: string;
  lineUserId: string;
  name: string;
  type: string;
  amount: number;
  balance: number;
  status: string;
};

type FilterStatus = "pending" | "approved" | "rejected" | "all";

export default function RepaymentsPage() {
  const [repayments, setRepayments] = useState<RepaymentSlip[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("pending");
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedPay, setSelectedPay] = useState<RepaymentSlip | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  
  const [selectedContractId, setSelectedContractId] = useState("");
  const [editAmount, setEditAmount] = useState(0);

  const fetchRepaymentSlips = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "admin_get_repayment_slips" })
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
        body: JSON.stringify({ action: "admin_get_contracts" })
      });
      const data = await res.json();
      if (data.success) {
        // Map GAS array [id, reqId, date, userId, name, type, amount, profit, total, monthly, duration, paid, balance, status, lineName]
        const mapped = data.data.map((row: any) => ({
          id: row[0],
          lineUserId: row[3],
          name: row[4],
          type: row[5],
          amount: Number(row[8]),
          balance: Number(row[12]),
          status: row[13]
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

  const filteredData = useMemo(() => {
    return repayments.filter((r) => {
      const matchStatus = filterStatus === "all" || r.status === filterStatus;
      const matchSearch = (r.name || "").includes(searchQuery) || (r.id || "").includes(searchQuery);
      return matchStatus && matchSearch;
    });
  }, [repayments, filterStatus, searchQuery]);

  const memberActiveContracts = useMemo(() => {
    if (!selectedPay) return [];
    return contracts.filter(c => c.lineUserId === selectedPay.lineUserId && c.status === "กำลังผ่อน");
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
    setSelectedContractId("");
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
          className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all hover:border-slate-300"
        >
          <Loader2 size={16} className={loading ? "animate-spin" : ""} />
          รีเฟรชข้อมูล
        </button>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-3xl shadow-sm border border-slate-100">
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
            placeholder="รหัสโอน, ชื่อผู้กู้..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200">
                <th className="py-4 px-6 font-semibold text-slate-600 text-sm">ข้อมูล</th>
                <th className="py-4 px-6 font-semibold text-slate-600 text-sm">สมาชิก</th>
                <th className="py-4 px-6 font-semibold text-slate-600 text-sm text-right">ยอดชำระ</th>
                <th className="py-4 px-6 font-semibold text-slate-600 text-sm text-center">สถานะ</th>
                <th className="py-4 px-6 font-semibold text-slate-600 text-sm text-center">ตรวจสลิป</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="py-12 text-center text-slate-400">กำลังโหลด...</td></tr>
              ) : filteredData.length === 0 ? (
                <tr><td colSpan={5} className="py-12 text-center text-slate-400">ไม่พบรายการ...</td></tr>
              ) : (
                filteredData.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-6">
                      <p className="font-semibold text-slate-700">{item.id}</p>
                      <p className="text-xs text-slate-500">{item.date}</p>
                    </td>
                    <td className="py-4 px-6">
                      <p className="font-medium text-slate-700">{item.name}</p>
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
                            ? "bg-sky-50 text-sky-600 hover:bg-sky-500 hover:text-white border border-sky-100"
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

      {isModalOpen && selectedPay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-5 border-b border-slate-100">
              <h3 className="font-bold text-lg text-slate-800">บันทึกรับชำระค่างวด</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:bg-slate-100 p-2 rounded-full">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-5 overflow-y-auto">
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl text-sm space-y-2">
                <div className="flex justify-between"><span className="text-slate-500">รหัสสลิป:</span><span className="font-bold">{selectedPay.id}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">ผู้ชำระ:</span><span className="font-bold text-slate-800">{selectedPay.name}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">วันที่แจ้ง:</span><span className="font-medium text-slate-600">{selectedPay.date}</span></div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">เลือกสัญญาที่ต้องการตัดยอด</label>
                {memberActiveContracts.length > 0 ? (
                  <select 
                    value={selectedContractId}
                    onChange={(e) => setSelectedContractId(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-sky-500 focus:outline-none transition-all"
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
                    <XCircle size={18} /> ไม่บพบสัญญาที่กำลังผ่อนอยู่ของสมาชิกรายนี้
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">ยอดเงินชำระ (แก้ไขได้)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">฿</span>
                  <NumericFormat
                    thousandSeparator={true}
                    value={editAmount}
                    onValueChange={(values) => {
                      setEditAmount(values.floatValue || 0);
                    }}
                    className="w-full bg-sky-50 border-2 border-sky-100 rounded-2xl px-8 py-3 text-2xl font-black text-sky-600 text-right focus:bg-white focus:border-sky-500 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">หลักฐานสลิป</p>
                <div className="bg-slate-100 rounded-2xl overflow-hidden border border-slate-200">
                  <img src={getDriveImageUrl(selectedPay.slipUrl)} alt="slip" className="w-full max-h-60 object-contain hover:scale-105 transition-transform duration-500 cursor-zoom-in" />
                </div>
                <a href={selectedPay.slipUrl} target="_blank" className="mt-2 text-xs text-sky-600 font-bold flex items-center gap-1 justify-center">
                  <ExternalLink size={12} /> เปิดดูรูปต้นฉบับ
                </a>
              </div>
            </div>

            <div className="p-5 border-t border-slate-100 bg-white">
              {selectedPay.status === "pending" ? (
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={handleReject} disabled={isUpdating} className="flex justify-center items-center gap-2 py-3.5 bg-rose-50 text-rose-600 font-bold rounded-2xl border border-rose-100 hover:bg-rose-100 transition-all disabled:opacity-50">
                    {isUpdating ? <Loader2 size={18} className="animate-spin" /> : <XCircle size={18} />} ปฏิเสธ
                  </button>
                  <button onClick={handleApprove} disabled={isUpdating || !selectedContractId} className="flex justify-center items-center gap-2 py-3.5 bg-sky-500 text-white font-bold rounded-2xl shadow-lg shadow-sky-200 hover:bg-sky-600 transition-all disabled:opacity-50 disabled:shadow-none">
                    {isUpdating ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />} อนุมัติยอด
                  </button>
                </div>
              ) : (
                <button onClick={() => setIsModalOpen(false)} className="w-full py-3.5 bg-slate-100 text-slate-700 font-bold rounded-2xl hover:bg-slate-200 transition-all">
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
