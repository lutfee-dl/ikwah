import { LoanData } from "./page";
import { formatDate, formatDateTime } from "@/lib/utils";
import {
	X,
	CheckCircle2,
	XCircle,
	Calculator,
	CalendarClock,
	CreditCard,
	Loader2,
} from "lucide-react";

interface LoanDetailModalProps {
	loan: LoanData;
	isLoading: boolean;
	onApprove: (id: string) => void;
	onReject: (id: string) => void;
	onClose: () => void;
}

export default function LoanDetailModal({
	loan,
	isLoading,
	onApprove,
	onReject,
	onClose,
}: LoanDetailModalProps) {
	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
			<div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
				<div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50">
					<h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
						<CreditCard className="text-sky-500" size={20} />
						ตรวจสอบคำขอกู้เงิน
					</h3>
					<button
						onClick={onClose}
						className="text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-200 transition-colors"
					>
						<X size={20} />
					</button>
				</div>

				<div className="p-6 space-y-6">
					{/* Request ID & Date */}
					<div className="flex justify-between pb-4 border-b border-dashed border-slate-200">
						<div>
							<p className="text-slate-500 text-sm mb-1">รหัสคำขอ</p>
							<p className="font-bold text-slate-700 text-xs">{loan.id}</p>
						</div>
						<div className="text-right">
							<p className="text-slate-500 text-sm mb-1">วันที่แจ้ง</p>
							<p className="font-medium text-slate-700">{formatDateTime(loan.date)}</p>
						</div>
					</div>

					{/* Borrower Info */}
					<div>
						<p className="text-slate-500 text-sm mb-2">ข้อมูลผู้กู้</p>
						<div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex justify-between items-center">
							<p className="font-bold text-slate-800 text-lg">{loan.name}</p>
							<span
								className={`px-3 py-1 rounded-md text-xs font-bold border ${
									loan.type === "ฉุกเฉิน"
										? "bg-red-50 text-red-600 border-red-100"
										: loan.type === "กัรฏฮะซัน"
										? "bg-emerald-50 text-emerald-600 border-emerald-100"
										: "bg-blue-50 text-blue-600 border-blue-100"
								}`}
							>
								ประเภท: {loan.type}
							</span>
						</div>
					</div>

					{/* Loan Details Grid */}
					<div className="grid grid-cols-2 gap-4">
						<div className="bg-sky-50 p-4 rounded-xl border border-sky-100">
							<p className="text-sky-600/80 text-sm mb-1 font-medium flex items-center gap-1">
								<CreditCard size={14} /> วงเงินที่ขอกู้
							</p>
							<p className="font-bold text-sky-700 text-2xl">
								{loan.amount.toLocaleString()} <span className="text-sm">฿</span>
							</p>
						</div>
						<div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
							<p className="text-amber-600/80 text-sm mb-1 font-medium flex items-center gap-1">
								<CalendarClock size={14} /> ระยะเวลาเช่าซื้อ
							</p>
							<p className="font-bold text-amber-700 text-2xl">
								{loan.duration} <span className="text-sm font-medium">งวด (เดือน)</span>
							</p>
						</div>
					</div>

					{/* Installment Calculator Estimate */}
					<div className="bg-slate-800 text-white p-4 rounded-xl flex justify-between items-center shadow-inner">
						<div className="flex items-center gap-3">
							<div className="p-2 bg-white/10 rounded-lg">
								<Calculator size={20} className="text-sky-300" />
							</div>
							<div>
								<p className="text-slate-300 text-xs font-medium">ชื่อรายการ / วัตถุประสงค์</p>
								<p className="font-bold text-sm tracking-wide text-amber-300 mt-1">
									{loan.itemName}
								</p>
							</div>
						</div>
					</div>
				</div>

				{/* Actions */}
				<div className="p-5 border-t border-slate-100 bg-white">
					{loan.status === "รอตรวจสอบ" ? (
						<div className="grid grid-cols-2 gap-4">
							<button
								disabled={isLoading}
								onClick={() => onReject(loan.id)}
								className="flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 hover:text-rose-700 border border-rose-200 rounded-xl transition-all disabled:opacity-50 cursor-pointer"
							>
								{isLoading ? (
									<Loader2 size={18} className="animate-spin" />
								) : (
									<XCircle size={18} />
								)}
								ไม่อนุมัติคำขอ
							</button>
							<button
								disabled={isLoading}
								onClick={() => onApprove(loan.id)}
								className="flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-bold text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl transition-all shadow-sm shadow-emerald-200 disabled:opacity-50 cursor-pointer"
							>
								{isLoading ? (
									<Loader2 size={18} className="animate-spin" />
								) : (
									<CheckCircle2 size={18} />
								)}
								อนุมัติสินเชื่อ
							</button>
						</div>
					) : (
						<button
							onClick={onClose}
							className="w-full py-3.5 text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
						>
							ปิดหน้าต่าง
						</button>
					)}
				</div>
			</div>
		</div>
	);
}
