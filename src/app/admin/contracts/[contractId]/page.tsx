"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  History,
  PlusCircle,
  Receipt,
  User,
  CheckCircle2,
  Calendar,
  Wallet,
  ArrowRight,
  LayoutGrid,
  ChevronLeft
} from "lucide-react";
import { toast } from "react-hot-toast";
import Swal from "sweetalert2";
import Link from "next/link";

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
  items: string;
}

interface Repayment {
  receiptId: string;
  date: string;
  installmentNo: string;
  amount: number;
  status: string;
  approver: string;
}

export default function ContractDetailPage() {
  const params = useParams();
  const router = useRouter();
  const contractId = params.contractId as string;

  const [contract, setContract] = useState<Contract | null>(null);
  const [isLoadingContract, setIsLoadingContract] = useState(true);

  const [repayments, setRepayments] = useState<Repayment[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isAddingRepayment, setIsAddingRepayment] = useState(false);

  // Form states
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [installmentNo, setInstallmentNo] = useState("");

  const fetchContract = useCallback(async () => {
    setIsLoadingContract(true);
    try {
      const res = await fetch("/api/member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "admin_get_contracts" }),
      });
      const result = await res.json();
      if (result.success && Array.isArray(result.data)) {
        const found = result.data.find((row: unknown[]) => String(row[0] || "") === contractId);
        if (found) {
          const totalPaidAmount = Number(found[11] || 0);
          const installmentPerMonth = Number(found[9] || 0);
          const totalInstallments = Number(found[10] || 0);
          const approvedDateStr = String(found[2] || "");
          let status = String(found[13] || "กำลังผ่อน");

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
          if (status !== "ปิดยอดแล้ว" && totalPaidAmount >= Number(found[8] || 0) && Number(found[8] || 0) > 0) {
            status = "ปิดยอดแล้ว";
          }

          const parsedContract: Contract = {
            contractId: String(found[0] || ""),
            requestId: String(found[1] || ""),
            approvedDate: approvedDateStr,
            lineUserId: String(found[3] || ""),
            fullName: String(found[4] || ""),
            loanType: String(found[5] || ""),
            principalAmount: Number(found[6] || 0),
            profitAmount: Number(found[7] || 0),
            totalPayable: Number(found[8] || 0),
            installmentPerMonth,
            totalInstallments,
            totalPaidAmount,
            remainingBalance: Number(found[12] || 0),
            status,             // Using Auto-computed status
            items: String(found[15] || "ทั่วไป"),
          };

          setContract(parsedContract);
          setAmountPaid(parsedContract.installmentPerMonth);
        } else {
          toast.error("ไม่พบข้อมูลสัญญา");
        }
      }
    } catch (error) {
      toast.error("ดึงข้อมูลสัญญาไม่สำเร็จ");
    } finally {
      setIsLoadingContract(false);
    }
  }, [contractId]);

  const fetchRepayments = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch("/api/member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "admin_get_repayments",
          contractId,
        }),
      });
      const result = await res.json();
      if (result.success) {
        const mapped = result.data.map((row: unknown[]) => ({
          receiptId: String(row[0] || ""),
          date: String(row[1] || ""),
          installmentNo: String(row[4] || ""),
          amount: Number(row[5] || 0),
          status: String(row[7] || ""),
          approver: row[8],
        }));
        setRepayments(mapped);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [contractId]);

  useEffect(() => {
    fetchContract();
    fetchRepayments();
  }, [fetchContract, fetchRepayments]);

  const handleAddRepayment = async () => {
    if (!contract) return;
    if (!amountPaid || amountPaid <= 0) return toast.error("กรุณาระบุยอดเงินให้ถูกต้อง");

    if (amountPaid > contract.remainingBalance) {
      const confirmResult = await Swal.fire({
        title: 'ยอดรับชำระเกินหนี้คงเหลือ!',
        text: `ยอดที่ระบุ (${amountPaid.toLocaleString()} ฿) มากกว่าหนี้คงเหลือ (${contract.remainingBalance.toLocaleString()} ฿) คุณแน่ใจหรือไม่ที่จะบันทึกยอดนี้?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'ยืนยัน',
        cancelButtonText: 'ยกเลิก'
      });
      if (!confirmResult.isConfirmed) return;
    }

    setIsAddingRepayment(true);
    const tid = toast.loading("กำลังบันทึก...");
    try {
      const res = await fetch("/api/member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "admin_add_repayment",
          contractId: contract.contractId,
          lineUserId: contract.lineUserId,
          amountPaid,
          installmentNo: installmentNo || `ชำระค่างวด`,
          status: "ยืนยันแล้ว",
        }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success("บันทึกรับเงินเรียบร้อย", { id: tid });
        setInstallmentNo("");
        fetchContract();    // Refresh overall balance
        fetchRepayments();  // Refresh timeline
      } else {
        toast.error(result.msg || "เกิดข้อผิดพลาด", { id: tid });
      }
    } catch {
      toast.error("เซิร์ฟเวอร์ขัดข้อง", { id: tid });
    } finally {
      setIsAddingRepayment(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;

    return date.toLocaleDateString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "";

    return date.toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoadingContract) {
    return (
      <div className="min-h-screen p-4 lg:p-6 bg-slate-50/50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-slate-400">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-sky-500 rounded-full animate-spin"></div>
          <p className="font-medium animate-pulse">กำลังโหลดข้อมูลสัญญา...</p>
        </div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="min-h-screen p-4 lg:p-6 bg-slate-50/50 flex flex-col items-center justify-center text-center">
        <Receipt size={48} className="text-slate-300 mb-4" />
        <h3 className="text-xl font-bold text-slate-800 mb-2">ไม่พบสัญญา</h3>
        <p className="text-slate-500 mb-6">ไม่พบข้อมูลสัญญาที่คุณกำลังค้นหา อาจถูกลบไปแล้ว</p>
        <Link href="/admin/contracts" className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-sm">
          กลับไปหน้ารวมสัญญา
        </Link>
      </div>
    );
  }

  const paidPercent = Math.min((contract.totalPaidAmount / contract.totalPayable) * 100, 100);

  return (
    <div className="min-h-screen p-4 lg:p-6 font-sans text-slate-900 bg-slate-50/50 pb-20">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* --- Header --- */}
        <div className="flex items-center gap-4 mb-4">
          <Link href="/admin/contracts" className="p-2 bg-white border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors shadow-sm">
            <ChevronLeft size={24} />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-800">รายละเอียดสัญญา</h1>
            <p className="text-slate-500 text-sm mt-0.5">บริหารจัดการยอดชำระของ {contract.contractId}</p>
          </div>
        </div>

        {/* --- Body content --- */}
        {/* User Details & Initial Info Card */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-gradient-to-tr from-blue-100 to-indigo-50 rounded-full flex items-center justify-center text-blue-600 border border-white shadow-inner shrink-0">
              <User size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-lg font-black text-slate-800">{contract.fullName}</h4>
                <span className={`px-2 py-0.5 rounded-lg text-xs font-black border uppercase align-middle ${contract.loanType === 'ฉุกเฉิน' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                  contract.loanType === 'ก้อดฮาซัน' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                    'bg-blue-50 text-blue-600 border-blue-100'
                  }`}>
                  {contract.loanType}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mt-1">
                <span className="flex items-center gap-1 font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[10px] text-slate-600 font-bold uppercase">{contract.contractId}</span>
                <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                <span className="flex items-center gap-1"><Calendar size={12} className="text-slate-400" /> อนุมัติ: {contract.approvedDate}</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 px-4 py-3 rounded-2xl border border-slate-100 md:text-right flex items-center justify-between md:block">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">ยอดจัดสรรทั้งหมด</p>
            <p className="text-xl font-black text-slate-700">{contract.totalPayable.toLocaleString()} <span className="text-sm">฿</span></p>
          </div>
        </div>

        {/* Financial Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-5 relative overflow-hidden group shadow-sm transition-shadow hover:shadow-md">
            <div className="absolute right-0 top-0 -mr-4 -mt-4 opacity-10 text-emerald-600 group-hover:scale-110 transition-transform duration-500">
              <CheckCircle2 size={120} />
            </div>
            <div className="relative z-10">
              <p className="text-emerald-600 hover:text-emerald-700 text-xs font-black uppercase mb-2 tracking-wide flex items-center gap-1.5"><Wallet size={14} /> ชำระแล้ว</p>
              <p className="text-3xl font-black text-emerald-700">
                {contract.totalPaidAmount.toLocaleString()} <span className="text-base font-bold text-emerald-500">฿</span>
              </p>
              <div className="flex items-center gap-3 mt-4">
                <div className="flex-1 bg-emerald-200/50 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${paidPercent}%` }} />
                </div>
                <span className="text-xs font-black text-emerald-600">{Math.round(paidPercent)}%</span>
              </div>
            </div>
          </div>

          <div className="bg-rose-50 border border-rose-100 rounded-3xl p-5 relative overflow-hidden group shadow-sm transition-shadow hover:shadow-md">
            <div className="absolute right-0 top-0 -mr-4 -mt-4 opacity-5 text-rose-600 group-hover:scale-110 transition-transform duration-500">
              <Wallet size={120} />
            </div>
            <div className="relative z-10">
              <p className="text-rose-600 text-xs font-black uppercase mb-2 tracking-wide flex items-center gap-1.5"><History size={14} /> ยอดหนี้คงเหลือ</p>
              <p className="text-3xl font-black text-rose-700">
                {contract.remainingBalance.toLocaleString()} <span className="text-base font-bold text-rose-400">฿</span>
              </p>
              <p className="text-xs text-rose-500 font-bold mt-2.5 bg-rose-100/50 inline-block px-2 py-1 rounded-md uppercase">
                เหลืออีก {Math.max(0, contract.totalInstallments - Math.round(contract.totalPaidAmount / contract.installmentPerMonth))} งวด
              </p>
            </div>
          </div>
        </div>

        {/* Installment Graphical Tracker */}
        {contract.totalInstallments > 0 && (
          <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm relative">
            <h4 className="font-black text-slate-800 text-base mb-4 flex items-center gap-2">
              <LayoutGrid className="text-sky-500" size={18} /> สรุปงวดที่ชำระแล้ว ({Math.floor(contract.totalPaidAmount / contract.installmentPerMonth)}/{contract.totalInstallments})
            </h4>
            <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5 sm:gap-2">
              {Array.from({ length: contract.totalInstallments }).map((_, idx) => {
                const isPaid = idx < Math.floor(contract.totalPaidAmount / contract.installmentPerMonth);
                return (
                  <div
                    key={idx}
                    className={`aspect-square w-full rounded-xl sm:rounded-2xl flex flex-col items-center justify-center border-2 transition-all ${isPaid ? 'bg-emerald-50 border-emerald-500 text-emerald-600 shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-300'}`}
                    title={isPaid ? `งวดที่ ${idx + 1}: ชำระแล้ว` : `งวดที่ ${idx + 1}: รอชำระ`}
                  >
                    <span className="text-base sm:text-base font-black">{idx + 1}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Repayment Form */}
        {contract.remainingBalance > 0 && (
          <div className="bg-white border border-blue-100 rounded-3xl p-5 sm:p-6 shadow-sm relative">
            <h4 className="font-black text-slate-800 text-base mb-4 flex items-center gap-2">
              <PlusCircle className="text-blue-500" size={18} /> บันทึกรับชำระเงิน
            </h4>

            <div className="flex flex-col lg:flex-row gap-4 items-end">
              <div className="w-full lg:w-48 space-y-1.5">
                <label className="text-xs font-bold text-slate-500 ml-1">รายละเอียด / งวด (เลือกได้)</label>
                <input
                  type="text"
                  placeholder="เช่น งวดที่ 1"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all"
                  value={installmentNo}
                  onChange={(e) => setInstallmentNo(e.target.value)}
                />
              </div>

              <div className="flex-1 w-full space-y-1.5">
                <label className="text-xs font-bold text-slate-500 ml-1">จำนวนเงิน (บาท)</label>
                <div className="flex flex-wrap sm:flex-nowrap gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">฿</span>
                    <input
                      type="number"
                      className="w-full pl-8 pr-4 py-3 bg-blue-50/50 border border-blue-200 rounded-2xl text-xl font-black text-blue-700 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all text-right"
                      value={amountPaid || ""}
                      onChange={(e) => setAmountPaid(Number(e.target.value))}
                    />
                  </div>

                  {/* Quick action buttons */}
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => setAmountPaid(contract.installmentPerMonth)}
                      className="flex-1 sm:flex-none px-4 py-3 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-2xl text-[11px] sm:text-xs font-bold transition-colors border border-slate-200"
                    >
                      ค่างวดปกติ<br className="hidden lg:block" /> <span className="text-blue-600 ml-1 lg:ml-0">{contract.installmentPerMonth.toLocaleString()}</span>
                    </button>
                    <button
                      onClick={() => setAmountPaid(contract.remainingBalance)}
                      className="flex-1 sm:flex-none px-4 py-3 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-2xl text-[11px] sm:text-xs font-bold transition-colors border border-rose-200"
                    >
                      ปิดยอด<br className="hidden lg:block" /> <span className="text-rose-700 ml-1 lg:ml-0">{contract.remainingBalance.toLocaleString()}</span>
                    </button>
                  </div>
                </div>
              </div>

              <button
                disabled={isAddingRepayment || !amountPaid || amountPaid <= 0}
                onClick={handleAddRepayment}
                className="w-full lg:w-32 py-3 lg:h-[3.25rem] bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-sm font-black shadow-lg shadow-blue-600/20 active:scale-95 disabled:opacity-50 disabled:active:scale-100 transition-all flex items-center justify-center gap-2"
              >
                {isAddingRepayment ? (
                  <span className="animate-pulse">รอสักครู่...</span>
                ) : (
                  <>ยืนยัน <ArrowRight size={16} /></>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Repayment History */}
        <div>
          <h4 className="font-black text-slate-800 flex items-center gap-2 text-base mb-4 px-2">
            <History size={18} className="text-slate-400" /> ประวัติการรับชำระ
          </h4>

          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr className="text-slate-400 text-xs font-black uppercase tracking-widest">
                  <th className="py-4 px-4 sm:px-6">วันที่</th>
                  <th className="py-4 px-4 sm:px-6 hidden sm:table-cell">อ้างอิง/งวด</th>
                  <th className="py-4 px-4 sm:px-6 text-right">ยอดรับ (฿)</th>
                  <th className="py-4 px-4 sm:px-6 text-center w-24">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {isLoadingHistory ? (
                  [1, 2, 3].map(i => (
                    <tr key={i} className="animate-pulse">
                      <td className="py-4 px-6"><div className="h-4 bg-slate-200 rounded-md w-24"></div></td>
                      <td className="py-4 px-6 hidden sm:table-cell"><div className="h-4 bg-slate-100 rounded-md w-16"></div></td>
                      <td className="py-4 px-6 text-right"><div className="h-4 bg-slate-200 rounded-md w-20 ml-auto"></div></td>
                      <td className="py-4 px-6 text-center"><div className="h-6 bg-slate-100 rounded-full w-16 mx-auto"></div></td>
                    </tr>
                  ))
                ) : repayments.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center">
                      <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Receipt className="text-slate-300" size={24} />
                      </div>
                      <p className="text-slate-500 font-bold text-sm">ยังไม่มีประวัติการชำระเงิน</p>
                    </td>
                  </tr>
                ) : (
                  repayments.map((rp, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-4 sm:px-6">
                        <div className="font-bold text-slate-700 text-base">
                          {formatDate(rp.date)}
                        </div>
                        <div className="text-[12px] text-slate-400 font-medium">
                          เวลา {formatTime(rp.date)} น.
                        </div>
                      </td>
                      <td className="py-4 px-6 hidden sm:table-cell">
                        <div className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold border border-slate-200/50">
                          {rp.installmentNo || "-"}
                        </div>
                      </td>
                      <td className="py-4 px-4 sm:px-6 text-right font-black text-emerald-600 text-base sm:text-lg">
                        +{rp.amount.toLocaleString()}
                      </td>
                      <td className="py-4 px-4 sm:px-6 text-center">
                        <span className="inline-flex w-full items-center justify-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 rounded-lg font-black text-xs uppercase border border-emerald-200/50">
                          <CheckCircle2 size={10} /> สำเร็จ
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
