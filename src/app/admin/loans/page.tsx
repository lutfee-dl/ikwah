"use client";

import { useState, useMemo, useEffect } from "react";
import { Search, Eye, ChevronLeft, ChevronRight, Loader2, Landmark } from "lucide-react";
import LoanAddModal from "./LoanAddModal";
import { toast } from "react-hot-toast";
import Swal from "sweetalert2";
import LoanDetailModal from "./LoanDetailModal";
import { TableSkeleton } from "@/components/ui/TableSkeleton";

import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { gasApi } from "@/services/gasApi";
import { useAdminMembers } from "@/hooks/useAdminMembers";
import { Member } from "@/types";

type FilterStatus = "รอตรวจสอบ" | "อนุมัติ" | "ไม่อนุมัติ" | "all";

export interface LoanData {
	id: string;           // รหัสคำขอ (ใช้ Timestamp หรือ ID อื่นๆ)
	date: string;         // วันที่ยื่นขอ (Column A)
	lineId: string;   // LINE_ID ตัวเต็ม ใช้เป็น Foreign Key (Column B)
	lineName: string;     // LineName (Column C)
	name: string;         // ชื่อ-นามสกุล (Column D)
	phone: string;        // เบอร์โทร (Column E)
	type: string;         // ประเภทสินเชื่อ (Column F)
	amount: number;       // จำนวนเงิน (บาท) (Column G)
	duration: number;     // ผ่อนชำระ (เดือน) (Column H)
	itemName: string;     // ชื่อรายการ (Column I - เปลี่ยนจาก reason)
	status: string;       // สถานะ (Column J)
}

