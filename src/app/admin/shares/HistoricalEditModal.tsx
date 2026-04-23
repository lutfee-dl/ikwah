"use client";

import { X, TrendingUp, RefreshCw, ShieldCheck } from "lucide-react";
import { ShareRow, HistoricalForm } from "./page";
import { NumericFormat } from "react-number-format";

interface HistoricalEditModalProps {
  member: ShareRow;
  histForm: HistoricalForm;
  saving: boolean;
  onSave: () => void;
  onFormChange: (form: HistoricalForm) => void;
  onClose: () => void;
}

export default function HistoricalEditModal({
  member,
  histForm,
  saving,
  onSave,
  onFormChange,
  onClose
}: HistoricalEditModalProps) {
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        <div className="bg-blue-800 px-7 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3 text-white">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"><TrendingUp size={20} /></div>
            <div>
              <h2 className="font-black">แก้ไขยอดยกมา</h2>
              <p className="text-xs text-white font-bold uppercase">Manual Adjustments</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-black/10 text-white transition-all"><X size={18} /></button>
        </div>

        <div className="p-7 space-y-5">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center gap-3">
            <div>
              <p className="font-black text-slate-800 text-sm">{member.ชื่อ}</p>
              <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest">รหัสสมาชิก : {member.ID_No}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 max-h-[40vh] overflow-y-auto pr-2">
            {Object.keys(histForm).sort().map(year => (
              <div key={year} className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">ปี {year}</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">฿</span>
                  <NumericFormat
                    value={histForm[year]}
                    onValueChange={(values) => {
                      onFormChange({ ...histForm, [year]: values.floatValue || 0 });
                    }}
                    thousandSeparator=","
                    decimalScale={2}
                    fixedDecimalScale
                    allowNegative={false}
                    className="w-full pl-7 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm font-black text-slate-700 bg-slate-50 focus:ring-4 focus:ring-amber-100 focus:border-amber-400 transition-all outline-none"
                    placeholder="0.00"
                  />
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={onSave}
            disabled={saving}
            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:bg-slate-800 transition-all disabled:opacity-50 shadow-xl shadow-slate-200"
          >
            {saving ? <RefreshCw size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
            บันทึกการเปลี่ยนแปลง
          </button>
        </div>
      </div>
    </div>
  );
}
