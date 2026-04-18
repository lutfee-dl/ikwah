"use client";

import { useState } from "react";
import { Search, Filter, Eye, X, Wallet, CreditCard, CheckCircle2, UserCircle } from "lucide-react";
import Image from "next/image";

// ข้อมูลจำลองสำหรับภาพรวมสมาชิก (อิงตามคอลัมน์ Google Sheets: LINE_UserID, LineName, Prefix, FullName, AccountName, IDCard, Phone, AccumulatedShares, Picture_URL)
const mockMembers = [
	{
		lineUserId: "U1234567890abcdef1234567890",
		lineName: "Sudteeruk",
		prefix: "นาย",
		fullName: "สุดที่รัก พิทักษ์ไทย",
		accountName: "สุดที่รัก พิทักษ์ไทย",
		idCard: "1102003004005",
		phone: "081-234-5678",
		accumulatedShares: 15000,
		pictureUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sudteeruk",
		status: "active",
		hasActiveLoan: true,
		loanData: {
			id: "L002",
			type: "กัรฏฮะซัน",
			totalAmount: 30000,
			paidAmount: 5000,
			remainingAmount: 25000,
			duration: 12,
			schedule: [
				{ period: 1, month: "พ.ย. 66", amount: 2500, status: "paid", payDate: "15/11/2023" },
				{ period: 2, month: "ธ.ค. 66", amount: 2500, status: "paid", payDate: "15/12/2023" },
				{ period: 3, month: "ม.ค. 67", amount: 2500, status: "pending", payDate: "-" },
				{ period: 4, month: "ก.พ. 67", amount: 2500, status: "pending", payDate: "-" },
				{ period: 5, month: "มี.ค. 67", amount: 2500, status: "pending", payDate: "-" },
				{ period: 6, month: "เม.ย. 67", amount: 2500, status: "pending", payDate: "-" },
				{ period: 7, month: "พ.ค. 67", amount: 2500, status: "pending", payDate: "-" },
				{ period: 8, month: "มิ.ย. 67", amount: 2500, status: "pending", payDate: "-" },
				{ period: 9, month: "ก.ค. 67", amount: 2500, status: "pending", payDate: "-" },
				{ period: 10, month: "ส.ค. 67", amount: 2500, status: "pending", payDate: "-" },
				{ period: 11, month: "ก.ย. 67", amount: 2500, status: "pending", payDate: "-" },
				{ period: 12, month: "ต.ค. 67", amount: 2500, status: "pending", payDate: "-" },
			]
		}
	},
	{
		lineUserId: "U0987654321fedcba0987654321",
		lineName: "Anucha.R",
		prefix: "นาย",
		fullName: "อนุชา รักสงบ",
		accountName: "อนุชา รักสงบ",
		idCard: "1102003004006",
		phone: "089-876-5432",
		accumulatedShares: 8000,
		pictureUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Anucha",
		status: "active",
		hasActiveLoan: false,
		loanData: null
	},
	{
		lineUserId: "U5555555555ccccc55555555555",
		lineName: "Somchai DD",
		prefix: "นาย",
		fullName: "สมชาย ใจดี",
		accountName: "สมชาย ใจดี",
		idCard: "1102003004007",
		phone: "085-555-1234",
		accumulatedShares: 25000,
		pictureUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Somchai",
		status: "inactive",
		hasActiveLoan: false,
		loanData: null
	},
];

