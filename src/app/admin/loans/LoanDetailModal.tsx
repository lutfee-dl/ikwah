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
	MessageCircle,
	Phone,
} from "lucide-react";

interface LoanDetailModalProps {
	loan: LoanData;
	isLoading: boolean;
	onApprove: (id: string) => void;
	onReject: (id: string) => void;
	onReopen?: (id: string) => void;
	onClose: () => void;
}

export default function LoanDetailModal({
	loan,
	isLoading,
	onApprove,
	onReject,
	onReopen,
	onClose,
}: LoanDetailModalProps) {
	return (
		<div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm" onClick={onClose}>
			<div 
				className="bg-white sm:rounded-2xl rounded-t-3xl w-full sm:max-w-lg overflow-hidden shadow-2xl animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 max-h-[95svh] sm:max-h-[90vh] flex flex-col"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50 shrink-0">
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

				<div className="p-6 space-y-6 overflow-y-auto flex-1 no-scrollbar">
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
						<div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-3">
							<div className="flex justify-between items-start">
								<p className="font-black text-slate-800 text-xl leading-none">{loan.name}</p>
								<span
									className={`px-3 py-1 rounded-md text-[10px] font-black border uppercase tracking-wider ${loan.type === "ฉุกเฉิน"
										? "bg-red-50 text-red-600 border-red-100"
										: loan.type === "กัรฏฮะซัน"
											? "bg-emerald-50 text-emerald-600 border-emerald-100"
											: "bg-blue-50 text-blue-600 border-blue-100"
										}`}
								>
									{loan.type}
								</span>
							</div>

							<div className="flex flex-wrap gap-4 pt-2 border-t border-slate-200/60">
								<div className="flex items-center gap-2 text-slate-600">
									<div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg">
										<MessageCircle size={14} />
									</div>
									<div className="flex flex-col">
										<span className="text-xs text-slate-400 uppercase tracking-tighter">LINE Name</span>
										<span className="text-sm font-bold">{loan.lineName || "ไม่พบชื่อไลน์"}</span>
									</div>
								</div>
								<div className="flex items-center gap-2 text-slate-600">
									<div className="p-1.5 bg-sky-100 text-sky-600 rounded-lg">
										<Phone size={14} />
									</div>
									<div className="flex flex-col">
										<span className="text-xs text-slate-400 uppercase tracking-tighter">เบอร์โทรศัพท์</span>
										<span className="text-sm font-bold tracking-wider">{loan.phone || "-"}</span>
									</div>
								</div>
							</div>
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
				<div className="p-5 border-t border-slate-100 bg-white shrink-0">
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
						<div className="flex gap-3">
							<button
								onClick={onClose}
								className="flex-1 py-3.5 text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
							>
								ปิด
							</button>
							<button
								disabled={isLoading}
								onClick={() => onReopen && onReopen(loan.id)}
								className="flex-[2] flex items-center justify-center gap-2 py-3.5 text-sm font-black text-amber-700 bg-amber-50 hover:bg-amber-100 border-2 border-amber-200 rounded-xl transition-all disabled:opacity-50 cursor-pointer"
							>
								<Loader2 size={18} className={`animate-spin ${isLoading ? 'block' : 'hidden'}`} />
								ดึงกลับมาตรวจสอบใหม่
							</button>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
