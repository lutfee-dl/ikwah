"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  UserPlus, Mail, Lock, Eye, EyeOff, ShieldCheck,
  CheckCircle2, AlertCircle, Loader2, X, Search,
  RefreshCw, UserCog, Trash2, Users, Edit3, Key,
  ChevronLeft, ChevronRight, LayoutDashboard, UserCheck, UserX
} from "lucide-react";
import {
  initializeApp, deleteApp, FirebaseApp, getApps, getApp,
} from "firebase/app";
import {
  getAuth, createUserWithEmailAndPassword, updateProfile,
  setPersistence, inMemoryPersistence, sendPasswordResetEmail, onAuthStateChanged,
} from "firebase/auth";
import {
  collection, addDoc, getDocs, deleteDoc, doc, updateDoc,
  query, serverTimestamp, Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import { TableSkeleton } from "@/components/ui/TableSkeleton";

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
  uid: string;
  displayName: string;
  email: string;
  status: "active" | "suspended";
  createdAt: Timestamp | null;
  lastLoginAt?: Timestamp | null;
}

function getPasswordStrength(password: string) {
  let score = 0;
  if (!password) return { score: 0, label: "รหัสผ่าน", color: "bg-slate-200" };
  if (password.length >= 6) score++;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const labels = ["สั้นเกินไป", "อ่อน", "พอใช้", "ปานกลาง", "แข็งแกร่ง", "ปลอดภัยมาก"];
  const colors = ["bg-red-400", "bg-red-500", "bg-orange-500", "bg-yellow-400", "bg-blue-500", "bg-emerald-500"];
  return { score, label: labels[score], color: colors[score] };
}

const ADMINS_COLLECTION = "system_admins";

