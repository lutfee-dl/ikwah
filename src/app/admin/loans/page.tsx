"use client";

import { useState, useMemo } from "react";
import {
	Search,
	Eye,
	X,
	CheckCircle2,
	XCircle,
	Calculator,
	CalendarClock,
	CreditCard,
} from "lucide-react";

const mockLoans = [
	{
		id: "L001",
		name: "อนุชา รักสงบ",
		type: "ฉุกเฉิน",
		amount: 15000,
		duration: 6,
		date: "12/11/2023",
		status: "pending",
	},
	{
		id: "L002",
		name: "สุดที่รัก พิทักษ์ไทย",
		type: "กัรฏฮะซัน",
		amount: 30000,
		duration: 12,
		date: "11/11/2023",
		status: "approved",
	},
	{
		id: "L003",
		name: "สมชาย ใจดี",
		type: "ซื้อขาย",
		amount: 100000,
		duration: 24,
		date: "10/11/2023",
		status: "rejected",
	},
	{
		id: "L004",
		name: "มานี มีสุข",
		type: "ฉุกเฉิน",
		amount: 5000,
		duration: 3,
		date: "13/11/2023",
		status: "pending",
	},
];

type FilterStatus = "pending" | "approved" | "rejected" | "all";

export default function LoansPage() {
	const [loans, setLoans] = useState(mockLoans);
	const [filterStatus, setFilterStatus] = useState<FilterStatus>("pending");
	const [searchQuery, setSearchQuery] = useState("");

	const [selectedLoan, setSelectedLoan] = useState<typeof mockLoans[0] | null>(
		null
	);
	const [isModalOpen, setIsModalOpen] = useState(false);

	const filteredLoans = useMemo(() => {
		return loans.filter((l) => {
			const matchStatus =
				filterStatus === "all" || l.status === filterStatus;
			const matchSearch =
				l.name.includes(searchQuery) ||
				l.id.includes(searchQuery) ||
				l.type.includes(searchQuery);
			return matchStatus && matchSearch;
		});
	}, [loans, filterStatus, searchQuery]);

	const handleApprove = (id: string) => {
		setLoans((prev) =>
			prev.map((l) => (l.id === id ? { ...l, status: "approved" } : l))
		);
		setIsModalOpen(false);
	};

	const handleReject = (id: string) => {
		setLoans((prev) =>
			prev.map((l) => (l.id === id ? { ...l, status: "rejected" } : l))
		);
		setIsModalOpen(false);
	};

	const openDetails = (loan: typeof mockLoans[0]) => {
		setSelectedLoan(loan);
		setIsModalOpen(true);
	};

	return (
		<div className="space-y-6 relative">
			{/* Header & Controls */}
			<div className="flex flex-col gap-4">
				<div>
					<h1 className="text-2xl font-bold text-slate-800">
						ระบบคำขอกู้เงิน
					</h1>
					<p className="text-slate-500 text-sm mt-1">
						ตรวจสอบรายละเอียดสัญญากู้และพิจารณาอนุมัติ (ค่าเริ่มต้น:
						แสดงเฉพาะคำขอใหม่)
					</p>
				</div>

				<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
					{/* Tabs for Filtering */}
					<div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto overflow-x-auto no-scrollbar">
						{[
							{ id: "pending", label: "รอพิจารณา" },
							{ id: "approved", label: "อนุมัติแล้ว" },
							{ id: "rejected", label: "ไม่อนุมัติ" },
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
								{tab.id === "pending" &&
									loans.filter((l) => l.status === "pending").length >
										0 && (
										<span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold text-white bg-rose-500 rounded-full">
											{
												loans.filter((l) => l.status === "pending")
													.length
											}
										</span>
									)}
							</button>
						))}
					</div>

					{/* Search */}
					<div className="relative w-full sm:w-64">
						<Search
							className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
							size={18}
						/>
						<input
							type="text"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder="ค้นหาชื่อ, รหัส, ประเภทสัญญา..."
							className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-sm"
						/>
					</div>
				</div>
			</div>

			{/* Table View */}
			<div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
				<div className="overflow-x-auto">
					<table className="w-full text-left border-collapse">
						<thead>
							<tr className="bg-slate-50/80 border-b border-slate-200">
								<th className="py-4 px-6 font-semibold text-slate-600 text-sm whitespace-nowrap">
									รหัสคำขอ
								</th>
								<th className="py-4 px-6 font-semibold text-slate-600 text-sm">
									ผู้กู้
								</th>
								<th className="py-4 px-6 font-semibold text-slate-600 text-sm">
									ประเภทสัญญา
								</th>
								<th className="py-4 px-6 font-semibold text-slate-600 text-sm pl-8">
									วงเงิน (บาท)
								</th>
								<th className="py-4 px-6 font-semibold text-slate-600 text-sm text-center">
									สถานะ
								</th>
								<th className="py-4 px-6 font-semibold text-slate-600 text-sm text-center">
									จัดการ
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-100">
							{filteredLoans.length === 0 ? (
								<tr>
									<td colSpan={6} className="py-12 text-center text-slate-400">
										ไม่พบคำขอที่ตรงกับเงื่อนไข
									</td>
								</tr>
							) : (
								filteredLoans.map((item) => (
									<tr
										key={item.id}
										className="hover:bg-slate-50 transition-colors"
									>
										<td className="py-4 px-6 text-slate-700 font-medium whitespace-nowrap">
											{item.id}
										</td>
										<td className="py-4 px-6 text-slate-600 font-medium">
											{item.name}
										</td>
										<td className="py-4 px-6">
											<span
												className={`px-3 py-1 rounded-md text-xs font-semibold border ${
													item.type === "ฉุกเฉิน"
														? "bg-red-50 text-red-600 border-red-100"
														: item.type === "กัรฏฮะซัน"
														? "bg-emerald-50 text-emerald-600 border-emerald-100"
														: "bg-blue-50 text-blue-600 border-blue-100"
												}`}
											>
												{item.type}
											</span>
										</td>
										<td className="py-4 px-6">
											<div className="flex flex-col pl-2">
												<span className="font-bold text-amber-600">
													{item.amount.toLocaleString()} ฿
												</span>
												<span className="text-xs text-slate-500 mt-1">
													ผ่อน {item.duration} งวด
												</span>
											</div>
										</td>
										<td className="py-4 px-6 text-center">
											<span
												className={`inline-flex px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${
													item.status === "pending"
														? "bg-amber-100 text-amber-700"
														: item.status === "approved"
														? "bg-emerald-100 text-emerald-700"
														: "bg-rose-100 text-rose-700"
												}`}
											>
												{item.status === "pending"
													? "รอพิจารณา"
													: item.status === "approved"
													? "อนุมัติแล้ว"
													: "ไม่อนุมัติ"}
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
												<Eye size={16} />
												{item.status === "pending"
													? "พิจารณา"
													: "ดูข้อมูล"}
											</button>
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</div>

			{/* Modal ดูรายละเอียดคำขอกู้ */}
			{isModalOpen && selectedLoan && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
					<div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
						<div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50">
							<h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
								<CreditCard className="text-sky-500" size={20} />
								ตรวจสอบคำขอกู้เงิน
							</h3>
							<button
								onClick={() => setIsModalOpen(false)}
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
									<p className="font-bold text-slate-700">
										{selectedLoan.id}
									</p>
								</div>
								<div className="text-right">
									<p className="text-slate-500 text-sm mb-1">วันที่แจ้ง</p>
									<p className="font-medium text-slate-700">
										{selectedLoan.date}
									</p>
								</div>
							</div>

							{/* Borrower Info */}
							<div>
								<p className="text-slate-500 text-sm mb-2">ข้อมูลผู้กู้</p>
								<div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex justify-between items-center">
									<p className="font-bold text-slate-800 text-lg">
										{selectedLoan.name}
									</p>
									<span
										className={`px-3 py-1 rounded-md text-xs font-bold border ${
											selectedLoan.type === "ฉุกเฉิน"
												? "bg-red-50 text-red-600 border-red-100"
												: selectedLoan.type === "กัรฏฮะซัน"
												? "bg-emerald-50 text-emerald-600 border-emerald-100"
												: "bg-blue-50 text-blue-600 border-blue-100"
										}`}
									>
										ประเภท: {selectedLoan.type}
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
										{selectedLoan.amount.toLocaleString()}{" "}
										<span className="text-sm">฿</span>
									</p>
								</div>
								<div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
									<p className="text-amber-600/80 text-sm mb-1 font-medium flex items-center gap-1">
										<CalendarClock size={14} /> ระยะเวลาเช่าซื้อ
									</p>
									<p className="font-bold text-amber-700 text-2xl">
										{selectedLoan.duration}{" "}
										<span className="text-sm font-medium">
											งวด (เดือน)
										</span>
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
										<p className="text-slate-300 text-xs font-medium">
											ยอดผ่อนชำระต่อเดือน (โดยประมาณ)
										</p>
										<p className="font-bold text-lg tracking-wide text-amber-300">
											{Math.ceil(
												selectedLoan.amount / selectedLoan.duration
											)
												.toLocaleString()
												.replace(",", ".")}{" "}
											บาท/เดือน
										</p>
									</div>
								</div>
							</div>
						</div>

						{/* Actions */}
						<div className="p-5 border-t border-slate-100 bg-white">
							{selectedLoan.status === "pending" ? (
								<div className="grid grid-cols-2 gap-4">
									<button
										onClick={() => handleReject(selectedLoan.id)}
										className="flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 hover:text-rose-700 border border-rose-200 rounded-xl transition-all"
									>
										<XCircle size={18} /> ไม่อนุมัติคำขอ
									</button>
									<button
										onClick={() => handleApprove(selectedLoan.id)}
										className="flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-bold text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl transition-all shadow-sm shadow-emerald-200"
									>
										<CheckCircle2 size={18} /> อนุมัติสินเชื่อ
									</button>
								</div>
							) : (
								<button
									onClick={() => setIsModalOpen(false)}
									className="w-full py-3.5 text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
								>
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
