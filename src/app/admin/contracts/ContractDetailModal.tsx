import { useState, useEffect, useCallback } from "react";
import { X, History, PlusCircle, AlertCircle } from "lucide-react";
import { toast } from "react-hot-toast";

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

interface Repayment {
  receiptId: string;
  date: string;
  installmentNo: string;
  amount: number;
  status: string;
  approver: string;
}

interface ContractDetailModalProps {
  contract: Contract;
  onClose: () => void;
  onRepaymentAdded: () => void;
}

export default function ContractDetailModal({ contract, onClose, onRepaymentAdded }: ContractDetailModalProps) {
  const [repayments, setRepayments] = useState<Repayment[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isAddingRepayment, setIsAddingRepayment] = useState(false);

  // Repayment form
  const [amountPaid, setAmountPaid] = useState(contract.installmentPerMonth);
  const [installmentNo, setInstallmentNo] = useState("");

  const fetchRepayments = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const res = await fetch("/api/member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "admin_get_repayments",
          contractId: contract.contractId
        }),
      });
      const result = await res.json();
      if (result.success) {
        // Map A:Receipt_ID B:Payment_Date C:Contract_ID D:LINE_UserID E:Installment_No F:Amount_Paid G:Slip URL H:Review Status
        const mapped = result.data.map((row: string[]) => ({
            receiptId: row[0],
            date: row[1],
            contractId: row[2],
            installmentNo: row[4],
            amount: Number(row[5]),
            status: row[7],
            approver: row[8]
        })).filter((item: {contractId: string, amount: number}) => item.contractId === contract.contractId || item.amount > 0);
        // Note: server checks contract, but we can filter here too if needed
        setRepayments(mapped);
      }
    } catch {
       // Silent error for display
    } finally {
      setIsLoadingHistory(false);
    }
  }, [contract.contractId]);

  useEffect(() => {
    fetchRepayments();
  }, [fetchRepayments]);
  
  const handleAddRepayment = async () => {
      setIsAddingRepayment(true);
      const tid = toast.loading("กำลังบันทึกยอดชำระเงิน...");
      try {
        const res = await fetch("/api/member", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                action: "admin_add_repayment",
                contractId: contract.contractId,
                lineUserId: contract.lineUserId,
                amountPaid,
                installmentNo: installmentNo || `งวดอิสระ`,
                status: "ยืนยันแล้ว"
            }),
        });
        const result = await res.json();
        if (result.success) {
            toast.success("บันทึกการชำระเงินเรียบร้อย", {id: tid});  
            fetchRepayments();
            onRepaymentAdded(); // update parent table amounts
        } else {
            toast.error(result.msg || "เพิ่มไม่ได้", {id: tid});
        }
      } catch {
          toast.error("ข้อผิดพลาดจากเซิร์ฟเวอร์", {id: tid});
      } finally {
          setIsAddingRepayment(false);
      }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm shadow-xl">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-slate-200 bg-slate-50">
          <h3 className="font-bold text-lg text-slate-800">
            รายละเอียดสัญญา {contract.contractId}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full text-slate-400">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
            
            {/* Info Cards */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-sky-50 p-4 rounded-xl border border-sky-100 shadow-sm">
                    <p className="text-sky-800 text-sm font-bold mb-1">ยอดจัด / ยอดรวมทั้งหมด</p>
                    <p className="text-2xl font-bold text-sky-600">{contract.totalPayable.toLocaleString()} ฿</p>
                    <p className="text-xs text-sky-800/60 mt-1">ผู้กู้: {contract.fullName}</p>
                </div>
                <div className="bg-rose-50 p-4 rounded-xl border border-rose-100 shadow-sm flex flex-col justify-center">
                     <p className="text-rose-800 text-sm font-bold mb-1">ยอดคงเหลือที่ต้องผ่อนจ่าย</p>
                     <p className="text-2xl font-bold text-rose-600">{contract.remainingBalance.toLocaleString()} ฿</p>
                </div>
            </div>

            {/* Quick Add Form for Admin */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h4 className="font-bold text-slate-700 flex items-center gap-1 mb-3 text-sm">
                    <PlusCircle size={16}/> รับชำระเงิน (Admin คีย์ข้อมูลเอง)
                </h4>
                <div className="flex gap-2">
                    <input 
                       type="text" 
                       placeholder="เข่น: งวดที่ 1" 
                       className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                       value={installmentNo}
                       onChange={e => setInstallmentNo(e.target.value)}
                    />
                    <input 
                       type="number" 
                       placeholder="ยอดเงิน (บาท)" 
                       className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold bg-white"
                       value={amountPaid || ""}
                       onChange={e => setAmountPaid(Number(e.target.value))}
                    />
                    <button 
                       disabled={isAddingRepayment || !amountPaid}
                       onClick={handleAddRepayment}
                       className="whitespace-nowrap px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-bold disabled:opacity-50"
                    >
                       {isAddingRepayment ? "กำลังบันทึก..." : "ยืนยันรับยอด"}
                    </button>
                </div>
            </div>

            {/* Repayment History list */}
            <div>
               <h4 className="font-bold text-slate-700 flex items-center gap-2 mb-3">
                   <History size={18} className="text-sky-500" /> ประวัติการผ่อนชำระ
               </h4>
               <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                   {isLoadingHistory ? (
                       <p className="p-8 text-center text-slate-400">กำลังดึงข้อมูล...</p>
                   ) : repayments.length === 0 ? (
                       <div className="p-8 text-center flex flex-col items-center text-slate-400">
                           <AlertCircle size={24} className="mb-2 text-slate-300" />
                           <p>ยังไม่มีประวัติการชำระเงินของสัญญานี้</p>
                       </div>
                   ) : (
                       <table className="w-full text-left">
                           <thead className="bg-slate-100">
                               <tr>
                                  <th className="py-2 px-4 text-xs font-bold text-slate-600">วันที่รับยอด</th>
                                  <th className="py-2 px-4 text-xs font-bold text-slate-600">รายการ</th>
                                  <th className="py-2 px-4 text-xs font-bold text-slate-600">ยอดเงิน</th>
                                  <th className="py-2 px-4 text-xs font-bold text-slate-600 text-center">สถานะ</th>
                               </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-100">
                               {repayments.map((rp, i) => (
                                   <tr key={i} className="hover:bg-slate-50">
                                        <td className="py-3 px-4 text-sm font-medium text-slate-600">{rp.date}</td>
                                        <td className="py-3 px-4 text-sm">{rp.installmentNo || "ไม่ระบุ"}</td>
                                        <td className="py-3 px-4 text-sm font-bold text-emerald-600">+{rp.amount.toLocaleString()}</td>
                                        <td className="py-3 px-4 text-center">
                                            <span className="inline-flex text-[10px] items-center px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold border border-emerald-200">
                                               {rp.status || "ยืนยันแล้ว"}
                                            </span>
                                        </td>
                                   </tr>
                               ))}
                           </tbody>
                       </table>
                   )}
               </div>
            </div>
        </div>
      </div>
    </div>
  )
}
