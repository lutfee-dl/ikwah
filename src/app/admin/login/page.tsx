"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Lock, Mail, ShieldAlert, LogIn, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import Cookies from "js-cookie";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, updateDoc, doc, serverTimestamp } from "firebase/firestore";
import { ASSETS } from "@/config";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const token = await userCredential.user.getIdToken();

      try {
        const adminsRef = collection(db, "system_admins");
        const q = query(adminsRef, where("uid", "==", userCredential.user.uid));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const adminDoc = querySnapshot.docs[0];
          const adminData = adminDoc.data();
          if (adminData.status === "suspended") {
            await auth.signOut();
            setError("บัญชีนี้ถูกระงับการเข้าใช้งาน");
            setLoading(false);
            return;
          }
          await updateDoc(doc(db, "system_admins", adminDoc.id), {
            lastLoginAt: serverTimestamp()
          });
        }
      } catch (err) { console.error(err); }

      Cookies.set("adminToken", token, { expires: 1 });
      sessionStorage.setItem("login_success", "true");
      router.replace("/admin/dashboard");
      router.refresh();
    } catch (err) {
      setError("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
      <div className="w-full max-w-[1000px] md:h-[650px] bg-white md:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.15)] md:rounded-[40px] overflow-hidden flex flex-col md:flex-row relative">

        {/* Left Side: Brand Hero */}
        <div className="w-full md:w-[42%] bg-linear-to-br from-blue-700 to-blue-500 p-12 flex flex-col items-center justify-center text-white relative overflow-hidden shrink-0">
          {/* Subtle Geometric Pattern */}
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_2px_2px,white_1px,transparent_0)] bg-[length:32px_32px]"></div>
          </div>

          <div className="relative z-10 flex flex-col items-center text-center space-y-10 animate-in fade-in slide-in-from-left-10 duration-700">
            <div className="w-32 h-32 md:w-40 md:h-40 flex items-center justify-center">
              <Image
                src={ASSETS.IMAGES.LOGO_IKWAH}
                alt="Logo"
                width={120} height={120}
                style={{ filter: 'brightness(0) invert(1)' }}
                className="w-full h-full object-contain scale-[1.6]"
                unoptimized
              />
            </div>
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="w-full md:w-[58%] bg-white p-8 md:p-16 flex flex-col justify-center">
          <div className="max-w-[360px] mx-auto w-full space-y-12 animate-in fade-in slide-in-from-right-10 duration-700 delay-200">

            <div className="space-y-2">
              <h2 className="text-3xl font-black text-slate-800 tracking-tight">เข้าสู่ระบบ</h2>
              <p className="text-slate-400 text-lg font-medium italic">จัดการกองทุนและสมาชิกอิควะห์</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-8">
              {error && (
                <div className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-sm font-bold animate-shake">
                  <ShieldAlert size={18} className="shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <div className="space-y-6">
                {/* Email Address */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">อีเมลล์</label>
                  <div className="relative group">
                    <Mail size={18} className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@example.com"
                      className="w-full pl-8 pr-4 py-3 bg-transparent border-b-2 border-slate-100 outline-none focus:border-blue-500 transition-all text-sm font-bold text-slate-700 placeholder:text-slate-300 placeholder:font-normal"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">รหัสผ่าน</label>
                  <div className="relative group">
                    <Lock size={18} className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-8 pr-12 py-3 bg-transparent border-b-2 border-slate-100 outline-none focus:border-blue-500 transition-all text-sm font-bold text-slate-700 placeholder:text-slate-300 placeholder:font-normal"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="cursor-pointer absolute right-0 top-1/2 -translate-y-1/2 text-slate-300 hover:text-blue-600 transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="cursor-pointer w-full py-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] disabled:bg-slate-200 text-white font-black rounded-2xl shadow-xl shadow-blue-600/20 transition-all flex items-center justify-center gap-3 text-sm tracking-widest uppercase"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      เข้าสู่ระบบ
                      <LogIn size={18} />
                    </>
                  )}
                </button>
              </div>
            </form>

            <p className="text-center text-[10px] text-gray-400 font-bold uppercase tracking-[0.3em]">
              Powered by Ikwah Cooperative
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
