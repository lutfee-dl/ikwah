import { Member } from "@/types";
import { X, Wallet, TrendingUp, History, UserCircle, Activity } from "lucide-react";
import Image from "next/image";

interface MemberDetailModalProps {
  member: Member;
  onClose: () => void;
}

export default function MemberDetailModal({
  member,
  onClose,
}: MemberDetailModalProps) {
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
                  ประวัติการนำส่งหุ้น/สัจจะรายเดือน
                </h4>
                <p className="text-slate-400 text-sm mt-1">
                  แสดงรายการฝากหุ้นล่าสุดของสมาชิก
                </p>
              </div>
            </div>

            <div className="p-0 overflow-x-auto text-center py-12">
              <div className="flex flex-col items-center justify-center text-slate-400 gap-3">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-2">
                  <History size={32} className="text-slate-300" />
                </div>
                <p className="font-medium text-slate-600">
                  ยังไม่มีข้อมูลประวัติการฝากหุ้นแสดงในส่วนนี้
                </p>
              </div>
            </div>
          </div>
        </div>

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