export default function ManageAdminsPage() {
  const [admins, setAdmins] = useState<AdminRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminRecord | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    displayName: "", email: "", password: "", confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const strength = getPasswordStrength(form.password);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Edit form state
  const [editForm, setEditForm] = useState({ displayName: "", status: "active" as "active" | "suspended" });

  // ── Stats Calculation ──
  const stats = useMemo(() => {
    return {
      total: admins.length,
      active: admins.filter(a => a.status === "active").length,
      suspended: admins.filter(a => a.status === "suspended").length,
    };
  }, [admins]);

  // ── Fetch admins from Firestore ──
  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    const auth = getAuth();

    // 🛡️ รอให้ Auth โหลดเสร็จก่อน
    if (!auth.currentUser) {
      setLoading(false);
      return;
    }

    try {
      const q = query(collection(db, ADMINS_COLLECTION));
      const snap = await getDocs(q);

      const rows: AdminRecord[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          uid: data.uid || "",
          displayName: data.displayName || "-",
          email: data.email || "-",
          status: data.status || "active",
          createdAt: data.createdAt || null,
          lastLoginAt: data.lastLoginAt || null,
        };
      });

      // Sort manually if no orderBy in query
      rows.sort((a, b) => {
        const timeA = a.createdAt?.toMillis() || 0;
        const timeB = b.createdAt?.toMillis() || 0;
        return timeB - timeA;
      });

      setAdmins(rows);
    } catch (err) {
      console.error("--- FETCH ERROR ---");
      console.error(err);
      toast.error("ไม่สามารถโหลดข้อมูลแอดมินได้");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        fetchAdmins();
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [fetchAdmins]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
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
      // Use config from main db to ensure consistency
      const config = db.app.options;
      secondaryApp = initializeApp(config, appName);

      const secondaryAuth = getAuth(secondaryApp);
      await setPersistence(secondaryAuth, inMemoryPersistence);
      const credential = await createUserWithEmailAndPassword(
        secondaryAuth, form.email, form.password,
      );

      if (form.displayName) {
        await updateProfile(credential.user, { displayName: form.displayName });
      }
      await secondaryAuth.signOut();

      await addDoc(collection(db, ADMINS_COLLECTION), {
        uid: credential.user.uid,
        displayName: form.displayName || form.email.split("@")[0],
        email: form.email,
        status: "active",
        createdAt: serverTimestamp(),
      });

      toast.success(`สร้างบัญชี ${form.email} สำเร็จ!`);
      setForm({ displayName: "", email: "", password: "", confirmPassword: "" });
      setShowModal(false);
      fetchAdmins();
    } catch (err: unknown) {
      console.error("Create Admin Error:", err);
      const code = (err as { code?: string }).code;
      if (code === "auth/email-already-in-use") toast.error("อีเมลนี้ถูกใช้งานแล้ว");
      else if (code === "auth/invalid-email") toast.error("รูปแบบอีเมลไม่ถูกต้อง");
      else if (code === "auth/weak-password") toast.error("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
      else if (code === "permission-denied") toast.error("คุณไม่มีสิทธิ์เขียนข้อมูล (ตรวจสอบ Firestore Rules)");
      else toast.error("เกิดข้อผิดพลาด: " + (code || "กรุณาลองใหม่"));
    } finally {
      if (secondaryApp) await deleteApp(secondaryApp).catch(() => { });
      setSubmitting(false);
    }
  };

  // ── Update Admin Info ──
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdmin) return;

    setSubmitting(true);
    try {
      await updateDoc(doc(db, ADMINS_COLLECTION, editingAdmin.id), {
        displayName: editForm.displayName,
        status: editForm.status,
      });
      toast.success("อัปเดตข้อมูลสำเร็จ");
      setEditingAdmin(null);
      fetchAdmins();
    } catch (err) {
      console.error(err);
      toast.error("อัปเดตไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Reset Password Email ──
  const handleResetPassword = async (email: string) => {
    const result = await Swal.fire({
      title: "รีเซ็ตรหัสผ่าน?",
      text: `ต้องการส่งอีเมลตั้งค่ารหัสผ่านใหม่ไปยัง ${email} ใช่หรือไม่?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#2563eb",
      cancelButtonColor: "#64748b",
      confirmButtonText: "ใช่, ส่งเลย",
      cancelButtonText: "ยกเลิก"
    });

    if (result.isConfirmed) {
      try {
        await sendPasswordResetEmail(getAuth(), email);
        toast.success("ส่งอีเมลรีเซ็ตรหัสผ่านแล้ว");
      } catch (err) {
        console.error(err);
        toast.error("ส่งอีเมลไม่สำเร็จ");
      }
    }
  };

  // ── Delete ──
  const handleDelete = async (id: string, uid: string, email: string) => {
    const result = await Swal.fire({
      title: "ลบบัญชี?",
      text: `ต้องการลบบัญชีของ ${email} ใช่หรือไม่?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#64748b",
      confirmButtonText: "ใช่, ลบ",
      cancelButtonText: "ยกเลิก"
    });

    if (result.isConfirmed) {
      setDeleting(id);
      try {
        const res = await fetch("/api/admin/delete-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uid: uid,
            docId: id,
            ADMIN_SECRET: process.env.NEXT_PUBLIC_ADMIN_SECRET
          })
        });

        const contentType = res.headers.get("content-type");
        if (!res.ok || !contentType || !contentType.includes("application/json")) {
          const errorText = await res.text();
          console.error("Server Error Response:", errorText);
          throw new Error(`เซิร์ฟเวอร์ตอบกลับผิดพลาด (${res.status})`);
        }

        const data = await res.json();

        if (data.success) {
          setAdmins((prev) => prev.filter((a) => a.id !== id));
          toast.success("ลบบัญชีออกจากระบบเรียบร้อยแล้ว");
        } else {
          toast.error(data.msg || "ลบไม่สำเร็จ");
        }
      } catch (err) {
        console.error(err);
        toast.error("ติดต่อเซิร์ฟเวอร์ไม่ได้");
      } finally {
        setDeleting(null);
      }
    }
  };

  // ── Pagination & Filter logic ──
  const filtered = useMemo(() => {
    return admins.filter(
      (a) =>
        a.displayName.toLowerCase().includes(search.toLowerCase()) ||
        a.email.toLowerCase().includes(search.toLowerCase()),
    );
  }, [admins, search]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const currentItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage, itemsPerPage]);

  useEffect(() => { setCurrentPage(1); }, [search, itemsPerPage]);

  return (
    <div className="space-y-6">
      {/* Dashboard Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "แอดมินทั้งหมด", value: stats.total, icon: <Users size={22} />, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
          { label: "ใช้งานอยู่", value: stats.active, icon: <UserCheck size={22} />, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" },
          { label: "ระงับใช้งาน", value: stats.suspended, icon: <UserX size={22} />, color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-100" },
          { label: "เพิ่มล่าสุด", value: admins[0]?.displayName || "-", icon: <CheckCircle2 size={22} />, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100" }
        ].map((s, i) => (
          <div key={i} className={`bg-white p-5 rounded-2xl border ${s.border} shadow-sm flex items-center justify-between transition-all hover:shadow-md`}>
            <div className="space-y-1">
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{s.label}</p>
              <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
            </div>
            <div className={`p-3 rounded-xl ${s.bg} ${s.color}`}>
              {s.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Header Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2.5 w-full md:w-80 focus-within:ring-4 focus-within:ring-blue-100 focus-within:border-blue-300 transition-all shadow-sm">
            <Search size={15} className="text-slate-400" />
            <input type="text" placeholder="ค้นหาชื่อหรืออีเมล..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-transparent outline-none text-sm text-slate-700 w-full font-medium" />
          </div>
          <button onClick={fetchAdmins} className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-blue-600 transition-all shadow-sm">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <select value={itemsPerPage} onChange={(e) => setItemsPerPage(Number(e.target.value))} className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-600 outline-none focus:ring-4 focus:ring-blue-100 shadow-sm">
            <option value={10}>10 บัญชี/หน้า</option>
            <option value={50}>50 บัญชี/หน้า</option>
            <option value={100}>100 บัญชี/หน้า</option>
          </select>
          <button onClick={() => setShowModal(true)} className="cursor-pointer flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-black rounded-xl shadow-lg shadow-blue-600/20 transition-all">
            <UserPlus size={17} />
            เพิ่มแอดมิน
          </button>
        </div>
      </div>

      {/* Table & Mobile Card Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-black text-slate-400 uppercase tracking-widest text-left">
                <th className="px-6 py-4">#</th>
                <th className="px-6 py-4">ชื่อ / อีเมล</th>
                <th className="px-6 py-4 text-center">สถานะ</th>
                <th className="px-6 py-4">วันที่เพิ่ม</th>
                <th className="px-6 py-4">เข้าล่าสุดเมื่อ</th>
                <th className="px-6 py-4 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={5} className="p-0">
                      <TableSkeleton cols={5} rows={1} hasHeader={false} />
                    </td>
                  </tr>
                ))
              ) : currentItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-3 text-slate-300">
                      <UserCog size={40} strokeWidth={1.5} />
                      <p className="text-sm font-bold text-slate-400">
                        {search ? "ไม่พบผลลัพธ์" : "ยังไม่มีข้อมูลแอดมิน"}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                currentItems.map((admin, idx) => (
                  <tr key={admin.id} className="hover:bg-blue-50/30 even:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4 text-xs font-black text-slate-300">
                      {(currentPage - 1) * itemsPerPage + idx + 1}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-linear-to-tr from-slate-500 to-slate-400 flex items-center justify-center text-white font-black text-sm shadow-sm flex-shrink-0 uppercase">
                          {admin.displayName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-black text-slate-800 text-sm truncate max-w-[200px]">{admin.displayName}</p>
                          <p className="text-xs text-slate-400 font-medium truncate max-w-[200px]">{admin.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider ${admin.status === "active" ? "bg-emerald-100 text-emerald-700 border border-emerald-200" : "bg-red-100 text-red-700 border border-red-200"}`}>
                        {admin.status === "active" ? "ใช้งานอยู่" : "ระงับใช้งาน"}
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
                    <td className="px-6 py-4 text-xs text-slate-500 font-medium">
                      {admin.lastLoginAt
                        ? admin.lastLoginAt.toDate().toLocaleString("th-TH", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit"
                        })
                        : "ยังไม่เคยเข้าใช้งาน"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setEditingAdmin(admin);
                            setEditForm({ displayName: admin.displayName, status: admin.status });
                          }}
                          className="p-2 rounded-xl text-slate-400 hover:bg-slate-50 hover:text-slate-800 transition-all border border-transparent hover:border-slate-200"
                          title="แก้ไขข้อมูล"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(admin.id, admin.uid, admin.email)}
                          disabled={deleting === admin.id}
                          className="p-2 rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all border border-transparent hover:border-red-100 disabled:opacity-50"
                        >
                          {deleting === admin.id ? (
                            <Loader2 size={15} className="animate-spin" />
                          ) : (
                            <Trash2 size={15} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-slate-100">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-5 animate-pulse space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-100 rounded-xl" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-slate-100 rounded w-1/2" />
                    <div className="h-3 bg-slate-100 rounded w-1/3" />
                  </div>
                </div>
              </div>
            ))
          ) : currentItems.length === 0 ? (
            <div className="py-20 text-center">
              <UserCog size={40} className="mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-bold text-slate-400">ไม่พบข้อมูล</p>
            </div>
          ) : (
            currentItems.map((admin, idx) => (
              <div key={admin.id} className="p-5 hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-linear-to-tr from-slate-500 to-slate-400 flex items-center justify-center text-white font-black text-sm shadow-sm uppercase shrink-0">
                      {admin.displayName.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-black text-slate-800 text-sm leading-tight mb-0.5">{admin.displayName}</h4>
                      <p className="text-[11px] text-slate-400 font-medium break-all">{admin.email}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider shrink-0 ${admin.status === "active" ? "bg-emerald-100 text-emerald-700 border border-emerald-200" : "bg-red-100 text-red-700 border border-red-200"}`}>
                    {admin.status === "active" ? "ใช้งานอยู่" : "ระงับใช้งาน"}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-dashed border-slate-100">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    Added: {admin.createdAt?.toDate().toLocaleDateString("th-TH") || "-"}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingAdmin(admin);
                        setEditForm({ displayName: admin.displayName, status: admin.status });
                      }}
                      className="p-2.5 rounded-xl bg-slate-50 text-slate-600 border border-slate-200"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(admin.id, admin.uid, admin.email)}
                      disabled={deleting === admin.id}
                      className="p-2.5 rounded-xl bg-red-50 text-red-600 border border-red-100"
                    >
                      {deleting === admin.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination Footer */}
        {filtered.length > 0 && (
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              แสดง {Math.min(filtered.length, (currentPage - 1) * itemsPerPage + 1)} ถึง {Math.min(filtered.length, currentPage * itemsPerPage)} จาก {filtered.length} รายการ
            </p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`w-9 h-9 rounded-xl text-xs font-black transition-all ${currentPage === i + 1 ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "bg-white border border-slate-200 text-slate-500 hover:bg-slate-50"}`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
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
                  <h2 className="text-base font-black text-slate-800">เพิ่มแอดมินใหม่</h2>
                  <p className="text-[11px] text-slate-400 font-medium">จัดการสิทธิ์การเข้าใช้งานระบบ</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="cursor-pointer p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="px-8 py-6 space-y-5">
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">ชื่อที่แสดง</label>
                <div className="relative group">
                  <ShieldCheck size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                  <input
                    type="text"
                    name="displayName"
                    value={form.displayName}
                    onChange={handleChange}
                    placeholder="ชื่อ-นามสกุล"
                    className="w-full pl-10 pr-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 focus:bg-white transition-all text-slate-800"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">อีเมล *</label>
                <div className="relative group">
                  <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                  <input
                    type="email"
                    name="email"
                    required
                    value={form.email}
                    onChange={handleChange}
                    placeholder="admin@example.com"
                    className="w-full pl-10 pr-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 focus:bg-white transition-all text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">รหัสผ่าน *</label>
                  <div className="relative group">
                    <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      required
                      value={form.password}
                      onChange={handleChange}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 focus:bg-white transition-all text-slate-800"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">ยืนยัน *</label>
                  <div className="relative group">
                    <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                    <input
                      type={showConfirm ? "text" : "password"}
                      name="confirmPassword"
                      required
                      value={form.confirmPassword}
                      onChange={handleChange}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 focus:bg-white transition-all text-slate-800"
                    />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                      {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Password Strength Meter */}
              {form.password && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      ความแข็งแรง: <span className={strength.color.replace('bg-', 'text-')}>{strength.label}</span>
                    </span>
                  </div>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-all ${i <= strength.score ? strength.color : "bg-slate-100"}`}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 text-sm font-black hover:bg-slate-50 transition-all">ยกเลิก</button>
                <button type="submit" disabled={submitting} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-sm font-black rounded-xl shadow-lg shadow-blue-600/15 transition-all">
                  {submitting ? "กำลังสร้าง..." : "ยืนยันสร้างบัญชี"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Admin Modal ── */}
      {editingAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md border border-slate-200 animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center shadow-lg">
                  <Edit3 size={19} className="text-white" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-800">แก้ไขข้อมูลแอดมิน</h2>
                  <p className="text-[11px] text-slate-400 font-medium">{editingAdmin.email}</p>
                </div>
              </div>
              <button onClick={() => setEditingAdmin(null)} className="cursor-pointer p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="px-8 py-6 space-y-6">
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">ชื่อที่แสดง</label>
                <input
                  type="text"
                  value={editForm.displayName}
                  onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                  className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 focus:bg-white transition-all text-slate-800"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">สถานะบัญชี</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, status: "active" })}
                    className={`cursor-pointer py-2.5 rounded-xl border text-xs font-black transition-all ${editForm.status === "active" ? "bg-emerald-50 border-emerald-500 text-emerald-700" : "bg-white border-slate-200 text-slate-400 hover:bg-slate-50"}`}
                  >
                    ใช้งานอยู่
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, status: "suspended" })}
                    className={`cursor-pointer py-2.5 rounded-xl border text-xs font-black transition-all ${editForm.status === "suspended" ? "bg-red-50 border-red-500 text-red-700" : "bg-white border-slate-200 text-slate-400 hover:bg-slate-50"}`}
                  >
                    ระงับใช้งาน
                  </button>
                </div>
              </div>

              <div className="space-y-2 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ความปลอดภัย</p>
                <button
                  type="button"
                  onClick={() => handleResetPassword(editingAdmin.email)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-white border border-blue-200 text-blue-600 rounded-xl text-sm font-black hover:bg-blue-50 transition-all"
                >
                  <Key size={14} />
                  รีเซ็ตรหัสผ่าน (ส่งอีเมล)
                </button>
                <p className="text-xs text-center text-slate-400">ระบบจะส่งลิงก์ตั้งรหัสผ่านใหม่ไปยังอีเมลของแอดมิน</p>
              </div>

              <div className="pt-4 flex flex-col gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="cursor-pointer w-full py-3 bg-slate-900 hover:bg-black disabled:bg-slate-300 text-white text-sm font-black rounded-xl transition-all"
                >
                  {submitting ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingAdmin(null)}
                  className="w-full py-3 text-slate-400 text-xs font-bold hover:text-slate-600 transition-all"
                >
                  ยกเลิก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