export default function MembersPage() {
	const [members] = useState(mockMembers);
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedMember, setSelectedMember] = useState<typeof mockMembers[0] | null>(null);

	const filteredMembers = members.filter(
		m => (m.fullName?.includes(searchQuery) || false) || 
			 (m.idCard?.includes(searchQuery) || false) || 
			 (m.lineName?.includes(searchQuery) || false)
	);

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
					<div className="relative flex-1 md:w-64">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
						<input
							type="text"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder="ค้นหาชื่อ, รหัส..."
							className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
						/>
					</div>
					<button className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors text-sm">
						<Filter size={18} />
						<span className="hidden sm:inline">กรอง</span>
					</button>
				</div>
			</div>

			{/* Main Table */}
			<div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
				<div className="overflow-x-auto">
					<table className="w-full text-left border-collapse">
						<thead>
							<tr className="bg-slate-50/80 border-b border-slate-200">
								<th className="py-4 px-6 font-semibold text-slate-600 text-sm">ผู้ใช้งาน (LINE)</th>
								<th className="py-4 px-6 font-semibold text-slate-600 text-sm">ชื่อ-นามสกุล</th>
								<th className="py-4 px-6 font-semibold text-slate-600 text-sm text-right">หุ้นสะสม (฿)</th>
								<th className="py-4 px-6 font-semibold text-slate-600 text-sm text-right">ยอดหนี้คงเหลือ (฿)</th>
								<th className="py-4 px-6 font-semibold text-slate-600 text-sm text-center">สถานะ</th>
								<th className="py-4 px-6 font-semibold text-slate-600 text-sm text-center">ดูข้อมูล</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-100">
							{filteredMembers.map((member) => (
								<tr key={member.lineUserId} className="hover:bg-slate-50 transition-colors">
									<td className="py-4 px-6">
										<div className="flex items-center gap-3">
											{member.pictureUrl ? (
												<Image 
													src={member.pictureUrl} 
													alt={member.lineName} 
													width={40}
													height={40}
													className="w-10 h-10 rounded-full border border-slate-200 bg-white" 
												/>
											) : (
												<UserCircle className="text-slate-300" size={40} />
											)}
											<div>
												<p className="font-semibold text-slate-800">{member.lineName}</p>
											</div>
										</div>
									</td>
									<td className="py-4 px-6">
										<div>
											<p className="font-semibold text-slate-700">{member.prefix}{member.fullName}</p>
											<p className="text-xs text-slate-500">โทร: {member.phone} | บัตร: {member.idCard}</p>
										</div>
									</td>
									<td className="py-4 px-6 text-right font-bold text-sky-600">
										{member.accumulatedShares.toLocaleString()}
									</td>
									<td className="py-4 px-6 text-right">
										{member.hasActiveLoan ? (
											<span className="font-bold text-rose-500">
												{member.loanData?.remainingAmount.toLocaleString()}
											</span>
										) : (
											<span className="text-slate-300">-</span>
										)}
									</td>
									<td className="py-4 px-6 text-center">
										<span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${
											member.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
										}`}>
											{member.status === "active" ? "ปกติ" : "พ้นสภาพ"}
										</span>
									</td>
									<td className="py-4 px-6 text-center">
										<button
											onClick={() => setSelectedMember(member)}
											className="inline-flex items-center gap-2 px-4 py-2 bg-sky-50 text-sky-600 hover:bg-sky-500 hover:text-white rounded-xl text-sm font-semibold transition-all border border-sky-100 hover:border-sky-500"
										>
											<Eye size={16} /> ดูประวัติ
										</button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>

			{/* Detail Modal (The "Big Picture" View) */}
			{selectedMember && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
					<div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in">
						{/* Modal Header */}
						<div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50">
							<div className="flex items-center gap-3">
								{selectedMember.pictureUrl ? (
									<Image 
										src={selectedMember.pictureUrl} 
										alt={selectedMember.lineName} 
										width={48}
										height={48}
										className="w-12 h-12 rounded-full border-2 border-white shadow-sm" 
									/>
								) : (
									<UserCircle size={48} className="text-sky-600" />
								)}
								<div>
									<h3 className="font-bold text-lg text-slate-800">{selectedMember.prefix}{selectedMember.fullName}</h3>
									<p className="text-sm font-normal text-slate-500">LINE: {selectedMember.lineName} • บัตร ปชช: {selectedMember.idCard}</p>
								</div>
							</div>
							<button
								onClick={() => setSelectedMember(null)}
								className="text-slate-400 hover:bg-slate-200 p-2 rounded-full transition-colors"
							>
								<X size={20} />
							</button>
						</div>

						{/* Modal Scrollable Content */}
						<div className="p-6 overflow-y-auto bg-slate-50 flex-1">
							{/* Financial Summaries */}
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
								<div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
									<div className="w-12 h-12 rounded-full bg-sky-50 flex items-center justify-center text-sky-500">
										<Wallet size={24} />
									</div>
									<div>
										<p className="text-sm font-medium text-slate-500 mb-1">ยอดหุ้น/เงินฝากสัจจะสะสมรวม</p>
										<p className="text-3xl font-bold text-slate-800">{selectedMember.accumulatedShares.toLocaleString()} <span className="text-lg text-slate-500">฿</span></p>
									</div>
								</div>

								<div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
									<div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-500">
										<CreditCard size={24} />
									</div>
									<div>
										<p className="text-sm font-medium text-slate-500 mb-1">ยอดค้างชำระสินเชื่อคงเหลือ</p>
										<p className="text-3xl font-bold text-rose-600">
											{selectedMember.hasActiveLoan ? selectedMember.loanData?.remainingAmount.toLocaleString() : "0"} 
											<span className="text-lg text-slate-500"> ฿</span>
										</p>
									</div>
								</div>
							</div>

							{/* Loan Detail & Schedule (This Replaces the Excel Columns) */}
							{selectedMember.hasActiveLoan && selectedMember.loanData ? (
								<div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex-col flex">
									<div className="bg-slate-800 p-4 text-white flex justify-between items-center">
										<div>
											<h4 className="font-bold text-lg flex items-center gap-2">
												<CreditCard size={18} className="text-sky-400" /> สัญญาเลขที่ {selectedMember.loanData.id} ({selectedMember.loanData.type})
											</h4>
											<p className="text-slate-400 text-sm mt-1">วงเงินกู้: {selectedMember.loanData.totalAmount.toLocaleString()} ฿ • ระยะเวลา: {selectedMember.loanData.duration} งวด</p>
										</div>
										<div className="text-right">
											<p className="text-slate-400 text-sm">ชำระแล้ว</p>
											<p className="text-xl font-bold text-emerald-400">{selectedMember.loanData.paidAmount.toLocaleString()} ฿</p>
										</div>
									</div>

									{/* Schedule Table (Like the Monthly Columns in Excel) */}
									<div className="p-0 overflow-x-auto">
										<table className="w-full text-left text-sm">
											<thead>
												<tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
													<th className="py-3 px-4">งวดที่</th>
													<th className="py-3 px-4">ประจำเดือน</th>
													<th className="py-3 px-4 text-right">ยอดที่ต้องชำระ</th>
													<th className="py-3 px-4 text-center">สถานะ</th>
													<th className="py-3 px-4 text-center">วันที่รับชำระ</th>
												</tr>
											</thead>
											<tbody className="divide-y divide-slate-100">
												{selectedMember.loanData.schedule.map((st) => (
													<tr key={st.period} className="hover:bg-slate-50">
														<td className="py-3 px-4 font-bold text-slate-700"> {st.period} / {selectedMember.loanData?.duration}</td>
														<td className="py-3 px-4 font-medium text-slate-600">{st.month}</td>
														<td className="py-3 px-4 text-right tabular-nums text-slate-800">{st.amount.toLocaleString()}</td>
														<td className="py-3 px-4 text-center">
															{st.status === "paid" ? (
																<span className="inline-flex items-center justify-center min-w-[100px] gap-1 text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded">
																	<CheckCircle2 size={14} /> ชำระแล้ว
																</span>
															) : (
																<span className="inline-flex items-center justify-center min-w-[100px] gap-1 text-slate-400 font-medium">
																	รอดำเนินการ
																</span>
															)}
														</td>
														<td className="py-3 px-4 text-center text-slate-500">
															{st.payDate}
														</td>
													</tr>
												))}
											</tbody>
										</table>
									</div>
								</div>
							) : (
								<div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
									<div className="mx-auto w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-3">
										<CheckCircle2 className="text-emerald-400" size={32} />
									</div>
									<p className="text-slate-800 font-bold text-lg">ไม่มีหนี้ค้างชำระ</p>
									<p className="text-slate-500 text-sm">สมาชิกรายนี้ไม่มีสัญญากู้ยืม หรือชำระครบถ้วนแล้ว</p>
								</div>
							)}
						</div>

						<div className="p-4 border-t border-slate-100 bg-white">
							<button
								onClick={() => setSelectedMember(null)}
								className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
							>
								ย้อนกลับ
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
