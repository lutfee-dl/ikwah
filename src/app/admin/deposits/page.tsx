"use client";

import { Search, Eye, X, CheckCircle2, XCircle, ArrowUpDown, ArrowUp, ArrowDown, Loader2, FileClock } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import { NumericFormat } from "react-number-format";
import Swal from "sweetalert2";
import { toast } from "react-hot-toast";


type Deposit = {
	id: string;
	name: string;
	amount: number;
	date: string;
	status: "pending" | "approved" | "rejected";
	rawStatus?: string;
	slipUrl: string;
};

type FilterStatus = "pending" | "approved" | "rejected" | "all";
type SortColumn = "id" | "name" | "amount" | "date" | "status";
type SortDirection = "asc" | "desc";

// นำ SortIcon ออกมาประกาศข้างนอกเพื่อป้องกัน Error: Cannot create components during render
const SortIcon = ({ column, sortConfig }: { column: SortColumn, sortConfig: { column: SortColumn, direction: SortDirection } }) => {
	if (sortConfig.column !== column) return <ArrowUpDown size={14} className="inline ml-1 text-slate-300" />;
	return sortConfig.direction === "asc" ?
		<ArrowUp size={14} className="inline ml-1 text-sky-500" /> :
		<ArrowDown size={14} className="inline ml-1 text-sky-500" />;
};

const API_URL = "/api/member";

