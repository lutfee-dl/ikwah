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
  ChevronLeft,
  RefreshCw,
  Image as ImageIcon,
  X,
  Eye
} from "lucide-react";
import { toast } from "react-hot-toast";
import Swal from "sweetalert2";
import Link from "next/link";
import { NumericFormat } from "react-number-format";
import { formatDate, formatDateTime, formatTime } from "@/lib/utils";
import ContractRepaymentModal from "../ContractRepaymentModal";

interface Contract {
  contractId: string;
  requestId: string;
  approvedDate: string;
  lineId: string;
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
  slipUrl: string;
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
  const [selectedSlipUrl, setSelectedSlipUrl] = useState<string | null>(null); // For lightbox

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
        const found = result.data.find((item: any) => String(item.contractId || "") === contractId);
        if (found) {
          const totalPaidAmount = Number(found.paidAmount || 0);
          const totalPayable = Number(found.totalPayable || 0);
          const totalInstallments = Number(found.duration || 0);
          const installmentPerMonth = totalInstallments > 0 ? totalPayable / totalInstallments : 0;
          const approvedDateStr = String(found.approvedDate || "");
          let status = String(found.status || "กำลังผ่อน");

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
          if (status !== "ปิดยอดแล้ว" && totalPaidAmount >= totalPayable && totalPayable > 0) {
            status = "ปิดยอดแล้ว";
          }

          const parsedContract: Contract = {
            contractId: String(found.contractId || ""),
            requestId: String(found.requestId || ""),
            approvedDate: approvedDateStr,
            lineId: String(found.lineId || ""),
            fullName: String(found.memberName || ""),
            loanType: String(found.loanType || ""),
            principalAmount: Number(found.amount || 0),
            profitAmount: Number(found.interest || 0),
            totalPayable,
            installmentPerMonth,
            totalInstallments,
            totalPaidAmount,
            remainingBalance: Number(found.remainingBalance || 0),
            status,
            items: String(found.itemName || "ทั่วไป"),
          };

          setContract(parsedContract);
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
          ADMIN_SECRET: process.env.NEXT_PUBLIC_ADMIN_SECRET
        }),
      });
      const result = await res.json();
      if (result.success) {
        const mapped = result.data.map((item: any) => ({
          receiptId: String(item.receiptId || ""),
          date: String(item.date || ""),
          installmentNo: String(item.installmentNo || ""),
          amount: Number(item.amount || 0),
          slipUrl: String(item.slipUrl || ""),
          status: String(item.status || ""),
          approver: item.approver,
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

  // Removed handleFileChange and handleAddRepayment (Moved to ContractRepaymentModal)

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
                <span className="flex items-center gap-1"><Calendar size={12} className="text-slate-400" /> อนุมัติ: {formatDate(contract.approvedDate)}</span>
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

        {/* Record Payment Button */}
        {contract.remainingBalance > 0 && (
          <div className="flex justify-center pt-2">
            <button
              onClick={() => setIsAddingRepayment(true)}
              className="w-full h-[3.75rem] bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-base font-black shadow-xl shadow-blue-200 active:scale-[0.98] transition-all flex items-center justify-center gap-3 group"
            >
              <PlusCircle className="animate-pulse" size={22} />
              บันทึกรับชำระเงิน
              <div className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center group-hover:translate-x-1 transition-transform">
                <ArrowRight size={14} />
              </div>
            </button>
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
                    <tr key={i} className="hover:bg-slate-50/50 even:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-4 sm:px-6">
                        <div className="font-bold text-slate-700 text-base">
                          {formatDate(rp.date)}
                        </div>
                        <div className="text-[12px] text-slate-400 font-medium">
                          เวลา {formatTime(rp.date)} น.
                        </div>
                      </td>
                      <td className="py-4 px-6 hidden sm:table-cell">
                        <div className="flex items-center gap-2">
                          <div className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold border border-slate-200/50">
                            {rp.installmentNo || "-"}
                          </div>
                          {rp.slipUrl && (
                            <button
                              onClick={() => setSelectedSlipUrl(rp.slipUrl)}
                              className="p-1.5 bg-sky-50 text-sky-600 rounded-lg hover:bg-sky-100 transition-colors"
                            >
                              <ImageIcon size={14} />
                            </button>
                          )}
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

      {/* Lightbox for Slips */}
      {selectedSlipUrl && (
        <div className="fixed inset-0 z-[100] bg-slate-900/90 flex items-center justify-center p-4 animate-[fadeIn_0.3s]">
          <div className="relative max-w-2xl w-full bg-white rounded-[2rem] overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white/80 backdrop-blur-md">
              <h3 className="font-black text-slate-800 flex items-center gap-2">
                <ImageIcon className="text-blue-600" size={18} /> หลักฐานการชำระเงิน
              </h3>
              <button
                onClick={() => setSelectedSlipUrl(null)}
                className="p-2 bg-slate-100 text-slate-500 rounded-xl hover:bg-rose-50 hover:text-rose-600 transition-all"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 bg-slate-50 flex items-center justify-center">
              <img
                src={selectedSlipUrl}
                alt="Slip"
                className="max-h-[70vh] object-contain rounded-2xl shadow-lg"
              />
            </div>
            <div className="p-4 bg-white text-center">
              <a
                href={selectedSlipUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-blue-600 font-bold hover:underline"
              >
                <Eye size={16} /> ดูภาพขนาดเต็ม
              </a>
            </div>
          </div>
        </div>
      )}
      {/* Modal */}
      {isAddingRepayment && contract && (
        <ContractRepaymentModal
          contract={contract}
          onClose={(wasAdded) => {
            setIsAddingRepayment(false);
            if (wasAdded) {
              fetchContract();
              fetchRepayments();
            }
          }}
        />
      )}
    </div>
  );
}
