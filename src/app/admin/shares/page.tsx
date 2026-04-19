"use client";

import { useEffect, useState, useMemo } from "react";
import { Search, Users, Banknote, UserPlus, FileClock, ArrowUpDown, ArrowUp, ArrowDown, ChevronRight } from "lucide-react";
import Link from "next/link";
import {
	BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, AreaChart, Area
} from "recharts";

type Member = {
	no: string;
	lineUserId: string;
	lineName: string;
	prefix: string;
	fullName: string;
	accountName: string;
	idCard: string;
	phone: string;
	accumulatedShares: number;
	status: string;
	pictureUrl: string;
};

type SortColumn = "no" | "fullName" | "accumulatedShares" | "status" | "phone";
type SortDirection = "asc" | "desc";

const API_URL = "/api/member";

const SortIcon = ({ column, sortConfig }: { column: SortColumn, sortConfig: { column: SortColumn, direction: SortDirection } }) => {
	if (sortConfig.column !== column) return <ArrowUpDown size={14} className="inline ml-1 text-slate-300" />;
	return sortConfig.direction === "asc" ?
		<ArrowUp size={14} className="inline ml-1 text-blue-500" /> :
		<ArrowDown size={14} className="inline ml-1 text-blue-500" />;
};

export default function SharesDashboard() {
	const [members, setMembers] = useState<Member[]>([]);
	const [pendingCount, setPendingCount] = useState(0);
	const [isLoading, setIsLoading] = useState(true);

	// Table state
	const [searchQuery, setSearchQuery] = useState("");
	const [sortConfig, setSortConfig] = useState<{ column: SortColumn, direction: SortDirection }>({
		column: "no",
		direction: "asc"
	});

	const fetchData = async () => {
		setIsLoading(true);
		try {
			// 1. ดึงข้อมูลสมาชิกทั้งหมด
			const memberRes = await fetch(API_URL, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ action: "admin_get_members" })
			});
			const memberData = await memberRes.json();

			if (memberData.success && Array.isArray(memberData.data)) {
				setMembers(memberData.data);
			}

			// 2. ดึงจำนวนที่รอตรวจสอบจาก Deposits
			const depositRes = await fetch(API_URL, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ action: "admin_get_deposits" })
			});
			const depositData = await depositRes.json();
			if (depositData.success && Array.isArray(depositData.data)) {
				const pending = depositData.data.filter((d: { status: string }) => d.status === "pending").length;
				setPendingCount(pending);
			}
		} catch (err) {
			console.error(err);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		fetchData();
	}, []);

	// --- STATISTICS CALCULATIONS ---
	const validMembers = useMemo(() => members.filter(m => m.status !== "ลาออก" && m.fullName), [members]);
	const totalShares = useMemo(() => validMembers.reduce((sum, m) => sum + (Number(m.accumulatedShares) || 0), 0), [validMembers]);
	const totalMembers = useMemo(() => validMembers.length, [validMembers]);
	const avgShares = useMemo(() => totalMembers > 0 ? Math.round(totalShares / totalMembers) : 0, [totalMembers, totalShares]);

	// Member status breakdown
	const statusBreakdown = useMemo(() => {
		const counts = { ปกติ: 0, ลาออก: 0 };
		members.forEach(m => {
			if (m.status === "ลาออก") counts.ลาออก++;
			else counts.ปกติ++;
		});
		return counts;
	}, [members]);

	// --- CHARTS DATA ---
	// 1. Top 5 Members
	const topMembersData = useMemo(() => {
		return [...validMembers]
			.sort((a, b) => (Number(b.accumulatedShares) || 0) - (Number(a.accumulatedShares) || 0))
			.slice(0, 5)
			.map(m => ({
				name: m.fullName.split(' ')[0], // เอาแค่ชื่อแรก
				shares: Number(m.accumulatedShares) || 0
			}));
	}, [validMembers]);

	// 2. Share Distribution (ช่วงเงินสะสม)
	const distributionData = useMemo(() => {
		const brackets = { "0-1K": 0, "1K-5K": 0, "5K-10K": 0, "10K-20K": 0, "20K+": 0 };
		validMembers.forEach(m => {
			const shares = Number(m.accumulatedShares) || 0;
			if (shares <= 1000) brackets["0-1K"]++;
			else if (shares <= 5000) brackets["1K-5K"]++;
			else if (shares <= 10000) brackets["5K-10K"]++;
			else if (shares <= 20000) brackets["10K-20K"]++;
			else brackets["20K+"]++;
		});
		return Object.entries(brackets).map(([name, count]) => ({ name, count }));
	}, [validMembers]);

	// 3. Monthly Trend (Mocked from current year months for UI demo or real if data expanded)
	const monthlyTrendData = [
		{ month: 'ม.ค.', amount: 45000 },
		{ month: 'ก.พ.', amount: 52000 },
		{ month: 'มี.ค.', amount: 48000 },
		{ month: 'เม.ย.', amount: 61000 },
		{ month: 'พ.ค.', amount: totalShares * 0.1 }, // Example link to real scale
	];

	// --- TABLE LOGIC ---
	const handleSort = (column: SortColumn) => {
		setSortConfig(prev => ({
			column,
			direction: prev.column === column && prev.direction === "asc" ? "desc" : "asc"
		}));
	};

	const filteredAndSortedMembers = useMemo(() => {
		const result = members.filter(m => {
			if (!m.fullName) return false;
			const searchStr = searchQuery.toLowerCase();
			return m.fullName.toLowerCase().includes(searchStr) ||
				m.no.toString().includes(searchStr) ||
				(m.phone || "").includes(searchStr);
		});

		result.sort((a, b) => {
			let valA: string | number = a[sortConfig.column];
			let valB: string | number = b[sortConfig.column];
			if (sortConfig.column === 'accumulatedShares' || sortConfig.column === 'no') {
				valA = Number(valA) || 0;
				valB = Number(valB) || 0;
			}
			if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
			if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
			return 0;
		});

		return result;
	}, [members, searchQuery, sortConfig]);

	if (isLoading) {
		return (
			<div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-400">
				<div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
				<p className="font-bold animate-pulse">กำลังประมวลผลข้อมูลหุ้นเชิงลึก...</p>
			</div>
		);
	}

	return (
		<div className="space-y-6 pb-20">

			{/* 1. HEADER */}
			<div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
				<div>
					<h1 className="text-3xl font-black text-slate-800 tracking-tight">ภาพรวมหุ้นสมาชิก</h1>
					<p className="text-slate-500 mt-1">วิเคราะห์ยอดหุ้นสะสมและทะเบียนอัปเดตล่าสุด</p>
				</div>
				{pendingCount > 0 && (
					<Link href="/admin/deposits" className="group flex items-center gap-3 bg-rose-50 hover:bg-rose-500 border border-rose-200 hover:border-transparent px-5 py-3 rounded-2xl transition-all shadow-sm">
						<div className="relative">
							<FileClock size={24} className="text-rose-500 group-hover:text-white" />
							<span className="absolute -top-1 -right-1 flex h-3 w-3">
								<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
								<span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500 group-hover:bg-white"></span>
							</span>
						</div>
						<div className="text-left">
							<p className="text-xs font-bold text-rose-500 group-hover:text-rose-100 uppercase tracking-wider">แจ้งเตือนระบบ</p>
							<p className="text-sm font-bold text-rose-700 group-hover:text-white">มี {pendingCount} รายการรอตรวจสอบ</p>
						</div>
						<ChevronRight size={18} className="text-rose-400 group-hover:text-white ml-2" />
					</Link>
				)}
			</div>

      {/* 2. STAT CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {/* Card 1: Total Shares */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 text-white shadow-lg shadow-blue-900/20 relative overflow-hidden xl:col-span-2">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Banknote size={100} />
          </div>
          <div className="relative z-10">
            <p className="text-blue-200 text-sm font-bold tracking-widest uppercase mb-1 flex items-center gap-2">
              <Banknote size={14} /> ยอดหุ้นรวมสุทธิ
            </p>
            <h2 className="text-4xl font-black tracking-tight">{totalShares.toLocaleString()} <span className="text-xl font-medium opacity-50">฿</span></h2>
          </div>
        </div>

        {/* Card 2: Total Members */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex items-center gap-5">
          <div className="bg-blue-50 p-4 rounded-2xl text-blue-500">
            <Users size={32} />
          </div>
          <div>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">สมาชิกปัจจุบัน</p>
            <h2 className="text-2xl font-black text-slate-700">{statusBreakdown.ปกติ} <span className="text-xs font-medium text-slate-400">คน</span></h2>
            <p className="text-[10px] text-rose-400 font-bold mt-1">ลาออก: {statusBreakdown.ลาออก}</p>
          </div>
        </div>

        {/* Card 3: Avg Shares */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex items-center gap-5">
          <div className="bg-emerald-50 p-4 rounded-2xl text-emerald-500">
            <ArrowUp size={32} />
          </div>
          <div>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">เฉลี่ยต่อคน</p>
            <h2 className="text-2xl font-black text-slate-700">{avgShares.toLocaleString()} <span className="text-xs font-medium text-slate-400">฿</span></h2>
          </div>
        </div>

        {/* Card 4: New Join (Fake/Stat) */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex items-center gap-5">
          <div className="bg-orange-50 p-4 rounded-2xl text-orange-500">
            <UserPlus size={32} />
          </div>
          <div>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">สมาชิกใหม่ (ปีนี้)</p>
            <h2 className="text-2xl font-black text-slate-700">+8 <span className="text-xs font-medium text-slate-400">คน</span></h2>
          </div>
        </div>
      </div>

      {/* 3. CHARTS GRID */}
      <div className="grid grid-cols-1 xl:grid-cols-6 gap-6">
        
        {/* Chart 1: Distribution (Span 3) */}
        <div className="xl:col-span-4 bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-800">แนวโน้มการฝากหุ้น 5 เดือนล่าสุด</h3>
            <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded font-black uppercase tracking-tighter">ยอดสุทธิรายเดือน</span>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrendData}>
                <defs>
                  <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <RechartsTooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: unknown) => [Number(value).toLocaleString() + ' ฿', 'เงินสะสม']}
                />
                <Area type="monotone" dataKey="amount" stroke="#8b5cf6" strokeWidth={4} fill="url(#colorTrend)" dot={{ r: 6, fill: '#8b5cf6', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8, strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Info Card: Highlights (Span 2) */}
        <div className="xl:col-span-2 space-y-4">
          <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm flex flex-col h-full">
            <h3 className="text-lg font-bold text-slate-800 mb-4">ไฮไลท์ยอดสะสม</h3>
            <div className="space-y-4 flex-1">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">สูงสุด (Max)</p>
                  <p className="font-bold text-slate-700">{topMembersData[0]?.name || '-'}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-amber-500">{topMembersData[0]?.shares.toLocaleString()} ฿</p>
                </div>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">ยอดนิยม (Median)</p>
                  <p className="font-bold text-slate-700">สมาชิกส่วนใหญ่</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-blue-500">1K - 5K</p>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-dashed border-slate-200">
               <p className="text-[10px] text-slate-400 text-center italic">อัปเดตข้อมูลล่าสุดเมื่อ: {new Date().toLocaleString('th-TH')}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Chart 1: Distribution (Span 3) */}
        <div className="xl:col-span-3 bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6">ความหนาแน่นของผู้ถือหุ้น (บาท)</h3>
					<div className="h-[300px] w-full">
						<ResponsiveContainer width="100%" height="100%">
							<AreaChart data={distributionData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
								<defs>
									<linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
										<stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
										<stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
									</linearGradient>
								</defs>
								<CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
								<XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} dy={10} />
								<YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
								<RechartsTooltip
									cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }}
									contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
								/>
								<Area type="monotone" dataKey="count" name="จำนวนคน" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorCount)" />
							</AreaChart>
						</ResponsiveContainer>
					</div>
				</div>

				{/* Chart 2: Top 5 (Span 2) */}
				<div className="xl:col-span-2 bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm">
					<h3 className="text-lg font-bold text-slate-800 mb-6">Top 5 ยอดสะสมสูงสุด</h3>
					<div className="h-[300px] w-full">
						<ResponsiveContainer width="100%" height="100%">
							<BarChart layout="vertical" data={topMembersData} margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
								<CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
								<XAxis type="number" hide />
								<YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 'bold' }} width={80} />
								<RechartsTooltip
									cursor={{ fill: '#f8fafc' }}
									contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
									formatter={(value: unknown) => [Number(value).toLocaleString() + ' ฿', 'เงินสะสม']}
								/>
								<Bar dataKey="shares" radius={[0, 8, 8, 0]} barSize={32}>
									{topMembersData.map((entry, index) => (
										<Cell key={`cell-${index}`} fill={index === 0 ? '#fbbf24' : index === 1 ? '#cbd5e1' : index === 2 ? '#d97706' : '#94a3b8'} />
									))}
								</Bar>
							</BarChart>
						</ResponsiveContainer>
					</div>
				</div>
			</div>

			{/* 4. ROSTER TABLE */}
			<div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden">
				<div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50/50">
					<div>
						<h3 className="text-lg font-bold text-slate-800">ทะเบียนจัดเก็บข้อมูลสมาชิก</h3>
						<p className="text-sm text-slate-500">ข้อมูลทั้งหมดดึงมาจากแบบเรียลไทม์จากระบบปฏิบัติการหลัก</p>
					</div>
					<div className="relative w-full sm:w-72">
						<Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
						<input
							type="text"
							placeholder="ค้นหาชื่อ, รหัส, เบอร์โทร..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-sm bg-white"
						/>
					</div>
				</div>

				<div className="overflow-x-auto">
					<table className="w-full text-left border-collapse">
						<thead>
							<tr className="bg-white border-b border-slate-200 cursor-pointer">
								<th onClick={() => handleSort('no')} className="py-4 px-6 font-semibold text-slate-500 text-xs uppercase tracking-wider whitespace-nowrap hover:bg-slate-50">
									รหัส <SortIcon column="no" sortConfig={sortConfig} />
								</th>
								<th onClick={() => handleSort('fullName')} className="py-4 px-6 font-semibold text-slate-500 text-xs uppercase tracking-wider hover:bg-slate-50">
									รายชื่อสมาชิก <SortIcon column="fullName" sortConfig={sortConfig} />
								</th>
								<th onClick={() => handleSort('phone')} className="py-4 px-6 font-semibold text-slate-500 text-xs uppercase tracking-wider hover:bg-slate-50">
									เบอร์โทร <SortIcon column="phone" sortConfig={sortConfig} />
								</th>
								<th onClick={() => handleSort('accumulatedShares')} className="py-4 px-6 font-semibold text-slate-500 text-xs uppercase tracking-wider text-right hover:bg-slate-50">
									ยอดสะสมรวม (฿) <SortIcon column="accumulatedShares" sortConfig={sortConfig} />
								</th>
								<th onClick={() => handleSort('status')} className="py-4 px-6 font-semibold text-slate-500 text-xs uppercase tracking-wider text-center hover:bg-slate-50">
									สถานะ <SortIcon column="status" sortConfig={sortConfig} />
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-100">
							{filteredAndSortedMembers.length === 0 ? (
								<tr>
									<td colSpan={5} className="py-16 text-center text-slate-400">
										<Users size={48} className="mx-auto mb-4 opacity-20" />
										<p className="font-semibold text-lg">ไม่พบข้อมูลที่ค้นหา</p>
									</td>
								</tr>
							) : (
								filteredAndSortedMembers.map((member, i) => (
									<tr key={i} className="hover:bg-slate-50/80 transition-colors group">
										<td className="py-4 px-6 text-slate-500 font-medium">{member.no}</td>
										<td className="py-4 px-6">
											<div className="flex items-center gap-3">
												<div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white shadow-sm overflow-hidden flex-shrink-0">
													{member.pictureUrl ? (
														/* eslint-disable-next-line @next/next/no-img-element */
														<img src={member.pictureUrl} alt="profile" className="w-full h-full object-cover" />
													) : (
														<div className="w-full h-full flex items-center justify-center text-slate-400 bg-slate-100">
															<Users size={16} />
														</div>
													)}
												</div>
												<div>
													<p className="font-bold text-slate-800">{member.prefix}{member.fullName}</p>
													{member.lineName && <p className="text-[10px] text-blue-500 font-semibold truncate max-w-[120px]">LINE: {member.lineName}</p>}
												</div>
											</div>
										</td>
										<td className="py-4 px-6 text-slate-500 text-sm font-medium">{member.phone || '-'}</td>
										<td className="py-4 px-6 text-right">
											<span className="font-black text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100/50">
												{Number(member.accumulatedShares || 0).toLocaleString()} ฿
											</span>
										</td>
										<td className="py-4 px-6 text-center">
											<span className={`inline-flex px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-widest whitespace-nowrap ${member.status === "ปกติ"
												? "bg-emerald-100 text-emerald-700"
												: "bg-rose-100 text-rose-700"
												}`}>
												{member.status || "ปกติ"}
											</span>
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</div>

		</div>
	);
}
