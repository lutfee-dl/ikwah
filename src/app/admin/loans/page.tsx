"use client";

import { useState, useMemo, useEffect } from "react";
import { Search, Eye } from "lucide-react";
import { toast } from "react-hot-toast";
import Swal from "sweetalert2";
import LoanDetailModal from "./LoanDetailModal";

type FilterStatus = "รอตรวจสอบ" | "อนุมัติ" | "ไม่อนุมัติ" | "all";

export interface LoanData {
	id: string;           // รหัสคำขอ (ใช้ Timestamp หรือ ID อื่นๆ)
	date: string;         // วันที่ยื่นขอ (Column A)
	lineUserId: string;   // LINE_UserID ตัวเต็ม ใช้เป็น Foreign Key (Column B)
	lineName: string;     // LineName (Column C)
	name: string;         // ชื่อ-นามสกุล (Column D)
	phone: string;        // เบอร์โทร (Column E)
	type: string;         // ประเภทสินเชื่อ (Column F)
	amount: number;       // จำนวนเงิน (บาท) (Column G)
	duration: number;     // ผ่อนชำระ (เดือน) (Column H)
	reason: string;       // เหตุผล (Column I)
	status: string;       // สถานะ (Column J)
}

export default function LoansPage() {
	const [loans, setLoans] = useState<LoanData[]>([]);
	const [filterStatus, setFilterStatus] = useState<FilterStatus>("รอตรวจสอบ");
	const [searchQuery, setSearchQuery] = useState("");
	const [isFetching, setIsFetching] = useState(true);

	const [selectedLoan, setSelectedLoan] = useState<LoanData | null>(null);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(false);

	useEffect(() => {
		fetchLoans();
	}, []);

	const fetchLoans = async () => {
		setIsFetching(true);
		try {
			const res = await fetch("/api/member", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ action: "admin_get_loans" }),
			});
			const result = await res.json();
			if ((result.status === "success" || result.success === true) && Array.isArray(result.data)) {
				// Map backend data which comes as an array of arrays or objects.
				// Based on headers: Request_ID, Timestamp, LINE_UserID, LineName, FullName, Phone, Loan_Type, Amount, Duration_Months, Reason, Status, Admin_Remark
				const mappedLoans = result.data.map((row: Record<string, string | number> | string[], index: number) => {
					// Handle whether result.data is an array of arrays or objects
					const isArray = Array.isArray(row);
					const reqId = isArray ? String(row[0] || "") : String(row.id || row.loanId || `REQ-${index}`);
					const lineUserIdStr = isArray ? String(row[2] || "") : String(row.lineUserId || row.lineId || "-");
					return {
						id: reqId,
						date: isArray ? String(row[1] || "") : String(row.date || row.createdAt || "-"),
						lineUserId: lineUserIdStr,
						lineName: isArray ? String(row[3] || "") : String(row.lineName || "-"),
						name: isArray ? String(row[4] || "") : String(row.name || row.fullName || "-"),
						phone: isArray ? String(row[5] || "") : String(row.phone || "-"),
						type: isArray ? String(row[6] || "") : String(row.type || row.loanType || "-"),
						amount: Number(isArray ? row[7] : row.amount || 0),
						duration: Number(isArray ? row[8] : row.duration || 0),
						reason: isArray ? String(row[9] || "") : String(row.reason || "-"),
						status: isArray ? String(row[10] || "รอตรวจสอบ") : String(row.status || "รอตตรวจสอบ"),
					};
				});
				setLoans(mappedLoans);
			} else {
				console.error("Failed to load loans:", result);
				// If error but it returned successfully from API, assume no data
				if (Object.keys(result).length === 0) {
				  setLoans([]);
				} else {
				  toast.error("ไม่สามารถโหลดข้อมูลคำขอกู้เงินได้");
				}
			}
		} catch (error) {
			console.error("Fetch loans error:", error);
			toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อ");
		} finally {
			setIsFetching(false);
		}
	};

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

	const handleApprove = async (id: string) => {
		const result = await Swal.fire({
			title: 'ยืนยันการอนุมัติสินเชื่อ?',
			text: "สมาชิกจะได้รับเงินกู้และสร้างสัญญาใหม่ในระบบ คุณแน่ใจหรือไม่?",
			icon: 'question',
			showCancelButton: true,
			confirmButtonText: 'อนุมัติ',
			cancelButtonText: 'ยกเลิก',
			confirmButtonColor: '#10b981', // emerald-500
		});

		if (!result.isConfirmed) return;

		setIsLoading(true);
		const toastId = toast.loading("กำลังอนุมัติ...");
		try {
			const response = await fetch("/api/member", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					action: "admin_update_loan",
					loanId: id,
					status: "อนุมัติ",
				}),
			});
			if (!response.ok) throw new Error("Failed to update loan status");

			setLoans((prev) =>
				prev.map((l) => (l.id === id ? { ...l, status: "อนุมัติ" } : l))
			);
			toast.success("อนุมัติเรียบร้อย", { id: toastId });
			setIsModalOpen(false);
		} catch (error) {
			console.error(error);
			toast.error("เกิดข้อผิดพลาดในการอนุมัติ", { id: toastId });
		} finally {
			setIsLoading(false);
		}
	};

	const handleReject = async (id: string) => {
		const result = await Swal.fire({
			title: 'ยืนยันการปฏิเสธคำขอ?',
			text: "คุณต้องการปฏิเสธคำขอกู้สินเชื่อนี้ใช่หรือไม่?",
			icon: 'warning',
			showCancelButton: true,
			confirmButtonText: 'ยืนยันปฏิเสธ',
			cancelButtonText: 'ยกเลิก',
			confirmButtonColor: '#ef4444', // rose-500
		});

		if (!result.isConfirmed) return;

		setIsLoading(true);
		const toastId = toast.loading("กำลังบันทึก...");
		try {
			const response = await fetch("/api/member", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					action: "admin_update_loan",
					loanId: id,
					status: "ไม่อนุมัติ",
				}),
			});
			if (!response.ok) throw new Error("Failed to update loan status");

			setLoans((prev) =>
				prev.map((l) => (l.id === id ? { ...l, status: "ไม่อนุมัติ" } : l))
			);
			toast.success("ปฏิเสธคำขอเรียบร้อย", { id: toastId });
			setIsModalOpen(false);
		} catch (error) {
			console.error(error);
			toast.error("เกิดข้อผิดพลาดในการปฏิเสธ", { id: toastId });
		} finally {
			setIsLoading(false);
		}
	};

	const openDetails = (loan: LoanData) => {
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
							{ id: "รอตรวจสอบ", label: "รอตรวจสอบ" },
							{ id: "อนุมัติ", label: "อนุมัติแล้ว" },
							{ id: "ไม่อนุมัติ", label: "ไม่อนุมัติ" },
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
								{tab.id === "รอตรวจสอบ" &&
									loans.filter((l) => l.status === "รอตตรวจสอบ").length >
										0 && (
										<span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold text-white bg-rose-500 rounded-full">
											{
												loans.filter((l) => l.status === "รอตตรวจสอบ")
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
							{isFetching ? (
								<tr>
									<td colSpan={6} className="py-12 text-center text-slate-400">
										กำลังโหลดข้อมูล...
									</td>
								</tr>
							) : filteredLoans.length === 0 ? (
								<tr>
									<td colSpan={6} className="py-12 text-center text-slate-400">
										ไม่พบคำขอที่ตรงกับเงื่อนไข
									</td>
								</tr>
							) : (
								filteredLoans.map((item, idx) => (
									<tr
										key={`${item.id}-${idx}`}
										className="hover:bg-slate-50 transition-colors"
									>
										<td className="py-4 px-6 text-slate-700 font-medium whitespace-nowrap truncate max-w-[120px] font-mono text-xs">
											{item.lineUserId.length > 8 ? `${item.lineUserId.substring(0,8)}...` : item.lineUserId}
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
													item.status === "รอตตรวจสอบ"
														? "bg-amber-100 text-amber-700"
														: item.status === "อนุมัติ"
														? "bg-emerald-100 text-emerald-700"
														: "bg-rose-100 text-rose-700"
												}`}
											>
												{item.status}
											</span>
										</td>
										<td className="py-4 px-6 text-center">
											<button
												onClick={() => openDetails(item)}
												className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
													item.status === "รอตตรวจสอบ"
														? "bg-sky-50 text-sky-600 hover:bg-sky-500 hover:text-white border border-sky-100 hover:border-sky-500"
														: "bg-slate-50 text-slate-500 hover:bg-slate-200 border border-slate-200"
												}`}
											>
												<Eye size={16} />
												{item.status === "รอตตรวจสอบ"
													? "ตรวจสอบ"
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
				<LoanDetailModal
					loan={selectedLoan}
					isLoading={isLoading}
					onApprove={handleApprove}
					onReject={handleReject}
					onClose={() => setIsModalOpen(false)}
				/>
			)}
		</div>
	);
}
