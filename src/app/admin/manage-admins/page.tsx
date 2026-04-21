"use client";

import { useState, useEffect, useCallback } from "react";
import {
  UserPlus, Mail, Lock, Eye, EyeOff, ShieldCheck,
  CheckCircle2, AlertCircle, Loader2, X, Search,
  RefreshCw, UserCog, Trash2, Users,
} from "lucide-react";
import {
  initializeApp, deleteApp, FirebaseApp, getApps, getApp,
} from "firebase/app";
import {
  getAuth, createUserWithEmailAndPassword, updateProfile,
} from "firebase/auth";
import {
  collection, addDoc, getDocs, deleteDoc, doc,
  query, orderBy, serverTimestamp, Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import toast from "react-hot-toast";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

interface AdminRecord {
  id: string;
  displayName: string;
  email: string;
  role: string;
  createdAt: Timestamp | null;
}

function getPasswordStrength(password: string) {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  const labels = ["", "อ่อนมาก", "อ่อน", "ปานกลาง", "แข็งแกร่ง", "ดีมาก"];
  const colors = ["", "bg-red-500", "bg-orange-500", "bg-yellow-400", "bg-blue-500", "bg-emerald-500"];
  return { score, label: labels[score] || "อ่อนมาก", color: colors[score] || "bg-red-500" };
}

const ADMINS_COLLECTION = "system_admins";

export default function ManageAdminsPage() {
  const [admins, setAdmins] = useState<AdminRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    displayName: "", email: "", password: "", confirmPassword: "", role: "staff",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const strength = getPasswordStrength(form.password);

  // ── Fetch admins from Firestore ──
  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    try {
      const q = query(collection(db, ADMINS_COLLECTION), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      const rows: AdminRecord[] = snap.docs.map((d) => ({
        id: d.id,
        displayName: d.data().displayName || "-",
        email: d.data().email || "-",
        role: d.data().role || "staff",
        createdAt: d.data().createdAt || null,
      }));
      setAdmins(rows);
    } catch (err) {
      console.error(err);
      toast.error("ไม่สามารถโหลดข้อมูลแอดมินได้");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAdmins(); }, [fetchAdmins]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  // ── Create new admin via secondary Firebase instance ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) return toast.error("รหัสผ่านไม่ตรงกัน");
    if (strength.score < 2) return toast.error("รหัสผ่านต้องรัดกุมกว่านี้");

    setSubmitting(true);
    const appName = `secondary-${Date.now()}`;
    let secondaryApp: FirebaseApp | null = null;

    try {
      // Use existing secondary instance if available, otherwise create new one
      secondaryApp = getApps().find((a) => a.name === appName)
        ? getApp(appName)
        : initializeApp(firebaseConfig, appName);

      const secondaryAuth = getAuth(secondaryApp);
      const credential = await createUserWithEmailAndPassword(
        secondaryAuth, form.email, form.password,
      );
      if (form.displayName) {
        await updateProfile(credential.user, { displayName: form.displayName });
      }
      await secondaryAuth.signOut();

      // Save to Firestore
      await addDoc(collection(db, ADMINS_COLLECTION), {
        uid: credential.user.uid,
        displayName: form.displayName || form.email.split("@")[0],
        email: form.email,
        role: form.role,
        createdAt: serverTimestamp(),
      });

      toast.success(`สร้างบัญชี ${form.email} สำเร็จ!`);
      setForm({ displayName: "", email: "", password: "", confirmPassword: "", role: "staff" });
      setShowModal(false);
      fetchAdmins();
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === "auth/email-already-in-use") toast.error("อีเมลนี้ถูกใช้งานแล้ว");
      else if (code === "auth/invalid-email") toast.error("รูปแบบอีเมลไม่ถูกต้อง");
      else if (code === "auth/weak-password") toast.error("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
      else toast.error("เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      if (secondaryApp) await deleteApp(secondaryApp).catch(() => {});
      setSubmitting(false);
    }
  };

  // ── Delete (Firestore record only) ──
  const handleDelete = async (id: string, email: string) => {
    if (!confirm(`ลบบันทึกของ ${email} ออกจากรายการ?\n(บัญชี Firebase Auth จะยังคงอยู่)`)) return;
    setDeleting(id);
    try {
      await deleteDoc(doc(db, ADMINS_COLLECTION, id));
      setAdmins((prev) => prev.filter((a) => a.id !== id));
      toast.success("ลบบันทึกแล้ว");
    } catch {
      toast.error("ลบไม่สำเร็จ");
    } finally {
      setDeleting(null);
    }
  };

  const filtered = admins.filter(
    (a) =>
      a.displayName.toLowerCase().includes(search.toLowerCase()) ||
      a.email.toLowerCase().includes(search.toLowerCase()),
  );

  const roleLabel = (r: string) =>
    r === "superadmin" ? "Super Admin" : r === "manager" ? "ผู้จัดการ" : "เจ้าหน้าที่";
  const roleColor = (r: string) =>
    r === "superadmin"
      ? "bg-purple-100 text-purple-700 border-purple-200"
      : r === "manager"
      ? "bg-blue-100 text-blue-700 border-blue-200"
      : "bg-slate-100 text-slate-600 border-slate-200";

  return (
    <div className="space-y-6">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-2xl border border-slate-200 shadow-sm">
          <Users size={18} className="text-blue-600" />
          <span className="text-sm font-black text-slate-700">
            ผู้ดูแลระบบทั้งหมด:{" "}
            <span className="text-blue-600">{admins.length} บัญชี</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchAdmins}
            className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="cursor-pointer flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-black rounded-xl shadow-lg shadow-blue-600/20 transition-all"
          >
            <UserPlus size={17} />
            เพิ่มผู้ดูแลระบบ
          </button>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Search Bar */}
        <div className="p-5 border-b border-slate-100 flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 w-full max-w-sm focus-within:ring-4 focus-within:ring-blue-100 focus-within:border-blue-300 focus-within:bg-white transition-all">
            <Search size={15} className="text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาชื่อหรืออีเมล..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent outline-none text-sm text-slate-700 w-full placeholder:text-slate-400 font-medium"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">
                  #
                </th>
                <th className="text-left px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">
                  ชื่อ / อีเมล
                </th>
                <th className="text-left px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">
                  ตำแหน่ง
                </th>
                <th className="text-left px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">
                  วันที่เพิ่ม
                </th>
                <th className="text-right px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">
                  จัดการ
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-3 text-slate-400">
                      <Loader2 size={28} className="animate-spin text-blue-500" />
                      <p className="text-sm font-bold">กำลังโหลดข้อมูล...</p>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-3 text-slate-300">
                      <UserCog size={40} strokeWidth={1.5} />
                      <p className="text-sm font-bold text-slate-400">
                        {search ? "ไม่พบผลลัพธ์" : "ยังไม่มีข้อมูลผู้ดูแลระบบ"}
                      </p>
                      {!search && (
                        <button
                          onClick={() => setShowModal(true)}
                          className="text-blue-600 text-xs font-black hover:underline"
                        >
                          + เพิ่มคนแรก
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((admin, idx) => (
                  <tr
                    key={admin.id}
                    className="hover:bg-blue-50/30 transition-colors group"
                  >
                    <td className="px-6 py-4 text-xs font-black text-slate-300">
                      {idx + 1}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-linear-to-tr from-blue-500 to-sky-400 flex items-center justify-center text-white font-black text-sm shadow-sm flex-shrink-0">
                          {admin.displayName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-black text-slate-800 text-sm">
                            {admin.displayName}
                          </p>
                          <p className="text-xs text-slate-400 font-medium">
                            {admin.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-black border ${roleColor(admin.role)}`}
                      >
                        {roleLabel(admin.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500 font-medium">
                      {admin.createdAt
                        ? admin.createdAt.toDate().toLocaleDateString("th-TH", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "-"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(admin.id, admin.email)}
                        disabled={deleting === admin.id}
                        className="cursor-pointer opacity-0 group-hover:opacity-100 p-2 rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all border border-transparent hover:border-red-100 disabled:opacity-50"
                      >
                        {deleting === admin.id ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : (
                          <Trash2 size={15} />
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Add Admin Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl shadow-slate-900/20 w-full max-w-lg border border-slate-200 animate-in zoom-in-95 duration-200 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
                  <UserPlus size={19} className="text-white" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-800">
                    เพิ่มผู้ดูแลระบบใหม่
                  </h2>
                  <p className="text-[11px] text-slate-400 font-medium">
                    บัญชีจะถูกสร้างใน Firebase Authentication
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="cursor-pointer p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="px-8 py-6 space-y-5">
              {/* Display Name */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
                  ชื่อที่แสดงในระบบ
                </label>
                <div className="relative group">
                  <ShieldCheck size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                  <input
                    type="text"
                    name="displayName"
                    value={form.displayName}
                    onChange={handleChange}
                    placeholder="เช่น นายสมชาย ใจดี"
                    className="w-full pl-10 pr-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 focus:bg-white transition-all text-slate-800 placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
                  อีเมล <span className="text-red-400">*</span>
                </label>
                <div className="relative group">
                  <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                  <input
                    type="email"
                    name="email"
                    required
                    value={form.email}
                    onChange={handleChange}
                    placeholder="admin@ikwah.com"
                    className="w-full pl-10 pr-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 focus:bg-white transition-all text-slate-800 placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Role */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
                  ตำแหน่ง / สิทธิ์
                </label>
                <select
                  name="role"
                  value={form.role}
                  onChange={handleChange}
                  className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 focus:bg-white transition-all text-slate-800 font-medium"
                >
                  <option value="staff">เจ้าหน้าที่</option>
                  <option value="manager">ผู้จัดการ</option>
                  <option value="superadmin">Super Admin</option>
                </select>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
                  รหัสผ่าน <span className="text-red-400">*</span>
                </label>
                <div className="relative group">
                  <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    required
                    value={form.password}
                    onChange={handleChange}
                    placeholder="อย่างน้อย 8 ตัวอักษร"
                    className="w-full pl-10 pr-11 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 focus:bg-white transition-all text-slate-800 placeholder:text-slate-400"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {form.password && (
                  <div className="flex gap-1 pt-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= strength.score ? strength.color : "bg-slate-200"}`} />
                    ))}
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
                  ยืนยันรหัสผ่าน <span className="text-red-400">*</span>
                </label>
                <div className="relative group">
                  <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                  <input
                    type={showConfirm ? "text" : "password"}
                    name="confirmPassword"
                    required
                    value={form.confirmPassword}
                    onChange={handleChange}
                    placeholder="กรอกรหัสผ่านอีกครั้ง"
                    className={`w-full pl-10 pr-11 py-3 text-sm bg-slate-50 border rounded-xl outline-none focus:ring-4 focus:bg-white transition-all placeholder:text-slate-400 ${
                      form.confirmPassword && form.password !== form.confirmPassword
                        ? "border-red-300 focus:ring-red-100 text-red-700"
                        : form.confirmPassword && form.password === form.confirmPassword
                        ? "border-emerald-300 focus:ring-emerald-100 text-slate-800"
                        : "border-slate-200 focus:ring-blue-100 focus:border-blue-400 text-slate-800"
                    }`}
                  />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                    {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                  {form.confirmPassword && (
                    <div className="absolute right-10 top-1/2 -translate-y-1/2">
                      {form.password === form.confirmPassword
                        ? <CheckCircle2 size={15} className="text-emerald-500" />
                        : <AlertCircle size={15} className="text-red-400" />}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="cursor-pointer flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 text-sm font-black hover:bg-slate-50 transition-all"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="cursor-pointer flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-sm font-black rounded-xl shadow-lg shadow-blue-600/15 transition-all"
                >
                  {submitting ? (
                    <><Loader2 size={15} className="animate-spin" />กำลังสร้าง...</>
                  ) : (
                    <><UserPlus size={15} />สร้างบัญชี</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
