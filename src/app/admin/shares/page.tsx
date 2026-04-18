"use client";

import { useState } from "react";
import { Search, Filter, Download, ArrowUpCircle, ArrowDownCircle, SearchCode } from "lucide-react";

const mockShares = [
	{
		id: "SH001",
		lineName: "Sudteeruk",
		fullName: "นายสุดที่รัก พิทักษ์ไทย",
		idCard: "1102003004005",
		accumulatedRaw: 15000,
		status: "ปกติ",
		thisYear: 3000, // สมมุติรวมคร่าวๆ
		monthly: {
			"ม.ค.": 1000,
			"ก.พ.": 1000,
			"มี.ค.": 1000,
			"เม.ย.": 0,
			"พ.ค.": 0,
		},
		yearly: {
			"2565": 5000,
			"2566": 7000,
			"2567": 3000,
		}
	},
	{
		id: "SH002",
		lineName: "Anucha.R",
		fullName: "นายอนุชา รักสงบ",
		idCard: "1102003004006",
		accumulatedRaw: 8000,
		status: "ปกติ",
		thisYear: 2000,
		monthly: {
			"ม.ค.": 1000,
			"ก.พ.": 0,
			"มี.ค.": 1000,
			"เม.ย.": 0,
			"พ.ค.": 0,
		},
		yearly: {
			"2565": 2000,
			"2566": 4000,
			"2567": 2000,
		}
	},
	{
		id: "SH003",
		lineName: "Somchai DD",
		fullName: "นายสมชาย ใจดี",
		idCard: "1102003004007",
		accumulatedRaw: 25000,
		status: "พ้นสภาพ",
		thisYear: 0,
		monthly: {
			"ม.ค.": 0,
			"ก.พ.": 0,
			"มี.ค.": 0,
			"เม.ย.": 0,
			"พ.ค.": 0,
		},
		yearly: {
			"2565": 10000,
			"2566": 15000,
			"2567": 0,
		}
	}
];