export default function LoansPage() {
	const [loans, setLoans] = useState<LoanData[]>([]);
	const [filterStatus, setFilterStatus] = useState<FilterStatus>("รอตรวจสอบ");
	const [searchQuery, setSearchQuery] = useState("");
	const [isFetching, setIsFetching] = useState(true);

	// Pagination state
	const [currentPage, setCurrentPage] = useState(1);
	const [itemsPerPage, setItemsPerPage] = useState(10);

	const [selectedLoan, setSelectedLoan] = useState<LoanData | null>(null);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [isAddingLoan, setIsAddingLoan] = useState(false);
	const [adminName, setAdminName] = useState<string>("ADMIN");

	// ใช้ Hook มาตรฐานเหมือนหน้า Deposits
	const { members: memberList, loading: isMembersLoading } = useAdminMembers();

	// สร้าง Map เพื่อการค้นหาที่รวดเร็ว (แบบหน้า Deposits)
	const membersByLineMap = useMemo(() => {
		const map = new Map<string, Member>();
		memberList.forEach(m => {
			if (m.lineId) map.set(m.lineId.trim(), m);
		});
		return map;
	}, [memberList]);

	const membersByNameMap = useMemo(() => {
		const map = new Map<string, Member>();
		memberList.forEach(m => {
			if (m.fullName) map.set(m.fullName.trim(), m);
		});
		return map;
	}, [memberList]);

	// Header Filters
	const [headerFilters, setHeaderFilters] = useState({
		id: "",
		name: "",
		type: ""
	});

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, async (user) => {
			if (user) {
				try {
					const adminDoc = await getDoc(doc(db, "system_admins", user.uid));
					if (adminDoc.exists() && adminDoc.data().displayName) {
						setAdminName(adminDoc.data().displayName);
					} else {
						setAdminName(user.displayName || user.email?.split('@')[0] || "ADMIN");
					}
				} catch (e) {
					setAdminName(user.displayName || user.email?.split('@')[0] || "ADMIN");
				}
			}
		});
		return () => unsubscribe();
	}, []);

	useEffect(() => {
		fetchLoans();
	}, []);

	const fetchLoans = async () => {
		setIsFetching(true);
		try {
			const res = await fetch("/api/member", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					action: "admin_get_loans",
					ADMIN_SECRET: process.env.NEXT_PUBLIC_ADMIN_SECRET
				}),
			});
			const result = await res.json();

			if ((result.status === "success" || result.success === true) && Array.isArray(result.data)) {
				const mappedLoans = result.data.map((row: any[], index: number) => {
					return {
						id: String(row[0] || ""),
						date: String(row[1] || ""),
						lineId: String(row[2] || "").trim(),
						lineName: "-", // จะไปแมปจริงใน useMemo
						name: String(row[3] || "").trim(),
						phone: String(row[4] || "-"),
						type: String(row[7] || "-"),
						amount: Number(row[5] || 0),
						duration: Number(row[8] || 0),
						itemName: String(row[6] || "-"),
						status: String(row[9] || "รอตรวจสอบ"),
					};
				});
				setLoans(mappedLoans);
			} else {
				console.error("Failed to load loans:", result);
				setLoans([]);
			}
		} catch (error) {
			console.error("Fetch loans error:", error);
			toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อ");
		} finally {
			setIsFetching(false);
		}
	};

	const filteredLoans = useMemo(() => {
		return loans.map(l => {
			// ดึงข้อมูลสมาชิกจาก Map (เทคนิคหน้า Deposits)
			const member = membersByLineMap.get(l.lineId) || membersByNameMap.get(l.name);
			return { ...l, lineName: member?.lineName || "-" };
		}).filter((l) => {
			const matchStatus = filterStatus === "all" || l.status === filterStatus;

			const matchHeader =
				l.id.toLowerCase().includes(headerFilters.id.toLowerCase()) &&
				l.name.toLowerCase().includes(headerFilters.name.toLowerCase()) &&
				l.type.toLowerCase().includes(headerFilters.type.toLowerCase());

			const matchSearch =
				l.name.includes(searchQuery) ||
				l.id.includes(searchQuery) ||
				l.type.includes(searchQuery) ||
				l.lineName.includes(searchQuery);

			return matchStatus && matchHeader && matchSearch;
		});
	}, [loans, filterStatus, searchQuery, headerFilters, membersByLineMap, membersByNameMap]);

	const totalPages = Math.ceil(filteredLoans.length / itemsPerPage);

	const paginatedLoans = useMemo(() => {
		const start = (currentPage - 1) * itemsPerPage;
		return filteredLoans.slice(start, start + itemsPerPage);
	}, [filteredLoans, currentPage, itemsPerPage]);

	const handleApprove = async (id: string) => {
		const loan = loans.find(l => l.id === id);
		const result = await Swal.fire({
			title: 'ยืนยันการอนุมัติสินเชื่อ?',
			text: `คุณต้องการอนุมัติคำขอกู้ของคุณ ${loan?.name || ""} จำนวน ${loan?.amount.toLocaleString() || 0} บาท ใช่หรือไม่?`,
			icon: 'question',
			showCancelButton: true,
			confirmButtonText: 'ยืนยันอนุมัติ',
			cancelButtonText: 'ยกเลิก',
			confirmButtonColor: '#10b981', // emerald-500
		});

		if (!result.isConfirmed) return;

		setIsLoading(true);
		const toastId = toast.loading("กำลังดำเนินการอนุมัติ...");
		try {
			const res = await gasApi.updateAdminLoanStatus(id, "อนุมัติ", adminName);
			if (res.success) {
				setLoans((prev) =>
					prev.map((l) => (l.id === id ? { ...l, status: "อนุมัติ" } : l))
				);
				toast.success("อนุมัติเรียบร้อยแล้ว ✅", { id: toastId });
				setIsModalOpen(false);
			} else {
				toast.error(res.msg || "เกิดข้อผิดพลาดในการอนุมัติ", { id: toastId });
			}
		} catch (error) {
			console.error(error);
			toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อ", { id: toastId });
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
		const toastId = toast.loading("กำลังดำเนินการปฏิเสธ...");
		try {
			const response = await fetch("/api/member", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					action: "admin_update_loan",
					ADMIN_SECRET: process.env.NEXT_PUBLIC_ADMIN_SECRET,
					loanId: id,
					status: "ไม่อนุมัติ",
				}),
			});
			if (!response.ok) throw new Error("Failed to update loan status");

			setLoans((prev) =>
				prev.map((l) => (l.id === id ? { ...l, status: "ไม่อนุมัติ" } : l))
			);
			toast.success("ปฏิเสธคำขอเรียบร้อย ✅", { id: toastId });
			setIsModalOpen(false);
		} catch (error) {
			console.error(error);
			toast.error("เกิดข้อผิดพลาดในการปฏิเสธ", { id: toastId });
		} finally {
			setIsLoading(false);
		}
	};

	const handleReopen = async (id: string) => {
		const result = await Swal.fire({
			title: 'ดึงกลับมาตรวจสอบใหม่?',
			text: "ระบบจะเปลี่ยนสถานะกลับเป็น 'รอตรวจสอบ' และจะทำการลบสัญญาที่สร้างไว้ (ถ้ามี) ทิ้งทันที",
			icon: 'warning',
			showCancelButton: true,
			confirmButtonText: 'ยืนยันดึงกลับ',
			cancelButtonText: 'ยกเลิก',
			confirmButtonColor: '#f59e0b', // amber-500
		});

		if (!result.isConfirmed) return;

		setIsLoading(true);
		const toastId = toast.loading("กำลังดึงข้อมูลกลับ...");
		try {
			const res = await fetch("/api/member", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					action: "admin_update_loan",
					ADMIN_SECRET: process.env.NEXT_PUBLIC_ADMIN_SECRET,
					loanId: id,
					status: "รอตรวจสอบ",
					adminName: adminName
				}),
			});
			const resData = await res.json();
			if (resData.success) {
				setLoans((prev) =>
					prev.map((l) => (l.id === id ? { ...l, status: "รอตรวจสอบ" } : l))
				);
				toast.success("ดึงข้อมูลกลับเรียบร้อยแล้ว ✅", { id: toastId });
				setIsModalOpen(false);
			} else {
				toast.error(resData.msg || "เกิดข้อผิดพลาด", { id: toastId });
			}
		} catch (error) {
			console.error(error);
			toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อ", { id: toastId });
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
			<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
				<div>
					<h1 className="text-2xl font-bold text-slate-800">
						ระบบคำขอกู้เงิน
					</h1>
					<p className="text-slate-500 text-sm mt-1">
						ตรวจสอบรายละเอียดสัญญากู้และพิจารณาอนุมัติ
					</p>
				</div>
				<div className="flex gap-3">
					<button
						onClick={() => setIsAddingLoan(true)}
						className="cursor-pointer px-5 py-2.5 bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition-all text-sm font-bold shadow-lg shadow-amber-200 flex items-center gap-2"
					>
						<Landmark size={18} />
						ออกสินเชื่อใหม่
					</button>
				</div>
			</div>

			<div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-white p-3 md:p-4 rounded-2xl shadow-sm border border-slate-100">
				{/* Tabs for Filtering - Scrollable on mobile */}
				<div className="flex bg-slate-100 p-1 rounded-xl w-full overflow-x-auto no-scrollbar gap-1">
					{[
						{ id: "รอตรวจสอบ", label: "รอตรวจสอบ" },
						{ id: "อนุมัติ", label: "อนุมัติแล้ว" },
						{ id: "ไม่อนุมัติ", label: "ไม่อนุมัติ" },
						{ id: "all", label: "ทั้งหมด" },
					].map((tab) => (
						<button
							key={tab.id}
							onClick={() => setFilterStatus(tab.id as FilterStatus)}
							className={`flex-none sm:flex-1 flex items-center justify-center gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-[11px] md:text-sm font-bold whitespace-nowrap transition-all ${filterStatus === tab.id
								? "bg-white text-sky-600 shadow-sm"
								: "text-slate-500 hover:text-slate-700 hover:bg-white/40"
								}`}
						>
							{tab.label}
							{tab.id === "รอตรวจสอบ" &&
								loans.filter((l) => l.status === "รอตรวจสอบ").length >
								0 && (
									<span className={`inline-flex items-center justify-center w-4 h-4 md:w-5 md:h-5 text-[9px] md:text-[10px] font-bold rounded-full ${filterStatus === tab.id ? 'bg-sky-600 text-white' : 'bg-rose-500 text-white'}`}>
										{
											loans.filter((l) => l.status === "รอตรวจสอบ")
												.length
										}
									</span>
								)}
						</button>
					))}
				</div>

				{/* Search & Items Per Page */}
				<div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
					<div className="relative flex-1 sm:w-64">
						<Search
							className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
							size={14}
						/>
						<input
							type="text"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder="ค้นหาชื่อ, รหัส, ประเภทสัญญา..."
							className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-xs bg-slate-50/50"
						/>
					</div>
					<select
						value={itemsPerPage}
						onChange={(e) => setItemsPerPage(Number(e.target.value))}
						className="cursor-pointer bg-slate-50/50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500"
					>
						<option value={10}>10 / หน้า</option>
						<option value={20}>20 / หน้า</option>
						<option value={50}>50 / หน้า</option>
						<option value={100}>100 / หน้า</option>
					</select>
				</div>
			</div>

			{/* Table & Card View */}
			<div className="bg-white rounded-2xl md:rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
				{/* Desktop Table View */}
				<div className="hidden md:block overflow-x-auto">
					<table className="w-full text-left border-collapse">
						<thead>
							<tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] uppercase tracking-wider">
								<th className="py-3 px-6 font-semibold text-slate-600 text-center">
									จัดการ
								</th>
								<th className="py-3 px-6 font-semibold text-slate-600">
									รหัสคำขอ
								</th>
								<th className="py-3 px-6 font-semibold text-slate-600">
									ผู้กู้
								</th>
								<th className="py-3 px-6 font-semibold text-slate-600">
									ชื่อรายการ
								</th>
								<th className="py-3 px-6 font-semibold text-slate-600">
									ประเภทสัญญา
								</th>
								<th className="py-3 px-6 font-semibold text-slate-600 pl-8">
									วงเงิน (บาท)
								</th>
								<th className="py-3 px-6 font-semibold text-slate-600 text-center">
									สถานะ
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-100">
							{isFetching ? (
								<tr>
									<td colSpan={7} className="p-0">
										<TableSkeleton rows={5} cols={7} hasHeader={false} />
									</td>
								</tr>
							) : paginatedLoans.length === 0 ? (
								<tr>
									<td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
										ไม่พบคำขอที่ตรงกับเงื่อนไข
									</td>
								</tr>
							) : (
								paginatedLoans.map((item, idx) => (
									<tr
										key={`${item.id}-${idx}`}
										className="hover:bg-slate-50 even:bg-slate-50/50 transition-colors"
									>
										<td className="py-4 px-6 text-center">
											<button
												onClick={() => openDetails(item)}
												className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${item.status === "รอตรวจสอบ"
													? "bg-sky-50 text-sky-600 hover:bg-sky-500 hover:text-white border border-sky-100"
													: "bg-slate-50 text-slate-500 hover:bg-slate-200 border border-slate-200"
													}`}
											>
												<Eye size={16} />
												{item.status === "รอตรวจสอบ"
													? "ตรวจสอบ"
													: "ดูข้อมูล"}
											</button>
										</td>
										<td className="py-4 px-6 text-slate-700 font-medium whitespace-nowrap truncate max-w-[120px] font-mono text-xs">
											{item.id}
										</td>
										<td className="py-4 px-6 text-slate-600 font-medium">
											{item.name}
										</td>
										<td className="py-4 px-6 text-slate-500 text-sm truncate max-w-[200px]">
											{item.itemName}
										</td>
										<td className="py-4 px-6">
											<span
												className={`px-3 py-1 rounded-md text-[10px] font-bold border uppercase tracking-wider ${item.type === "ฉุกเฉิน"
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
												<span className="text-[10px] text-slate-400 font-medium mt-1">
													ผ่อน {item.duration} งวด
												</span>
											</div>
										</td>
										<td className="py-4 px-6 text-center">
											<span
												className={`inline-flex px-3 py-1 rounded-full text-[10px] font-bold whitespace-nowrap ${item.status === "รอตรวจสอบ"
													? "bg-amber-100 text-amber-700 border border-amber-200"
													: item.status === "อนุมัติ"
														? "bg-emerald-100 text-emerald-700 border border-emerald-200"
														: "bg-rose-100 text-rose-700 border border-rose-200"
													}`}
											>
												{item.status === "อนุมัติ" ? "อนุมัติแล้ว" : item.status}
											</span>
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>

				{/* Mobile Card View */}
				<div className="md:hidden divide-y divide-slate-100">
					{isFetching ? (
						<div className="p-8 flex flex-col items-center justify-center gap-4">
							<Loader2 className="animate-spin text-sky-500" size={32} />
							<p className="text-sm text-slate-400 font-medium font-sans">กำลังโหลดข้อมูล...</p>
						</div>
					) : paginatedLoans.length === 0 ? (
						<div className="py-12 px-4 text-center">
							<Landmark className="mx-auto text-slate-200 mb-3" size={48} />
							<p className="text-slate-500 font-medium">ไม่พบคำขอกู้เงิน</p>
						</div>
					) : (
						paginatedLoans.map((item, idx) => (
							<div key={`${item.id}-${idx}`} className="p-4 space-y-4 hover:bg-slate-50 transition-colors active:bg-slate-100" onClick={() => openDetails(item)}>
								<div className="flex justify-between items-start">
									<div className="flex flex-col">
										<span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.id}</span>
										<span className="text-[10px] text-slate-400 font-medium">{item.date}</span>
									</div>
									<span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter ${item.status === "รอตรวจสอบ"
										? "bg-amber-100 text-amber-700"
										: item.status === "อนุมัติ"
											? "bg-emerald-100 text-emerald-700"
											: "bg-rose-100 text-rose-700"
										}`}>
										{item.status === "อนุมัติ" ? "อนุมัติแล้ว" : item.status}
									</span>
								</div>

								<div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
									<div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-sky-500 border border-slate-200 shrink-0">
										<Landmark size={20} />
									</div>
									<div className="flex flex-col min-w-0">
										<span className="text-[10px] text-sky-600 font-bold leading-none mb-1 uppercase tracking-wider">
											{item.type}
										</span>
										<span className="text-slate-800 font-black text-sm truncate block">{item.name}</span>
										<span className="text-[10px] text-slate-400 font-bold truncate">{item.itemName}</span>
									</div>
									<div className="ml-auto text-right">
										<span className="block text-lg font-black text-amber-600 tracking-tight leading-none">{item.amount.toLocaleString()}</span>
										<span className="text-[10px] font-bold text-slate-400">บาท ({item.duration} งวด)</span>
									</div>
								</div>

								<button
									onClick={(e) => { e.stopPropagation(); openDetails(item); }}
									className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold shadow-sm transition-all ${item.status === "รอตรวจสอบ"
										? "bg-sky-500 text-white shadow-sky-100"
										: "bg-slate-100 text-slate-600"
										}`}
								>
									<Eye size={18} />
									{item.status === "รอตรวจสอบ" ? "ตรวจสอบคำขอนี้" : "ดูรายละเอียด"}
								</button>
							</div>
						))
					)}
				</div>

				{/* Pagination Controls */}
				{!isFetching && filteredLoans.length > 0 && (
					<div className="bg-slate-50 border-t border-slate-100 p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
						<div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
							แสดง {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredLoans.length)} จากทั้งหมด {filteredLoans.length}
						</div>

						<div className="flex items-center gap-2">
							<button
								onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
								disabled={currentPage === 1}
								className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:bg-white hover:text-sky-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
							>
								<ChevronLeft size={20} />
							</button>

							<div className="flex items-center gap-1">
								{Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
									let pageNum = 1;
									if (totalPages <= 5) pageNum = i + 1;
									else if (currentPage <= 3) pageNum = i + 1;
									else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
									else pageNum = currentPage - 2 + i;

									return (
										<button
											key={pageNum}
											onClick={() => setCurrentPage(pageNum)}
											className={`w-10 h-10 rounded-xl text-sm font-bold transition-all ${currentPage === pageNum
												? "bg-sky-600 text-white shadow-lg shadow-sky-100"
												: "bg-white text-slate-500 border border-slate-100 hover:border-sky-200 hover:text-sky-600"
												}`}
										>
											{pageNum}
										</button>
									);
								})}
							</div>

							<button
								onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
								disabled={currentPage === totalPages}
								className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:bg-white hover:text-sky-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
							>
								<ChevronRight size={20} />
							</button>
						</div>
					</div>
				)}
			</div>


			{/* Modal ดูรายละเอียดคำขอกู้ */}
			{isModalOpen && selectedLoan && (
				<LoanDetailModal
					loan={selectedLoan}
					isLoading={isLoading}
					onApprove={handleApprove}
					onReject={handleReject}
					onReopen={handleReopen}
					onClose={() => setIsModalOpen(false)}
				/>
			)}

			{/* Modal ออกสินเชื่อใหม่ */}
			{isAddingLoan && (
				<LoanAddModal
					onClose={(wasAdded) => {
						setIsAddingLoan(false);
						if (wasAdded) fetchLoans();
					}}
				/>
			)}
		</div>
	);
}
