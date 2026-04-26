"use client";

import { useState, useEffect } from "react";
import {
  Settings as SettingsIcon,
  Save,
  Database,
  Download,
  FolderOpen,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  FileSpreadsheet,
  Users,
  PieChart,
  HardDrive
} from "lucide-react";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import { gasApi } from "@/services/gasApi";

type SystemSettings = {
  fundName: string;
  rootFolderId: string;
  adminSecret: string;
  memberBotToken: string;
  adminGroupId: string;
  spreadsheetUrl: string;
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [newFolderId, setNewFolderId] = useState("");

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await gasApi.call("admin_get_settings", {});
      if (res.success && res.settings) {
        setSettings(resultToSettings(res.settings));
        setNewFolderId(res.settings.rootFolderId || "");
      } else {
        toast.error(res.msg || "ไม่สามารถดึงข้อมูลการตั้งค่าได้");
      }
    } catch (err: any) {
      console.error("Fetch Settings Error:", err);
      toast.error("การเชื่อมต่อล้มเหลว: " + (err.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const resultToSettings = (data: any): SystemSettings => ({
    fundName: data.fundName,
    rootFolderId: data.rootFolderId,
    adminSecret: data.adminSecret,
    memberBotToken: data.memberBotToken,
    adminGroupId: data.adminGroupId,
    spreadsheetUrl: data.spreadsheetUrl
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleUpdateFolderId = async () => {
    if (!newFolderId) return toast.error("กรุณาระบุ Folder ID");

    setSaving(true);
    try {
      const res = await gasApi.call("admin_update_settings", { rootFolderId: newFolderId });
      if (res.success) {
        toast.success("อัปเดต Folder ID สำเร็จ");
        fetchSettings();
      } else {
        toast.error(res.msg || "เกิดข้อผิดพลาด");
      }
    } catch (err) {
      toast.error("การเชื่อมต่อล้มเหลว");
    } finally {
      setSaving(false);
    }
  };

  const handleManualBackup = async () => {
    const confirm = await Swal.fire({
      title: 'ยืนยันการสำรองข้อมูล?',
      text: "ระบบจะสร้างไฟล์สำเนาลงในโฟลเดอร์ Backups ของคุณทันที",
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'เริ่มสำรองข้อมูล',
      cancelButtonText: 'ยกเลิก'
    });

    if (!confirm.isConfirmed) return;

    setBackingUp(true);
    try {
      const res = await gasApi.call("admin_manual_backup", {});
      if (res.success) {
        Swal.fire("สำเร็จ", res.msg, "success");
      } else {
        toast.error(res.msg || "เกิดข้อผิดพลาด");
      }
    } catch (err) {
      toast.error("การเชื่อมต่อล้มเหลว");
    } finally {
      setBackingUp(false);
    }
  };

  const exportToCSV = async (type: "members" | "shares" | "repayments") => {
    toast.loading("กำลังเตรียมข้อมูล...", { id: "export" });
    try {
      let action = "";
      let fileName = "";
      if (type === "members") { action = "admin_get_members"; fileName = "IKWAH_Members.csv"; }
      else if (type === "shares") { action = "admin_get_shares_report"; fileName = "IKWAH_Shares_Report.csv"; }
      else if (type === "repayments") { action = "admin_get_repayment_slips"; fileName = "IKWAH_Repayments.csv"; }

      const res = await gasApi.call(action, type === "shares" ? { options: { viewMode: 'both' } } : {});
      if (res.success && res.data) {
        const csvContent = convertToCSV(res.data);
        downloadFile(csvContent, fileName);
        toast.success("ดาวน์โหลดสำเร็จ", { id: "export" });
      }
    } catch (err) {
      toast.error("Export ล้มเหลว", { id: "export" });
    }
  };

  const convertToCSV = (data: any[]) => {
    if (data.length === 0) return "";
    const headers = Object.keys(data[0]).join(",");
    const rows = data.map(obj => {
      return Object.values(obj).map(val => {
        let str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      }).join(",");
    });
    return "\uFEFF" + [headers, ...rows].join("\n"); // Add BOM for Excel Thai support
  };

  const downloadFile = (content: string, fileName: string) => {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <RefreshCw size={40} className="text-indigo-500 animate-spin" />
        <p className="text-slate-500 font-medium animate-pulse">กำลังดึงข้อมูลการตั้งค่า...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="flex items-center gap-4">
        <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-lg shadow-indigo-100">
          <SettingsIcon size={24} />
        </div>
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">ตั้งค่าระบบ</h1>
          <p className="text-slate-500 text-sm">จัดการข้อมูลพื้นฐานและการส่งออกข้อมูลของกองทุน</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. Drive Folder ID Card */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col group">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-blue-50 p-2.5 rounded-xl text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <FolderOpen size={20} />
            </div>
            <h2 className="font-bold text-slate-800">โฟลเดอร์หลักบน Google Drive</h2>
          </div>

          <div className="space-y-4 flex-1">
            <p className="text-xs text-slate-500 leading-relaxed">
              ID ของโฟลเดอร์หลักที่ใช้เก็บสลิปและไฟล์ Backup ของระบบ <br />
              <span className="text-rose-500 font-bold">* โปรดระมัดระวังในการแก้ไข</span>
            </p>
            <input
              type="text"
              value={newFolderId}
              onChange={(e) => setNewFolderId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono text-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              placeholder="Enter Folder ID..."
            />
          </div>

          <button
            onClick={handleUpdateFolderId}
            disabled={saving || newFolderId === settings?.rootFolderId}
            className="mt-6 w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold text-sm shadow-md shadow-indigo-100 transition-all disabled:opacity-50 disabled:grayscale"
          >
            {saving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
            บันทึกการเปลี่ยนแปลง
          </button>
        </div>

        {/* 2. Manual Backup Card */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col group">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-emerald-50 p-2.5 rounded-xl text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <Database size={20} />
            </div>
            <h2 className="font-bold text-slate-800">ความปลอดภัยของข้อมูล</h2>
          </div>

          <div className="space-y-4 flex-1">
            <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
              <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs mb-1">
                <ShieldCheck size={14} /> ระบบสำรองข้อมูลอัตโนมัติ
              </div>
              <p className="text-[11px] text-emerald-600/80 font-medium">
                ระบบถูกตั้งค่าให้สำรองข้อมูลลง Google Drive ทุกวันในช่วงเวลาตี 2 และจะเก็บไฟล์ย้อนหลังไว้ 30 วัน
              </p>
            </div>
            <p className="text-xs text-slate-500 italic">
              คุณสามารถกดสำรองข้อมูลทันทีได้หากต้องการแก้ไขข้อมูลจำนวนมาก
            </p>
          </div>

          <button
            onClick={handleManualBackup}
            disabled={backingUp}
            className="mt-6 w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-black text-white py-3 rounded-xl font-bold text-sm shadow-md transition-all disabled:opacity-50"
          >
            {backingUp ? <RefreshCw size={18} className="animate-spin" /> : <HardDrive size={18} />}
            สำรองข้อมูลเดี๋ยวนี้ (Manual Backup)
          </button>
        </div>
      </div>

      {/* 3. Export Center */}
      <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Download size={120} />
        </div>

        <div className="flex items-center gap-3 mb-8">
          <div className="bg-amber-50 p-2.5 rounded-xl text-amber-600">
            <FileSpreadsheet size={24} />
          </div>
          <div>
            <h2 className="font-bold text-xl text-slate-800">ศูนย์ส่งออกข้อมูล (Export Center)</h2>
            <p className="text-slate-400 text-sm">ดาวน์โหลดข้อมูลจากระบบเป็นไฟล์ Excel (.csv)</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            onClick={() => exportToCSV("members")}
            className="flex flex-col items-center gap-4 p-6 rounded-3xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-50 transition-all group"
          >
            <div className="bg-white p-4 rounded-2xl text-indigo-500 group-hover:scale-110 transition-transform shadow-sm">
              <Users size={32} />
            </div>
            <div className="text-center">
              <p className="font-bold text-slate-700">รายชื่อสมาชิก</p>
              <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mt-1">Export to CSV</p>
            </div>
          </button>

          <button
            onClick={() => exportToCSV("shares")}
            className="flex flex-col items-center gap-4 p-6 rounded-3xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-50 transition-all group"
          >
            <div className="bg-white p-4 rounded-2xl text-emerald-500 group-hover:scale-110 transition-transform shadow-sm">
              <PieChart size={32} />
            </div>
            <div className="text-center">
              <p className="font-bold text-slate-700">รายงานหุ้นสะสม</p>
              <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mt-1">Export to CSV</p>
            </div>
          </button>

          <button
            onClick={() => exportToCSV("repayments")}
            className="flex flex-col items-center gap-4 p-6 rounded-3xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-amber-200 hover:shadow-xl hover:shadow-amber-50 transition-all group"
          >
            <div className="bg-white p-4 rounded-2xl text-amber-500 group-hover:scale-110 transition-transform shadow-sm">
              <FileSpreadsheet size={32} />
            </div>
            <div className="text-center">
              <p className="font-bold text-slate-700">ประวัติรับชำระสินเชื่อ</p>
              <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mt-1">Export to CSV</p>
            </div>
          </button>
        </div>
      </div>

      {/* 4. System Info */}
      <div className="bg-slate-50 rounded-3xl p-6 border border-slate-200/50">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
          <ExternalLink size={14} /> ข้อมูลการเชื่อมต่อ
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-500">ชื่อกองทุน</span>
            <span className="font-bold text-slate-700">{settings?.fundName}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-500">สถานะ LINE Token</span>
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-md text-[10px] font-black">{settings?.memberBotToken}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-500">Google Spreadsheet URL</span>
            <a
              href={settings?.spreadsheetUrl}
              target="_blank"
              className="text-indigo-600 font-bold hover:underline flex items-center gap-1"
            >
              เปิดไฟล์ชีทต้นฉบับ <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