export default function SharesPage() {
	const [shares] = useState(mockShares);
	const [searchQuery, setSearchQuery] = useState("");
	const [periodFilter, setPeriodFilter] = useState("all"); // 'all', 'year', 'month'

	const filteredShares = shares.filter(
		s => s.fullName.includes(searchQuery) || s.lineName.includes(searchQuery)
	);

	// คำนวณสรุปรวม (Summary Cards)
	const totalAccumulated = filteredShares.reduce((acc, curr) => acc + curr.accumulatedRaw, 0);
	const totalThisYear = filteredShares.reduce((acc, curr) => acc + curr.thisYear, 0);

	return (
		<div className="space-y-6 relative">
			{/* Header */}
			<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
				<div>
					<h1 className="text-2xl font-bold text-slate-800">สรุปยอดหุ้นสัจจะสะสม</h1>
					<p className="text-slate-500 text-sm mt-1">
						ตารางสรุปเงินสะสมรายคน (แทนตาราง Excel แนวนอน) รวมยอดประจำปีและรายเดือน
					</p>
				</div>
				<div className="flex gap-3 w-full md:w-auto">
					<div className="relative flex-1 md:w-64">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
						<input
							type="text"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder="ค้นหาชื่อสมาชิก..."
							className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
						/>
					</div>
					<button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white transition-colors text-sm font-semibold">
						<Download size={18} />
						<span className="hidden sm:inline">Export Excel</span>
					</button>
				</div>
			</div>

			{/* Macro Overview Cards */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				<div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
					<div className="flex items-center gap-3 mb-2">
						<div className="w-10 h-10 rounded-full bg-sky-50 flex items-center justify-center text-sky-600">
							<ArrowUpCircle size={20} />
						</div>
						<h3 className="font-semibold text-slate-700">ทุนเรือนหุ้นสะสมรวม (ทั้งหมด)</h3>
					</div>
					<p className="text-4xl font-bold text-slate-800 pl-12">{totalAccumulated.toLocaleString()}<span className="text-lg text-slate-500 ml-1">฿</span></p>
				</div>
				<div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
					<div className="flex items-center gap-3 mb-2">
						<div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
							<ArrowUpCircle size={20} />
						</div>
						<h3 className="font-semibold text-slate-700">ส่งสัจจะสะสม (เฉพาะปี 2567)</h3>
					</div>
					<p className="text-4xl font-bold text-slate-800 pl-12">{totalThisYear.toLocaleString()}<span className="text-lg text-slate-500 ml-1">฿</span></p>
				</div>
				<div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-sm relative overflow-hidden">
					<SearchCode size={120} className="absolute -right-6 -bottom-6 text-slate-700 opacity-50" />
					<h3 className="font-semibold text-white/80 mb-2 relative z-10">โหมดการดูข้อมูล</h3>
					<div className="flex gap-2 relative z-10">
						<select 
							className="px-3 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg text-sm w-full outline-none focus:border-sky-400"
							value={periodFilter}
							onChange={(e) => setPeriodFilter(e.target.value)}
						>
							<option value="all">ดูยอดสะสมรวม (ตลอดชีพ)</option>
							<option value="year">แยกดูรายปี (65/66/67)</option>
							<option value="month">แยกดูรายเดือน (ปีปัจจุบัน)</option>
						</select>
					</div>
				</div>
			</div>

			{/* The "Excel-killer" Table */}
			<div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
				<div className="overflow-x-auto">
					<table className="w-full text-left border-collapse min-w-[800px]">
						<thead>
							<tr className="bg-slate-50/80 border-b border-slate-200">
								<th className="py-4 px-6 font-semibold text-slate-600 text-sm">ผู้ใช้งาน</th>
								<th className="py-4 px-6 font-semibold text-slate-600 text-sm text-center">สถานะ</th>
								<th className="py-4 px-6 font-semibold text-sky-700 text-sm text-right bg-sky-50/50">รวมเงินคงเหลือ</th>
								
								{/* Dynamic Columns based on Filter */}
								{periodFilter === 'year' && (
									<>
										<th className="py-4 px-6 font-semibold text-slate-500 text-sm text-right">ปี 65</th>
										<th className="py-4 px-6 font-semibold text-slate-500 text-sm text-right">ปี 66</th>
										<th className="py-4 px-6 font-semibold text-slate-500 text-sm text-right bg-slate-50">ปี 67</th>
									</>
								)}
								
								{periodFilter === 'month' && (
									<>
										<th className="py-4 px-6 font-semibold text-slate-500 text-sm text-right">ม.ค. 67</th>
										<th className="py-4 px-6 font-semibold text-slate-500 text-sm text-right">ก.พ. 67</th>
										<th className="py-4 px-6 font-semibold text-slate-500 text-sm text-right">มี.ค. 67</th>
										<th className="py-4 px-6 font-semibold text-slate-500 text-sm text-right">เม.ย. 67</th>
									</>
								)}
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-100">
							{filteredShares.map((s) => (
								<tr key={s.id} className="hover:bg-slate-50 transition-colors">
									<td className="py-4 px-6">
										<p className="font-semibold text-slate-800">{s.fullName}</p>
										<p className="text-xs text-slate-500">{s.lineName}</p>
									</td>
									<td className="py-4 px-6 text-center">
										<span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${
											s.status === "ปกติ" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
										}`}>
											{s.status}
										</span>
									</td>
									<td className="py-4 px-6 text-right font-bold text-sky-600 bg-sky-50/20">
										{s.accumulatedRaw.toLocaleString()}
									</td>
									
									{/* Dynamic Columns based on Filter */}
									{periodFilter === 'year' && (
										<>
											<td className="py-4 px-6 text-right text-slate-600">{s.yearly["2565"].toLocaleString()}</td>
											<td className="py-4 px-6 text-right text-slate-600">{s.yearly["2566"].toLocaleString()}</td>
											<td className="py-4 px-6 text-right text-slate-800 font-semibold bg-slate-50/50">{s.yearly["2567"].toLocaleString()}</td>
										</>
									)}
									
									{periodFilter === 'month' && (
										<>
											<td className={`py-4 px-6 text-right ${s.monthly["ม.ค."] > 0 ? "text-slate-700" : "text-slate-300"}`}>{s.monthly["ม.ค."].toLocaleString()}</td>
											<td className={`py-4 px-6 text-right ${s.monthly["ก.พ."] > 0 ? "text-slate-700" : "text-slate-300"}`}>{s.monthly["ก.พ."].toLocaleString()}</td>
											<td className={`py-4 px-6 text-right ${s.monthly["มี.ค."] > 0 ? "text-slate-700" : "text-slate-300"}`}>{s.monthly["มี.ค."].toLocaleString()}</td>
											<td className={`py-4 px-6 text-right ${s.monthly["เม.ย."] > 0 ? "text-slate-700" : "text-slate-300"}`}>{s.monthly["เม.ย."].toLocaleString()}</td>
										</>
									)}
								</tr>
							))}
						</tbody>
						{/* Table Footer / Summations */}
						<tfoot className="bg-slate-100 border-t-2 border-slate-200">
							<tr>
								<td colSpan={2} className="py-4 px-6 text-right font-bold text-slate-700">ยอดรวมทั้งหมด:</td>
								<td className="py-4 px-6 text-right font-bold text-sky-700">{totalAccumulated.toLocaleString()}</td>
								
								{periodFilter === 'year' && (
									<>
										<td className="py-4 px-6 text-right font-bold text-slate-700">{filteredShares.reduce((a,c) => a + c.yearly["2565"], 0).toLocaleString()}</td>
										<td className="py-4 px-6 text-right font-bold text-slate-700">{filteredShares.reduce((a,c) => a + c.yearly["2566"], 0).toLocaleString()}</td>
										<td className="py-4 px-6 text-right font-bold text-slate-800">{filteredShares.reduce((a,c) => a + c.yearly["2567"], 0).toLocaleString()}</td>
									</>
								)}
								{periodFilter === 'month' && (
									<>
										<td className="py-4 px-6 text-right font-bold text-slate-700">{filteredShares.reduce((a,c) => a + c.monthly["ม.ค."], 0).toLocaleString()}</td>
										<td className="py-4 px-6 text-right font-bold text-slate-700">{filteredShares.reduce((a,c) => a + c.monthly["ก.พ."], 0).toLocaleString()}</td>
										<td className="py-4 px-6 text-right font-bold text-slate-700">{filteredShares.reduce((a,c) => a + c.monthly["มี.ค."], 0).toLocaleString()}</td>
										<td className="py-4 px-6 text-right font-bold text-slate-700">{filteredShares.reduce((a,c) => a + c.monthly["เม.ย."], 0).toLocaleString()}</td>
									</>
								)}
							</tr>
						</tfoot>
					</table>
				</div>
			</div>
		</div>
	);
}
