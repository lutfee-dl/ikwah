import { Member } from "@/types";
import { X, Wallet, TrendingUp, History, UserCircle, Activity, Clock, CheckCircle2, Eye, CalendarDays, Loader2 } from "lucide-react";
import Image from "next/image";
import { useState, useEffect } from "react";
import { formatDateTime } from "@/lib/utils";
import toast from "react-hot-toast";

interface Transaction {
  type: "deposit" | "repayment";
  typeName: string;
  id: string;
  contractId?: string;
  date: string;
  amount: number;
  status: string;
  itemName?: string;
  slipUrl?: string;
  note?: string;
}

interface MemberDetailModalProps {
  member: Member;
  onClose: () => void;
}

export default function MemberDetailModal({
  member,
  onClose,
}: MemberDetailModalProps) {
  const [history, setHistory] = useState<Transaction[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [selectedSlip, setSelectedSlip] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!member.lineId) return;
      setIsLoadingHistory(true);
      try {
        const res = await fetch("/api/member", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "admin_get_member_history",
            ADMIN_SECRET: process.env.NEXT_PUBLIC_ADMIN_SECRET,
            targetUserId: member.lineId
          })
        });
        const data = await res.json();
        if (data.success) {
          setHistory(data.data || []);
        } else {
          toast.error(data.msg || "ดึงประวัติไม่สำเร็จ");
        }
      } catch (err) {
        console.error(err);
        toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อ");
      } finally {
        setIsLoadingHistory(false);
      }
    };

    fetchHistory();
  }, [member.lineId]);

  const getStatusStyle = (status: string) => {
    if (status === "อนุมัติแล้ว" || status === "ยืนยันแล้ว") return "bg-emerald-50 text-emerald-600 border-emerald-100";
    if (status === "ปฏิเสธ" || status === "ไม่ผ่าน") return "bg-rose-50 text-rose-600 border-rose-100";
    return "bg-slate-100 text-slate-500 border-slate-200";
  };

  const getDriveImageUrl = (url: string) => {
    if (!url) return "";
    const matches = url.match(/[-\w]{25,}/g);
    const fileId = matches ? matches.find(m => !['drive', 'google', 'file', 'view'].includes(m.toLowerCase())) : null;
    return fileId ? `https://docs.google.com/thumbnail?id=${fileId}&sz=w1200` : url;
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in">
        {/* Modal Header */}
        <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-3">
            {member.pictureUrl ? (
              <Image
                src={member.pictureUrl}
                alt={member.lineName}
                width={48}
                height={48}
                className="w-12 h-12 rounded-full border-2 border-white shadow-sm object-cover"
              />
            ) : (
              <UserCircle size={48} className="text-sky-600" />
            )}
            <div>
              <h3 className="font-bold text-lg text-slate-800">
                {member.prefix}
                {member.fullName}
              </h3>

              <div className="text-sm font-normal text-slate-500 mt-1 flex items-center gap-2">
                <span className="font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-lg border border-sky-100">ID: {member.memberId || "IKW-"}</span>
                <span>• LINE: {member.lineName} • บัตร: {member.idCard || "-"}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="cursor-pointer text-slate-400 hover:bg-slate-200 p-2 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-6 overflow-y-auto bg-slate-50 flex-1">
          {/* Financial Summaries */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-sky-50 rounded-full -mr-8 -mt-8 opacity-50"></div>
              <div className="w-12 h-12 rounded-full bg-sky-50 flex items-center justify-center text-sky-500 z-10">
                <Wallet size={24} />
              </div>
              <div className="z-10">
                <p className="text-sm font-medium text-slate-500 mb-1">
                  ยอดหุ้น/เงินอาสัจจะสะสมรวม
                </p>
                <p className="text-3xl font-bold text-slate-800">
                  {member.accumulatedShares
                    ? member.accumulatedShares.toLocaleString()
                    : "0"}{" "}
                  <span className="text-lg text-slate-400 font-medium">฿</span>
                </p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-rose-50 rounded-full -mr-8 -mt-8 opacity-50"></div>
              <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 z-10">
                <Activity size={24} />
              </div>
              <div className="z-10">
                <p className="text-sm font-medium text-slate-500 mb-1">
                  ยอดหนี้สินคงเหลือรวม
                </p>
                <p className="text-3xl font-bold text-rose-600">
                  {(member.totalLoanDebt || 0).toLocaleString()} <span className="text-lg text-slate-400 font-medium">฿</span>
                </p>
              </div>
            </div>
          </div>

          {/* Share Deposit History */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex-col flex">
            <div className="bg-slate-800 p-4 text-white flex justify-between items-center">
              <div>
                <h4 className="font-bold text-lg flex items-center gap-2">
                  <History size={18} className="text-sky-400" />{" "}
                  ประวัติการทำรายการ
                </h4>
                <p className="text-slate-400 text-sm mt-1">
                  แสดงรายการทำรายการล่าสุดของสมาชิก
                </p>
              </div>
            </div>

            <div className="p-0 overflow-x-auto">
              {isLoadingHistory ? (
                <div className="py-20 text-center">
                  <Loader2 size={32} className="animate-spin mx-auto text-slate-300 mb-2" />
                  <p className="text-slate-400 text-sm">กำลังโหลดข้อมูล...</p>
                </div>
              ) : history.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="flex flex-col items-center justify-center text-slate-400 gap-3">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-2">
                      <History size={32} className="text-slate-300" />
                    </div>
                    <p className="font-medium text-slate-600">
                      ยังไม่มีข้อมูลประวัติการทำรายการในส่วนนี้
                    </p>
                  </div>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="py-3 px-4 font-bold text-slate-500 text-[11px] uppercase tracking-wider">ประเภท / รายการ</th>
                      <th className="py-3 px-4 font-bold text-slate-500 text-[11px] uppercase tracking-wider text-right">จำนวนเงิน (฿)</th>
                      <th className="py-3 px-4 font-bold text-slate-500 text-[11px] uppercase tracking-wider text-center">วันที่ทำรายการ</th>
                      <th className="py-3 px-4 font-bold text-slate-500 text-[11px] uppercase tracking-wider text-center">สถานะ</th>
                      <th className="py-3 px-4 font-bold text-slate-500 text-[11px] uppercase tracking-wider text-center">หลักฐาน</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {history.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col">
                            <span className={`text-[12px] font-bold ${item.type === "deposit" ? "text-emerald-600" : "text-blue-600"}`}>
                              {item.type === "deposit" ? "ฝากหุ้น" : "ชำระสินเชื่อ"}
                            </span>
                            <span className="text-[11px] text-slate-500 truncate max-w-[150px]">
                              {item.type === "repayment" ? (item.itemName || "ชำระสินเชื่อ") : (item.typeName || "ฝากหุ้นสะสม")}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <span className={`font-black text-[14px] ${item.type === "deposit" ? "text-emerald-600" : "text-blue-700"}`}>
                            {item.amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="text-[11px] text-slate-600 font-medium">{formatDateTime(item.date).split(' ')[0]}</span>
                            <span className="text-[10px] text-slate-400">{formatDateTime(item.date).split(' ')[1]}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${getStatusStyle(item.status)}`}>
                            {item.status === "อนุมัติแล้ว" || item.status === "ยืนยันแล้ว" ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                            {item.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {item.slipUrl ? (
                            <button
                              onClick={() => setSelectedSlip(item.slipUrl!)}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 hover:underline"
                            >
                              <Eye size={12} /> ดูสลิป
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-300">ไม่มี</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Slip Zoom Modal */}
        {selectedSlip && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/90 backdrop-blur-md p-4 animate-in fade-in duration-200"
            onClick={() => setSelectedSlip(null)}
          >
            <div className="relative bg-white p-2 rounded-2xl shadow-2xl max-w-sm w-full animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
              <button
                onClick={() => setSelectedSlip(null)}
                className="absolute -top-3 -right-3 bg-white text-slate-900 w-8 h-8 rounded-full shadow-lg flex items-center justify-center z-10"
              >
                <X size={18} />
              </button>
              <div className="overflow-hidden rounded-xl bg-slate-50 border border-slate-100">
                <Image
                  src={getDriveImageUrl(selectedSlip)}
                  alt="slip"
                  width={400}
                  height={600}
                  className="w-full h-auto object-contain max-h-[75vh]"
                  unoptimized
                />
              </div>
            </div>
          </div>
        )}

        <div className="p-4 border-t border-slate-100 bg-white">
          <button
            onClick={onClose}
            className="cursor-pointer w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
}
