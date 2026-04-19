"use client";

import { Search, Eye, X, CheckCircle2, XCircle, ArrowUpDown, ArrowUp, ArrowDown, Loader2 } from "lucide-react";
import { useEffect, useState, useMemo } from "react";

type Deposit = {
	id: string;
	name: string;
	amount: number;
	date: string;
	status: "pending" | "approved" | "rejected";
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
	const [sortConfig, setSortConfig] = useState<{column: SortColumn, direction: SortDirection}>({
		column: "date",
		direction: "asc" // เก่า-ใหม่ (Ascending)
	});

	const [selectedDeposit, setSelectedDeposit] = useState<Deposit | null>(null);
	const [editAmount, setEditAmount] = useState<number>(0);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [isUpdating, setIsUpdating] = useState(false);

	// Helper to convert Google Drive link to direct display link
	const getDriveImageUrl = (url: string) => {
		if (!url) return "";
		// Regex patterns for different Drive URL formats
		const patterns = [
			/\/d\/([^/?]+)/,
			/[?&]id=([^&]+)/,
			/\/file\/d\/([^/]+)/
		];

		let fileId = "";
		for (const pattern of patterns) {
			const match = url.match(pattern);
			if (match && match[1]) {
				fileId = match[1];
				break;
			}
		}

		if (fileId) {
			return `https://lh3.googleusercontent.com/u/0/d/${fileId}=w1000`;
		}
		return url;
	};

	const sortedAndFilteredDeposits = useMemo(() => {
		// Ensure deposits is an array before filtering
		if (!Array.isArray(deposits)) return [];
		
		// 1. กรองข้อมูล (Filter)
		const result = deposits.filter((d) => {
			const matchStatus =
				filterStatus === "all" || d.status === filterStatus;
			const matchSearch =
				(d.name || "").includes(searchQuery) || (d.id || "").includes(searchQuery);
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
			const result = await res.json();
			if (result.success) {
				setDeposits(result.data);
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
		if (!confirm("ยืนยันการอนุมัติยอดฝากนี้?")) return;

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
			
			const result = await res.json();
			if (result.success) {
				alert("อนุมัติสำเร็จ และส่งข้อความแจ้งสมาชิกแล้ว ✅");
				fetchDeposits(); // รีเฟรชตารางใหม่
				setIsModalOpen(false);
			} else {
				alert("เกิดข้อผิดพลาดจากเซิร์ฟเวอร์: " + (result.msg || ""));
			}
		} catch (error) {
			alert("เกิดข้อผิดพลาดในการเชื่อมต่อ");
			console.error(error);
		} finally {
			setIsUpdating(false);
		}
	};

	const handleReject = async (id: string) => {
		if (!confirm("ยืนยันการ 'ไม่อนุมัติ' ยอดฝากนี้?")) return;

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
			
			const result = await res.json();
			if (result.success) {
				alert("ปฏิเสธยอดฝากเรียบร้อยแล้ว");
				fetchDeposits(); // รีเฟรชตารางใหม่
				setIsModalOpen(false);
			} else {
				alert("เกิดข้อผิดพลาดจากเซิร์ฟเวอร์: " + (result.msg || ""));
			}
		} catch (error) {
			alert("เกิดข้อผิดพลาดในการเชื่อมต่อ");
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

	return (
		<div className="space-y-6 relative">
			{/* Header & Controls */}
			<div className="flex flex-col gap-4">
				<div>
					<h1 className="text-2xl font-bold text-slate-800">ระบบเงินฝาก</h1>
					<p className="text-slate-500 text-sm mt-1">
						ตรวจสอบสลิปและอนุมัติการฝากเงิน (ค่าเริ่มต้น: แสดงเฉพาะรายการที่รอตรวจสอบ)
					</p>
				</div>

				<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
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
								className={`cursor-pointer flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
									filterStatus === tab.id
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
												className={`inline-flex px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${
													item.status === "pending"
														? "bg-amber-100 text-amber-700"
														: item.status === "approved"
														? "bg-emerald-100 text-emerald-700"
														: "bg-rose-100 text-rose-700"
												}`}
											>
												{item.status === "pending"
													? "รอตรวจสอบ"
													: item.status === "approved"
													? "อนุมัติแล้ว"
													: "ปฏิเสธ"}
											</span>
										</td>
										<td className="py-4 px-6 text-center">
											<button
												onClick={() => openDetails(item)}
												className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
													item.status === "pending"
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

			{/* Modal ดูรายละเอียดและอนุมัติ (แยกจากตารางชัดเจน) */}
			{isModalOpen && selectedDeposit && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
					<div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
						<div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50">
							<h3 className="font-bold text-lg text-slate-800">
								ตรวจสอบการฝากเงิน
							</h3>
							<button
								onClick={() => setIsModalOpen(false)}
								className="text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-200 transition-colors"
							>
								<X size={20} />
							</button>
						</div>

						<div className="p-5 space-y-5">
							<div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 p-4 rounded-xl border border-slate-100">
								<div>
									<p className="text-slate-500 mb-1">รหัสรายการ</p>
									<p className="font-semibold text-slate-700">
										{selectedDeposit.id}
									</p>
								</div>
								<div>
									<p className="text-slate-500 mb-1">วันที่แจ้งฝาก</p>
									<p className="font-semibold text-slate-700">
										{formatDate(selectedDeposit.date)}
									</p>
								</div>
								<div className="col-span-2">
									<p className="text-slate-500 mb-1">ชื่อสมาชิก</p>
									<p className="font-semibold text-slate-800 text-base">
										{selectedDeposit.name}
									</p>
								</div>
								<div className="col-span-2">
									<p className="text-slate-500 mb-1">จำนวนเงินที่ได้รับในสลิป (ตรวจสอบ/แก้ไขได้)</p>
									<div className="relative">
										<input 
											type="tel"
											value={editAmount}
											onChange={(e) => setEditAmount(Number(e.target.value.replace(/[^0-9]/g, "")))}
											className="w-full text-2xl font-black text-sky-600 bg-white border-2 border-sky-100 rounded-xl px-4 py-2 focus:outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all text-right"
										/>
										<span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">฿</span>
									</div>
									<p className="text-[10px] text-slate-400 mt-1 italic">* หากบอทอ่านยอดมาผิด คุณสามารถแก้ไขตัวเลขตรงนี้ก่อนกดยืนยันได้ครับ</p>
								</div>
							</div>

							<div>
								<p className="text-slate-600 font-medium mb-3 text-center">
									แนบรูปสลิปจากสมาชิก
								</p>
								<div className="bg-slate-100 rounded-xl p-2 border border-slate-200 flex justify-center min-h-[200px] items-center">
									{selectedDeposit.slipUrl ? (
										<img
											src={getDriveImageUrl(selectedDeposit.slipUrl)}
											alt="Slip Image"
											className="max-w-full w-full h-auto max-h-[500px] rounded-lg object-contain bg-white shadow-sm transition-opacity duration-300"
											onError={(e) => {
												// Fallback if direct link fails
												(e.target as HTMLImageElement).src = 'https://placehold.co/400x600?text=ErrorLoadingImage';
											}}
										/>
									) : (
										<p className="text-slate-400">ไม่พบรูปสลิป</p>
									)}
								</div>
							</div>
						</div>

						<div className="p-5 border-t border-slate-100 bg-white">
							{selectedDeposit.status === "pending" ? (
								<div className="grid grid-cols-2 gap-3">
									<button
										disabled={isUpdating}
										onClick={() => handleReject(selectedDeposit.id)}
										className="cursor-pointer flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 hover:text-rose-700 border border-rose-200 rounded-xl transition-all disabled:opacity-50"
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
		</div>
	);
}
