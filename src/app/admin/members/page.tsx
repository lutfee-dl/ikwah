"use client";

import { Member } from "@/types";
import { useState, useMemo } from "react";
import { Search, Eye, X, CheckCircle2, UserCircle, RefreshCw, ChevronLeft, ChevronRight, ArrowUpDown, ArrowDownUp, Edit3 } from "lucide-react";
import Image from "next/image";
import { useAdminMembers } from "@/hooks/useAdminMembers";
import MemberDetailModal from "./MemberDetailModal";
import MemberEditModal from "./MemberEditModal";

export default function MembersPage() {
	const { members, loading, error, refetch: fetchMembers } = useAdminMembers();
	const [searchTerm, setSearchTerm] = useState("");
	const [selectedMember, setSelectedMember] = useState<Member | null>(null);
	const [editingMember, setEditingMember] = useState<Member | null>(null);
	
	// Sort state
	const [sortConfig, setSortConfig] = useState<{
		key: keyof Member | "fullName" | "accumulatedShares" | "remainingAmount";
		direction: "asc" | "desc" | null;
	}>({ key: "fullName", direction: null });

	// Pagination state
	const [currentPage, setCurrentPage] = useState(1);
	const [itemsPerPage, setItemsPerPage] = useState(10);

	const filteredMembers = members.filter(m => {
		// 1. Text Search
		return (m.fullName?.includes(searchTerm) || false) || 
			(m.idCard?.includes(searchTerm) || false) || 
			(m.lineName?.includes(searchTerm) || false);
	});

	// Use useMemo for sorting the filtered members
	const sortedAndFilteredMembers = useMemo(() => {
		const sortableItems = [...filteredMembers];
		
		if (sortConfig.direction !== null) {
			sortableItems.sort((a, b) => {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				let aValue: any = a[sortConfig.key as keyof Member];
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				let bValue: any = b[sortConfig.key as keyof Member];

				// Special handling for nested or derived values
				if (sortConfig.key === "remainingAmount") {
					aValue = a.loanData?.remainingAmount || 0;
					bValue = b.loanData?.remainingAmount || 0;
				} else if (sortConfig.key === "accumulatedShares") {
					aValue = a.accumulatedShares || 0;
					bValue = b.accumulatedShares || 0;
				}

				if (aValue < bValue) {
					return sortConfig.direction === "asc" ? -1 : 1;
				}
				if (aValue > bValue) {
					return sortConfig.direction === "asc" ? 1 : -1;
				}
				return 0;
			});
		}
		return sortableItems;
	}, [filteredMembers, sortConfig]);

	// Pagination logic
	const totalPages = Math.ceil(sortedAndFilteredMembers.length / itemsPerPage);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const endIndex = startIndex + itemsPerPage;
	const currentMembers = sortedAndFilteredMembers.slice(startIndex, endIndex);

	const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setSearchTerm(e.target.value);
		setCurrentPage(1); // Reset to first page when searching
	};

	const handleSort = (key: keyof Member | "fullName" | "accumulatedShares" | "remainingAmount") => {
		let direction: "asc" | "desc" | null = "asc";
		if (sortConfig.key === key) {
			if (sortConfig.direction === "asc") direction = "desc";
			else if (sortConfig.direction === "desc") direction = null;
		}
		setSortConfig({ key, direction });
	};

	const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		setItemsPerPage(Number(e.target.value));
		setCurrentPage(1);
	};

	return (
		<div className="space-y-6 relative">
			{/* Header */}
			<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
				<div>
					<h1 className="text-2xl font-bold text-slate-800">ทะเบียนและภาพรวมสมาชิก</h1>
					<p className="text-slate-500 text-sm mt-1">
						ดูข้อมูลเงินฝากสะสม ยอดหนี้คงเหลือ และตารางการผ่อนชำระแบบครบวงจร
					</p>
				</div>
				<div className="flex gap-3 w-full md:w-auto">
					<button 
						onClick={fetchMembers}
						className="cursor-pointer px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium whitespace-nowrap"
					>
						<RefreshCw className="inline-block mr-1" size={16} />
						รีเฟรชข้อมูล
					</button>
					<div className="relative flex-1 md:w-64">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
						<input
							type="text"
							value={searchTerm}
							onChange={handleSearchChange}
							placeholder="ค้นหาระบุชื่อสมาชิก / เลขบัตรประชาชน / ชื่อไลน์"
							className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all font-sans"
						/>
					</div>
				</div>
			</div>

			{/* Loading Skeletons */}
			{loading && (
				<>
					<div className="grid grid-cols-3 md:grid-cols-3 gap-2 md:gap-6 mb-8 mt-6">
						{[1, 2, 3].map((i) => (
							<div key={i} className="bg-white p-3 md:p-6 rounded-xl md:rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-2 md:gap-5 animate-pulse">
								<div className="w-10 h-10 md:w-14 md:h-14 bg-slate-200 rounded-xl md:rounded-2xl shrink-0"></div>
								<div className="w-full flex flex-col space-y-2 items-center md:items-start">
									<div className="h-3 bg-slate-200 rounded-md w-16 md:w-24"></div>
									<div className="h-6 bg-slate-200 rounded-md w-12 md:w-20"></div>
								</div>
							</div>
						))}
					</div>
					<div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col mb-8">
						<div className="p-4 border-b border-slate-200 h-14 bg-slate-50/50"></div>
						<div className="overflow-x-auto">
							<table className="w-full text-left border-collapse whitespace-nowrap">
								<thead>
									<tr className="bg-slate-50 border-b border-slate-200 animate-pulse">
										<th className="py-4 px-6"><div className="h-4 bg-slate-200 rounded-md w-24"></div></th>
										<th className="py-4 px-6"><div className="h-4 bg-slate-200 rounded-md w-32"></div></th>
										<th className="py-4 px-6"><div className="h-4 bg-slate-200 rounded-md w-20 ml-auto"></div></th>
										<th className="py-4 px-6"><div className="h-4 bg-slate-200 rounded-md w-20 ml-auto"></div></th>
										<th className="py-4 px-6"><div className="h-4 bg-slate-200 rounded-md w-16 mx-auto"></div></th>
										<th className="py-4 px-6"><div className="h-4 bg-slate-200 rounded-md w-20 mx-auto"></div></th>
									</tr>
								</thead>
								<tbody className="divide-y divide-slate-100">
									{[1, 2, 3, 4, 5].map((i) => (
										<tr key={i} className="animate-pulse">
											<td className="py-4 px-6">
												<div className="flex items-center gap-4">
													<div className="w-12 h-12 rounded-full bg-slate-200 shrink-0"></div>
													<div className="space-y-2">
														<div className="h-4 bg-slate-200 rounded-md w-24"></div>
														<div className="h-3 bg-slate-100 rounded-md w-16"></div>
													</div>
												</div>
											</td>
											<td className="py-4 px-6">
												<div className="space-y-2">
													<div className="h-4 bg-slate-200 rounded-md w-32"></div>
													<div className="h-3 bg-slate-100 rounded-md w-24"></div>
												</div>
											</td>
											<td className="py-4 px-6"><div className="h-4 bg-slate-200 rounded-md w-16 ml-auto"></div></td>
											<td className="py-4 px-6"><div className="h-6 bg-slate-200 rounded-lg w-20 ml-auto"></div></td>
											<td className="py-4 px-6"><div className="h-6 bg-slate-200 rounded-full w-20 mx-auto"></div></td>
											<td className="py-4 px-6 flex justify-center gap-2"><div className="h-8 bg-slate-200 rounded-lg w-16"></div><div className="h-8 bg-slate-200 rounded-lg w-16"></div></td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
				</>
			)}
			
			{error && (
				<div className="text-center py-10 bg-red-50 rounded-2xl border border-red-100 flex flex-col items-center justify-center gap-3">
					<X className="text-red-500 bg-red-100 p-2 rounded-full w-12 h-12" />
					<div>
						<p className="font-bold text-red-600 text-lg">เกิดข้อผิดพลาด</p>
						<p className="text-red-500 text-sm mt-1">{error}</p>
					</div>
					<button onClick={fetchMembers} className="cursor-pointer mt-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-semibold hover:bg-red-200 transition-colors">
						ลองใหม่อีกครั้ง
					</button>
				</div>
			)}

			{/* Status Cards */}
			{!loading && !error && (
				<div className="grid grid-cols-3 md:grid-cols-3 gap-2 md:gap-6 mb-8">
					<div className="bg-white p-3 md:p-6 rounded-xl md:rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-2 md:gap-5 hover:shadow-md transition-shadow relative overflow-hidden text-center md:text-left">
						<div className="absolute top-0 right-0 w-16 h-16 md:w-24 md:h-24 bg-sky-50 rounded-full -mr-4 -mt-4 md:-mr-8 md:-mt-8 opacity-50"></div>
						<div className="w-10 h-10 md:w-14 md:h-14 bg-sky-100 text-sky-600 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0 z-10 relative">
							<UserCircle size={20} className="md:w-7 md:h-7" />
						</div>
						<div className="z-10 relative">
							<p className="text-[10px] md:text-sm font-medium text-slate-500 mb-0.5 md:mb-1">สมาชิกทั้งหมด</p>
							<p className="text-lg md:text-3xl font-black text-slate-800 tracking-tight">{members.length} <span className="text-[10px] md:text-base font-medium text-slate-400">คน</span></p>
						</div>
					</div>
					<div className="bg-white p-3 md:p-6 rounded-xl md:rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-2 md:gap-5 hover:shadow-md transition-shadow relative overflow-hidden text-center md:text-left">
						<div className="absolute top-0 right-0 w-16 h-16 md:w-24 md:h-24 bg-emerald-50 rounded-full -mr-4 -mt-4 md:-mr-8 md:-mt-8 opacity-50"></div>
						<div className="w-10 h-10 md:w-14 md:h-14 bg-emerald-100 text-emerald-600 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0 z-10 relative">
							<CheckCircle2 size={20} className="md:w-7 md:h-7" />
						</div>
						<div className="z-10 relative">
							<p className="text-[10px] md:text-sm font-medium text-slate-500 mb-0.5 md:mb-1">ปัจจุบัน</p>
							<p className="text-lg md:text-3xl font-black text-emerald-600 tracking-tight">
								{members.filter(m => m.status === "สมาชิก").length} <span className="text-[10px] md:text-base font-medium text-slate-400">คน</span>
							</p>
						</div>
					</div>
					<div className="bg-white p-3 md:p-6 rounded-xl md:rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-2 md:gap-5 hover:shadow-md transition-shadow relative overflow-hidden text-center md:text-left">
						<div className="absolute top-0 right-0 w-16 h-16 md:w-24 md:h-24 bg-rose-50 rounded-full -mr-4 -mt-4 md:-mr-8 md:-mt-8 opacity-50"></div>
						<div className="w-10 h-10 md:w-14 md:h-14 bg-rose-100 text-rose-600 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0 z-10 relative">
							<X size={20} className="md:w-7 md:h-7" />
						</div>
						<div className="z-10 relative">
							<p className="text-[10px] md:text-sm font-medium text-slate-500 mb-0.5 md:mb-1">พ้นสภาพ</p>
							<p className="text-lg md:text-3xl font-black text-rose-600 tracking-tight">
								{members.filter(m => m.status === "ลาออก").length} <span className="text-[10px] md:text-base font-medium text-slate-400">คน</span>
							</p>
						</div>
					</div>
				</div>
			)}

			{/* Main Table */}
			{!loading && !error && (
				<div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col mt-6">
					<div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
						<div className="flex items-center gap-2">
							<span className="text-sm text-slate-500 font-medium">แสดง</span>
							<select 
								value={itemsPerPage}
								onChange={handleItemsPerPageChange}
								className="border border-slate-200 rounded-lg text-sm p-1.5 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
							>
								<option value={10}>10</option>
								<option value={20}>20</option>
								<option value={50}>50</option>
								<option value={100}>100</option>
							</select>
							<span className="text-sm text-slate-500 font-medium">รายการต่อหน้า</span>
						</div>
					</div>
					<div className="overflow-x-auto">
						<table className="w-full text-left border-collapse whitespace-nowrap">
							<thead>
								<tr className="bg-slate-50 border-b border-slate-200">
									<th className="py-4 px-6 font-bold text-slate-500 text-xs uppercase tracking-wider">
										<div className="flex items-center justify-start gap-1 cursor-pointer hover:text-sky-600 group" onClick={() => handleSort('memberId')}>
											<span>รหัสสมาชิก / โปรไฟล์</span>
											<span className="text-slate-400 group-hover:text-sky-500">
												{sortConfig.key === 'memberId' && sortConfig.direction === 'asc' && <ArrowDownUp size={14} className="rotate-180" />}
												{sortConfig.key === 'memberId' && sortConfig.direction === 'desc' && <ArrowDownUp size={14} />}
												{sortConfig.key !== 'memberId' || sortConfig.direction === null ? <ArrowUpDown size={14} className="opacity-0 group-hover:opacity-50" /> : null}
											</span>
										</div>
									</th>
									<th className="py-4 px-6 font-bold text-slate-500 text-xs uppercase tracking-wider">
										<div className="flex items-center justify-start gap-1 cursor-pointer hover:text-sky-600 group" onClick={() => handleSort('fullName')}>
											<span>ข้อมูลชื่อ-นามสกุล</span>
											<span className="text-slate-400 group-hover:text-sky-500">
												{sortConfig.key === 'fullName' && sortConfig.direction === 'asc' && <ArrowDownUp size={14} className="rotate-180" />}
												{sortConfig.key === 'fullName' && sortConfig.direction === 'desc' && <ArrowDownUp size={14} />}
												{sortConfig.key !== 'fullName' || sortConfig.direction === null ? <ArrowUpDown size={14} className="opacity-0 group-hover:opacity-50" /> : null}
											</span>
										</div>
									</th>
									<th className="py-4 px-6 font-bold text-slate-500 text-xs uppercase tracking-wider text-right">
										<div className="flex items-center justify-end gap-1 cursor-pointer hover:text-sky-600 group" onClick={() => handleSort('accumulatedShares')}>
											<span className="text-slate-400 group-hover:text-sky-500">
												{sortConfig.key === 'accumulatedShares' && sortConfig.direction === 'asc' && <ArrowDownUp size={14} className="rotate-180" />}
												{sortConfig.key === 'accumulatedShares' && sortConfig.direction === 'desc' && <ArrowDownUp size={14} />}
												{sortConfig.key !== 'accumulatedShares' || sortConfig.direction === null ? <ArrowUpDown size={14} className="opacity-0 group-hover:opacity-50" /> : null}
											</span>
											<span>หุ้นสะสม (฿)</span>
										</div>
									</th>
									<th className="py-4 px-6 font-bold text-slate-500 text-xs uppercase tracking-wider text-right">
										<div className="flex items-center justify-end gap-1 cursor-pointer hover:text-sky-600 group" onClick={() => handleSort('totalLoanDebt')}>
											<span className="text-slate-400 group-hover:text-sky-500">
												{sortConfig.key === 'totalLoanDebt' && sortConfig.direction === 'asc' && <ArrowDownUp size={14} className="rotate-180" />}
												{sortConfig.key === 'totalLoanDebt' && sortConfig.direction === 'desc' && <ArrowDownUp size={14} />}
												{sortConfig.key !== 'totalLoanDebt' || sortConfig.direction === null ? <ArrowUpDown size={14} className="opacity-0 group-hover:opacity-50" /> : null}
											</span>
											<span>หนี้คงเหลือรวม (฿)</span>
										</div>
									</th>
									<th className="py-4 px-6 font-bold text-slate-500 text-xs uppercase tracking-wider text-center">
										<div className="flex items-center justify-center gap-1 cursor-pointer hover:text-sky-600 group" onClick={() => handleSort('status')}>
											<span>สถานะ</span>
											<span className="text-slate-400 group-hover:text-sky-500">
												{sortConfig.key === 'status' && sortConfig.direction === 'asc' && <ArrowDownUp size={14} className="rotate-180" />}
												{sortConfig.key === 'status' && sortConfig.direction === 'desc' && <ArrowDownUp size={14} />}
												{sortConfig.key !== 'status' || sortConfig.direction === null ? <ArrowUpDown size={14} className="opacity-0 group-hover:opacity-50" /> : null}
											</span>
										</div>
									</th>
									<th className="py-4 px-6 font-bold text-slate-500 text-xs uppercase tracking-wider text-center">
										จัดการ
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-100">
								{currentMembers.length > 0 ? (
									currentMembers.map((member, index) => (
										<tr key={member.lineUserId || `unverified-${index}-${member.idCard || member.fullName}`} className="hover:bg-slate-50/80 transition-colors group">
											<td className="py-4 px-6">
												<div className="flex items-center gap-4">
													{member.pictureUrl ? (
														<Image 
															src={member.pictureUrl} 
															alt={member.lineName} 
															width={48}
															height={48}
															className="w-12 h-12 rounded-full border-2 border-white shadow-sm object-cover bg-slate-100" 
														/>
													) : (
														<div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 border-2 border-white shadow-sm flex items-center justify-center">
															<UserCircle size={32} />
														</div>
													)}
													<div>
														<p className="font-black text-slate-900 tracking-tight">{member.memberId || "IKW-"}</p>
														<p className="text-[10px] text-slate-400 font-medium mt-0.5 line-clamp-1">
															{member.lineName || "ไม่ระบุชื่อไลน์"}
														</p>
													</div>
												</div>
											</td>
											<td className="py-4 px-6">
												<div>
													<p className="font-bold text-slate-700">{member.prefix} {member.fullName}</p>
													<div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
														<span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-medium">{member.phone || "ไม่มีเบอร์"}</span>
														<span className="text-slate-300">|</span>
														<span className="text-slate-500">บัตร: {member.idCard || "-"}</span>
													</div>
												</div>
											</td>
											<td className="py-4 px-6 text-right">
												<span className="font-black text-sky-600 text-base tabular-nums">
													{member.accumulatedShares ? member.accumulatedShares.toLocaleString() : "0"} บาท
												</span>
											</td>
											<td className="py-4 px-6 text-right">
												<span className="font-black text-rose-500 text-base tabular-nums bg-rose-50 px-3 py-1 rounded-lg border border-rose-100">
													{(member.totalLoanDebt || 0).toLocaleString()} <span className="text-[10px] opacity-60">฿</span>
												</span>
											</td>
											<td className="py-4 px-6 text-center">
												<span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ring-1 ${
													member.status === "สมาชิก" 
														? "bg-emerald-50 text-emerald-600 ring-emerald-200" 
														: "bg-slate-50 text-slate-500 ring-slate-200"
												}`}>
													{member.status === "สมาชิก" ? "สมาชิกปกติ" : "ลาออก"}
												</span>
											</td>
											<td className="py-4 px-6 text-center">
												<div className="flex items-center justify-center gap-2">
													<button
														onClick={() => setSelectedMember(member)}
														className="cursor-pointer inline-flex items-center justify-center gap-2 px-3 py-2 bg-white text-slate-600 hover:bg-sky-500 hover:text-white rounded-lg text-xs font-bold transition-all border border-slate-200 hover:border-sky-500 shadow-sm"
													>
														<Eye size={16} /> ประวัติ
													</button>
													<button
														onClick={() => setEditingMember(member)}
														className="cursor-pointer inline-flex items-center justify-center gap-2 px-3 py-2 bg-white text-emerald-600 hover:bg-emerald-500 hover:text-white rounded-lg text-xs font-bold transition-all border border-slate-200 hover:border-emerald-500 shadow-sm"
													>
														<Edit3 size={16} /> แก้ไข
													</button>
												</div>
											</td>
										</tr>
									))
								) : (
									<tr>
										<td colSpan={6} className="py-16 text-center text-slate-500">
											<div className="flex flex-col items-center justify-center gap-3">
												<Search size={40} className="text-slate-300" />
												<p className="text-lg font-medium text-slate-600">ไม่พบข้อมูลสมาชิก</p>
												<p className="text-sm">ลองค้นหาด้วยคำค้นอื่น หรือรีเฟรชข้อมูลใหม่</p>
											</div>
										</td>
									</tr>
								)}
							</tbody>
						</table>
					</div>
					
					{/* Pagination Controls */}
					{filteredMembers.length > 0 && (
						<div className="bg-slate-50 border-t border-slate-200 p-4 flex flex-col md:flex-row justify-between items-center gap-4">
							<div className="text-sm font-medium text-slate-500">
								แสดง {startIndex + 1} ถึง {Math.min(endIndex, filteredMembers.length)} จากทั้งหมด {filteredMembers.length} รายการ
							</div>
							
							<div className="flex items-center gap-1">
								<button 
									onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
									disabled={currentPage === 1}
									className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
								>
									<ChevronLeft size={16} />
								</button>
								
								<div className="flex items-center gap-1 px-2">
									{Array.from({ length: Math.min(5, totalPages) }).map((_, idx) => {
										// Simple pagination logic to show max 5 pages centered around current
										let pageNum = currentPage;
										if (totalPages <= 5) {
											pageNum = idx + 1;
										} else if (currentPage <= 3) {
											pageNum = idx + 1;
										} else if (currentPage >= totalPages - 2) {
											pageNum = totalPages - 4 + idx;
										} else {
											pageNum = currentPage - 2 + idx;
										}

										return (
											<button
												key={pageNum}
												onClick={() => setCurrentPage(pageNum)}
												className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
													currentPage === pageNum
														? "bg-sky-500 text-white border-sky-500 shadow-sm"
														: "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
												}`}
											>
												{pageNum}
											</button>
										);
									})}
								</div>

								<button 
									onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
									disabled={currentPage === totalPages}
									className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
								>
									<ChevronRight size={16} />
								</button>
							</div>
						</div>
					)}
				</div>
			)}

			{/* Detail Modal (The "Big Picture" View) */}
			{selectedMember && (
				<MemberDetailModal 
					member={selectedMember} 
					onClose={() => setSelectedMember(null)} 
				/>
			)}
			
			{/* Edit Member Modal */}
			{editingMember && (
				<MemberEditModal 
					member={editingMember} 
					onClose={(wasEdited?: boolean) => {
						setEditingMember(null);
						// Only trigger a re-fetch if data was actually saved successfully inside the edit modal
						if(wasEdited === true) {
							// If the backend was updated, we fetch the updated list so the table is fully sync'd
							location.reload(); 
						}
					}} 
				/>
			)}
		</div>
	);
}