export default function DepositsPage() {
	const [deposits, setDeposits] = useState<Deposit[]>([]);
	const [loading, setLoading] = useState(true);
	const [filterStatus, setFilterStatus] = useState<FilterStatus>("pending");
	const [searchQuery, setSearchQuery] = useState("");
	const [sortConfig, setSortConfig] = useState<{ column: SortColumn, direction: SortDirection }>({
		column: "date",
		direction: "asc" // เก่า-ใหม่ (Ascending)
	});

	const [selectedDeposit, setSelectedDeposit] = useState<Deposit | null>(null);
	const [editAmount, setEditAmount] = useState<number>(0);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [isUpdating, setIsUpdating] = useState(false);
	const [isZoomOpen, setIsZoomOpen] = useState(false);

	const getDriveImageUrl = (url: string) => {
		if (!url || typeof url !== 'string') return "";

		// 1. ถ้าเป็นลิงก์ Google Drive
		if (url.includes("drive.google.com") || url.includes("googleusercontent.com")) {
			// ดึง File ID: ค้นหาชุดตัวอักษรที่มีความยาวเหมือน ID ของ Google Drive (33 ตัว หรือใกล้เคียง)
			// โดยเลี่ยงคำทั่วไปใน URL
			const matches = url.match(/[-\w]{25,}/g);
			const fileId = matches ? matches.find(m =>
				!['drive', 'google', 'file', 'view', 'drivesdk', 'usp', 'shared'].includes(m.toLowerCase())
			) : null;

			if (fileId) {
				const finalUrl = `https://docs.google.com/thumbnail?id=${fileId}&sz=w1200`;
				return finalUrl;
			}
		}

		// 2. ถ้าเป็นลิงก์รูปภาพทั่วไป ให้คืนค่าเดิม
		return url;
	};

	const sortedAndFilteredDeposits = useMemo(() => {
		// Ensure deposits is an array before filtering
		if (!Array.isArray(deposits)) return [];

		// 1. กรองข้อมูล (Filter)
		const result = deposits.filter((d) => {
			const matchStatus =
				filterStatus === "all" || d.status === filterStatus ||
				(filterStatus === "pending" && String(d.status).includes("pending"));
			const matchSearch =
				(d.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
				(d.id || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
				(d.amount?.toString() || "").includes(searchQuery);
			return matchStatus && matchSearch;
		});

		// 2. เรียงข้อมูล (Sort)
		result.sort((a, b) => {
			let valA: string | number = a[sortConfig.column];
			let valB: string | number = b[sortConfig.column];

			if (sortConfig.column === 'date') {
				valA = new Date(a.date).getTime();
				valB = new Date(b.date).getTime();
			}

			if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
			if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
			return 0;
		});

		return result;
	}, [deposits, filterStatus, searchQuery, sortConfig]);

	const handleSort = (column: SortColumn) => {
		setSortConfig(prev => ({
			column,
			direction: prev.column === column && prev.direction === "asc" ? "desc" : "asc"
		}));
	};

	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		return date.toLocaleString('th-TH', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		}) + ' น.';
	};

	const fetchDeposits = async () => {
		setLoading(true);
		try {
			const res = await fetch(API_URL, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ action: "admin_get_deposits" })
			});
			const data = await res.json();
			if (data.success) {
				setDeposits(data.data);
			}
		} catch (error) {
			console.error("Fetch error:", error);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchDeposits();
	}, []);

	const handleApprove = async (id: string) => {
		const result = await Swal.fire({
			title: 'ยืนยันการอนุมัติ?',
			text: `คุณต้องการอนุมัติยอดฝากจำนวน ${editAmount.toLocaleString()} บาท นี้ใช่หรือไม่?`,
			icon: 'question',
			showCancelButton: true,
			confirmButtonText: 'อนุมัติ',
			cancelButtonText: 'ยกเลิก',
			confirmButtonColor: '#10b981', // emerald-500
		});

		if (!result.isConfirmed) return;

		const toastId = toast.loading("กำลังดำเนินการ...");
		setIsUpdating(true);
		try {
			const res = await fetch(API_URL, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					action: "admin_update_deposit",
					status: "approved",
					depositId: id,
					amount: editAmount // ส่งยอดที่อาจจะถูกแก้ไขไปด้วย
				})
			});

			const resData = await res.json();
			if (resData.success) {
				toast.success("อนุมัติสำเร็จ และแจ้งสมาชิกแล้ว ✅", { id: toastId });
				fetchDeposits();
				setIsModalOpen(false);
			} else {
				Swal.fire('เกิดข้อผิดพลาด', resData.msg || "ไม่สามารถอนุมัติได้", 'error');
				toast.dismiss(toastId);
			}
		} catch (error) {
			Swal.fire('ข้อผิดพลาด', 'ติดต่อเซิร์ฟเวอร์ไม่ได้', 'error');
			toast.dismiss(toastId);
			console.error(error);
		} finally {
			setIsUpdating(false);
		}
	};

	const handleReject = async (id: string) => {
		const result = await Swal.fire({
			title: 'ยืนยันการปฏิเสธ?',
			text: "คุณแน่ใจหรือไม่ที่จะ 'ไม่อนุมัติ' ยอดฝากนี้?",
			icon: 'warning',
			showCancelButton: true,
			confirmButtonText: 'ยืนยันปฏิเสธ',
			cancelButtonText: 'ยกเลิก',
			confirmButtonColor: '#ef4444', // rose-500
		});

		if (!result.isConfirmed) return;

		const toastId = toast.loading("กำลังดำเนินการ...");
		setIsUpdating(true);
		try {
			const res = await fetch(API_URL, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					action: "admin_update_deposit",
					status: "rejected",
					depositId: id
				})
			});

			const resData = await res.json();
			if (resData.success) {
				toast.success("ปฏิเสธยอดฝากเรียบร้อยแล้ว", { id: toastId });
				fetchDeposits();
				setIsModalOpen(false);
			} else {
				Swal.fire('เกิดข้อผิดพลาด', resData.msg || "ไม่สามารถปฏิเสธได้", 'error');
				toast.dismiss(toastId);
			}
		} catch (error) {
			Swal.fire('ข้อผิดพลาด', 'ติดต่อเซิร์ฟเวอร์ไม่ได้', 'error');
			toast.dismiss(toastId);
			console.error(error);
		} finally {
			setIsUpdating(false);
		}
	};

	const openDetails = (deposit: Deposit) => {
		setSelectedDeposit(deposit);
		setEditAmount(deposit.amount);
		setIsModalOpen(true);
	};

	// --- STATS CALCULATIONS ---
	const stats = useMemo(() => {
		const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
		return deposits.reduce((acc, d) => {
			if (d.status === "pending" || d.status.includes("(ซ้ำ!)")) {
				acc.pendingAmount += (Number(d.amount) || 0);
				acc.pendingCount++;
			} else if (d.status === "approved") {
				acc.totalApproved += (Number(d.amount) || 0);
				const dDate = new Date(d.date).toLocaleDateString('en-CA');
				if (dDate === today) {
					acc.approvedToday += (Number(d.amount) || 0);
				}
			}
			return acc;
		}, { pendingAmount: 0, pendingCount: 0, approvedToday: 0, totalApproved: 0 });
	}, [deposits]);

	return (
		<div className="space-y-6 relative">
			{/* 1. Header & Controls */}
			<div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
				<div>
					<h1 className="text-3xl font-black text-slate-800 tracking-tight">ระบบจัดการเงินฝาก</h1>
					<p className="text-slate-500 text-sm mt-1">
						ตรวจสอบและอนุมัติหลักฐานการโอนเงินกองทุนทั้งหมด
					</p>
				</div>
				<button
					onClick={fetchDeposits}
					className="group flex items-center gap-2 bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all hover:border-slate-300"
				>
					<Loader2 size={16} className={`${loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
					รีเฟรชข้อมูล
				</button>
			</div>

			{/* 2. SUMMARY CARDS */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
				{/* Pending Amount */}
				<div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-3xl p-5 text-white shadow-lg shadow-amber-200 relative overflow-hidden group">
					<div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
						<Loader2 size={80} />
					</div>
					<div className="relative z-10">
						<p className="text-amber-100 text-[10px] font-black uppercase tracking-widest mb-1 flex items-center gap-1">
							<FileClock size={12} /> ยอดรอตรวจสอบ
						</p>
						<h2 className="text-2xl font-black tracking-tight">{stats.pendingAmount.toLocaleString()} <span className="text-xs font-medium opacity-70">฿</span></h2>
						<p className="text-[10px] bg-white/20 inline-block px-2 py-0.5 rounded-full mt-2 font-bold">{stats.pendingCount} รายการ</p>
					</div>
				</div>

				{/* Approved Today */}
				<div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex items-center gap-4 hover:border-emerald-200 transition-all">
					<div className="bg-emerald-50 p-4 rounded-2xl text-emerald-500">
						<CheckCircle2 size={24} />
					</div>
					<div>
						<p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-0.5">อนุมัติแล้ว (วันนี้)</p>
						<h2 className="text-xl font-black text-slate-700">{stats.approvedToday.toLocaleString()} <span className="text-xs font-medium text-slate-400">฿</span></h2>
					</div>
				</div>

				{/* Total Approved */}
				<div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex items-center gap-4 hover:border-blue-200 transition-all">
					<div className="bg-blue-50 p-4 rounded-2xl text-blue-500">
						<Search size={24} />
					</div>
					<div>
						<p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-0.5">ยอดรวมทั้งหมด</p>
						<h2 className="text-xl font-black text-slate-700">{stats.totalApproved.toLocaleString()} <span className="text-xs font-medium text-slate-400">฿</span></h2>
					</div>
				</div>

				{/* Rejected Stats (Simplified) */}
				<div className="bg-slate-50 border border-slate-200 border-dashed rounded-3xl p-5 flex items-center gap-4">
					<div className="bg-white p-4 rounded-2xl text-slate-400 border border-slate-100">
						<XCircle size={24} />
					</div>
					<div>
						<p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-0.5">ถูกปฏิเสธ</p>
						<h2 className="text-xl font-black text-slate-400">
							{deposits.filter(d => d.status === 'rejected').length} <span className="text-xs font-medium">รายการ</span>
						</h2>
					</div>
				</div>
			</div>

			{/* 3. CONTROLS (TABS & SEARCH) */}
			<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-3xl shadow-sm border border-slate-100">
				{/* Tabs for Filtering */}
				<div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto overflow-x-auto no-scrollbar">
					{[
						{ id: "pending", label: "รอตรวจสอบ" },
						{ id: "approved", label: "อนุมัติแล้ว" },
						{ id: "rejected", label: "ปฏิเสธ" },
						{ id: "all", label: "ทั้งหมด" },
					].map((tab) => (
						<button
							key={tab.id}
							onClick={() => setFilterStatus(tab.id as FilterStatus)}
							className={`cursor-pointer flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${filterStatus === tab.id
								? "bg-white text-sky-600 shadow-sm"
								: "text-slate-500 hover:text-slate-700"
								}`}
						>
							{tab.label}
							{tab.id === "pending" &&
								Array.isArray(deposits) &&
								deposits.filter((d) => d.status === "pending").length >
								0 && (
									<span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold text-white bg-rose-500 rounded-full">
										{
											deposits.filter((d) => d.status === "pending")
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
						placeholder="ค้นหาชื่อ, รหัส..."
						className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-sm"
					/>
				</div>
			</div>

			{/* Table View */}
			<div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
				<div className="overflow-x-auto">
					<table className="w-full text-left border-collapse">
						<thead>
							<tr className="bg-slate-50/80 border-b border-slate-200 cursor-pointer">
								<th onClick={() => handleSort('id')} className="py-4 px-6 font-semibold text-slate-600 text-sm whitespace-nowrap hover:bg-slate-100 transition-colors">
									รหัสรายการ <SortIcon column="id" sortConfig={sortConfig} />
								</th>
								<th onClick={() => handleSort('name')} className="py-4 px-6 font-semibold text-slate-600 text-sm hover:bg-slate-100 transition-colors">
									ชื่อสมาชิก <SortIcon column="name" sortConfig={sortConfig} />
								</th>
								<th onClick={() => handleSort('amount')} className="py-4 px-6 font-semibold text-slate-600 text-sm text-right hover:bg-slate-100 transition-colors">
									จำนวนเงิน (บาท) <SortIcon column="amount" sortConfig={sortConfig} />
								</th>
								<th onClick={() => handleSort('date')} className="py-4 px-6 font-semibold text-slate-600 text-sm hover:bg-slate-100 transition-colors">
									วันที่แจ้งฝาก <SortIcon column="date" sortConfig={sortConfig} />
								</th>
								<th onClick={() => handleSort('status')} className="py-4 px-6 font-semibold text-slate-600 text-sm text-center hover:bg-slate-100 transition-colors">
									สถานะ <SortIcon column="status" sortConfig={sortConfig} />
								</th>
								<th className="py-4 px-6 font-semibold text-slate-600 text-sm text-center">
									จัดการ
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-100">
							{loading ? (
								<tr>
									<td colSpan={6} className="py-12 text-center text-slate-500">
										<Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-sky-500" />
										<p>กำลังโหลดข้อมูลการฝากเงิน...</p>
									</td>
								</tr>
							) : sortedAndFilteredDeposits.length === 0 ? (
								<tr>
									<td colSpan={6} className="py-12 text-center text-slate-400">
										ไม่พบรายการที่ตรงกับเงื่อนไข
									</td>
								</tr>
							) : (
								sortedAndFilteredDeposits.map((item) => (
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
										<td className="py-4 px-6 font-bold text-sky-600 text-right">
											{item.amount.toLocaleString()} บาท
										</td>
										<td className="py-4 px-6 text-slate-500 text-sm">
											{formatDate(item.date)}
										</td>
										<td className="py-4 px-6 text-center">
											<span
												className={`inline-flex px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap gap-1 items-center ${item.status === "approved"
													? "bg-emerald-100 text-emerald-700"
													: item.status === "rejected"
														? "bg-rose-100 text-rose-700"
														: "bg-amber-100 text-amber-700"
													}`}
											>
												{item.rawStatus?.includes("(ซ้ำ!)") && (
													<span className="text-rose-500 animate-pulse">⚠️</span>
												)}
												{item.status === "pending"
													? (item.rawStatus?.includes("รอส่งสลิป") ? "รอสลิป" : "รอตรวจสอบ")
													: item.status === "approved"
														? "อนุมัติแล้ว"
														: "ปฏิเสธ"}
												{item.rawStatus?.includes("(ซ้ำ!)") && (
													<span className="text-[10px] ml-0.5 text-rose-600 font-black">ซ้ำ!</span>
												)}
											</span>
										</td>
										<td className="py-4 px-6 text-center">
											<button
												onClick={() => openDetails(item)}
												className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${item.status === "pending"
													? "bg-sky-50 text-sky-600 hover:bg-sky-500 hover:text-white border border-sky-100 hover:border-sky-500"
													: "bg-slate-50 text-slate-500 hover:bg-slate-200 border border-slate-200"
													}`}
											>
												<Eye size={16} />
												{item.status === "pending"
													? "ตรวจสลิป"
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

			{/* Modal - Mobile-first Bottom Sheet */}
			{isModalOpen && selectedDeposit && (
				<div
					className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
					onClick={() => setIsModalOpen(false)}
				>
					<div
						className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl shadow-2xl flex flex-col max-h-[95svh] sm:max-h-[90vh] overflow-hidden"
						onClick={e => e.stopPropagation()}
					>
						{/* Handle bar for mobile */}
						<div className="flex justify-center pt-3 pb-1 sm:hidden">
							<div className="w-10 h-1 bg-slate-300 rounded-full" />
						</div>

						{/* Header */}
						<div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
							<div>
								<h3 className="font-bold text-base text-slate-800">ตรวจสอบสลิปฝากเงิน</h3>
								<p className="text-xs text-slate-500 mt-0.5">{selectedDeposit.id}</p>
							</div>
							<button
								onClick={() => setIsModalOpen(false)}
								className="text-slate-400 hover:text-slate-700 p-2 rounded-full hover:bg-slate-100 transition-colors"
							>
								<X size={20} />
							</button>
						</div>

						{/* Scrollable Content */}
						<div className="overflow-y-auto flex-1">
							{/* Member Info */}
							<div className="px-5 pt-4 pb-3 bg-slate-50 border-b border-slate-100">
								<div className="flex items-start justify-between gap-3">
									<div>
										<p className="text-xs text-slate-500">สมาชิก</p>
										<p className="font-bold text-slate-800 text-sm mt-0.5">{selectedDeposit.name}</p>
										<p className="text-xs text-slate-500 mt-0.5">{formatDate(selectedDeposit.date)}</p>
									</div>
									<span className={`shrink-0 inline-flex px-3 py-1 rounded-full text-xs font-bold ${selectedDeposit.status === "pending"
										? "bg-amber-100 text-amber-700"
										: selectedDeposit.status === "approved"
											? "bg-emerald-100 text-emerald-700"
											: "bg-rose-100 text-rose-700"
										}`}>
										{selectedDeposit.status === "pending" ? "รอตรวจสอบ" : selectedDeposit.status === "approved" ? "อนุมัติแล้ว" : "ปฏิเสธ"}
									</span>
								</div>
							</div>

							{/* Slip Image */}
							<div className="px-5 pt-4">
								<p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">รูปสลิป</p>
								<div className="bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 flex justify-center items-center min-h-[220px] relative">
									{selectedDeposit.slipUrl ? (
										<>
											<div 
												className="cursor-zoom-in relative group"
												onClick={() => setIsZoomOpen(true)}
											>
												<Image
													src={getDriveImageUrl(selectedDeposit.slipUrl)}
													alt="Slip"
													width={500}
													height={800}
													className="w-full h-auto max-h-[60svh] object-contain rounded-lg border border-slate-200 shadow-sm transition-transform duration-300 group-hover:scale-[1.02]"
													unoptimized
													onError={(e) => {
														const target = e.target as HTMLImageElement;
														target.src = "https://placehold.co/400x600?text=Invalid+Image";
													}}
												/>
												<div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300 flex items-center justify-center rounded-lg">
													<div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/90 backdrop-blur-sm p-2 rounded-full shadow-lg">
														<span className="i-lucide-zoom-in w-6 h-6 text-slate-700" />
													</div>
												</div>
											</div>
										</>
									) : (
										<p className="text-slate-400 text-sm py-8">ไม่พบรูปสลิป</p>
									)}
								</div>
							</div>

							{/* Amount */}
							{selectedDeposit.status === "pending" ? (
								<div className="px-5 pt-4 pb-2">
									<p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">ยอดเงิน (แก้ไขได้)</p>
									<div className="relative">
										<span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-lg">฿</span>
										<NumericFormat
											thousandSeparator={true}
											value={editAmount}
											onValueChange={(values) => {
												setEditAmount(values.floatValue || 0);
											}}
											className="w-full text-3xl font-black text-sky-600 bg-white border-2 border-sky-200 rounded-2xl pl-10 pr-4 py-3.5 focus:outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all text-right"
										/>
									</div>
									<p className="text-[11px] text-slate-400 mt-1.5 text-right">* แก้ไขได้ถ้ายอดไม่ตรงกับสลิป</p>
								</div>
							) : (
								<div className="px-5 pt-4 pb-2">
									<p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">ยอดเงิน</p>
									<p className="text-3xl font-black text-sky-600">฿{selectedDeposit.amount.toLocaleString()}</p>
								</div>
							)}
							<div className="h-4" />
						</div>

						{/* Sticky Action Buttons */}
						<div className="p-4 border-t border-slate-100 bg-white">
							{selectedDeposit.status === "pending" ? (
								<div className="flex gap-3">
									<button
										disabled={isUpdating}
										onClick={() => handleReject(selectedDeposit.id)}
										className="cursor-pointer flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-2xl transition-all disabled:opacity-50 active:scale-95"
									>
										{isUpdating ? <Loader2 size={18} className="animate-spin" /> : <XCircle size={18} />} ไม่อนุมัติ
									</button>
									<button
										disabled={isUpdating}
										onClick={() => handleApprove(selectedDeposit.id)}
										className="cursor-pointer flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-white bg-emerald-500 hover:bg-emerald-600 rounded-xl transition-all shadow-sm shadow-emerald-200 disabled:opacity-50"
									>
										{isUpdating ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />} อนุมัติยอดฝาก
									</button>
								</div>
							) : (
								<button
									onClick={() => setIsModalOpen(false)}
									className="w-full py-3 text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
								>
									ปิดหน้าต่าง
								</button>
							)}
						</div>
					</div>
				</div>
			)}
			{/* 🔍 Zoom Modal (Lightbox) */}
			{isZoomOpen && selectedDeposit && (
				<div 
					className="fixed inset-0 z-[999] flex items-center justify-center bg-black/90 backdrop-blur-md transition-all duration-300 animate-in fade-in"
					onClick={() => setIsZoomOpen(false)}
				>
					<div className="absolute top-6 right-6 flex gap-4">
						<a
							href={selectedDeposit.slipUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="bg-white/10 hover:bg-white/20 text-white p-3 rounded-full backdrop-blur-md transition-colors"
							onClick={(e) => e.stopPropagation()}
						>
							<span className="i-lucide-external-link w-6 h-6" />
						</a>
						<button 
							className="bg-white/10 hover:bg-white/20 text-white p-3 rounded-full backdrop-blur-md transition-colors"
							onClick={() => setIsZoomOpen(false)}
						>
							<span className="i-lucide-x w-6 h-6" />
						</button>
					</div>
					
					<div 
						className="relative max-w-[95vw] max-h-[90vh] w-auto h-auto transition-transform duration-500 animate-in zoom-in-95"
						onClick={(e) => e.stopPropagation()}
					>
						<img
							src={getDriveImageUrl(selectedDeposit.slipUrl)}
							alt="Zoomed Slip"
							className="w-auto h-auto max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl border border-white/10"
						/>
					</div>
				</div>
			)}
		</div>
	);
}
