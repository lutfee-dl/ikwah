"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Lock, Mail, ShieldAlert, LogIn } from "lucide-react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import Cookies from "js-cookie";
import { ASSETS } from "@/config";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const token = await userCredential.user.getIdToken();

      Cookies.set("adminToken", token, { expires: 1 });
      sessionStorage.setItem("login_success", "true");
      router.replace("/admin/dashboard");
      router.refresh();
    } catch (err: unknown) {
      console.error("Login Error:", err);
      setError("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-2xl shadow-sky-900/10 border border-white overflow-hidden relative">
        <div className="pt-12 pb-2 relative flex flex-col items-center justify-center">
          <div className="absolute top-0 w-full h-full overflow-hidden pointer-events-none">
            <div className="absolute -right-10 -top-10 w-48 h-48 bg-sky-200/60 rounded-full blur-3xl"></div>
            <div className="absolute -left-10 top-10 w-40 h-40 bg-blue-200/50 rounded-full blur-3xl"></div>
          </div>

          <div className="w-full max-w-[200px] h-24 mx-auto overflow-hidden flex items-center justify-center relative z-10">
            <Image
              src={ASSETS.IMAGES.LOGO_IKWAH}
              alt="Logo"
              width={200}
              height={96}
              className="w-full h-full object-contain scale-[1.8] transform origin-center"
              unoptimized
            />
          </div>
          <div className="text-center mb-8 space-y-2">
            <p className="text-slate-500 text-sm font-medium">
              เข้าสู่ระบบเพื่อจัดการกองทุน
            </p>
          </div>
        </div>

        <div className="px-8 pb-12 pt-6 relative z-10">
          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="flex items-center gap-3 p-4 bg-rose-50/80 backdrop-blur-sm border border-rose-100 rounded-2xl text-rose-600 text-sm font-medium animate-in fade-in slide-in-from-top-2">
                <ShieldAlert size={18} className="shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700 ml-1">
                  อีเมลล์
                </label>
                <div className="relative group">
                  <Mail
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-sky-500 transition-colors"
                    size={20}
                  />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@coop.com"
                    className="w-full bg-white/50 pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all outline-none text-slate-700 placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700 ml-1">
                  รหัสผ่าน
                </label>
                <div className="relative group">
                  <Lock
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-sky-500 transition-colors"
                    size={20}
                  />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-white/50 pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all outline-none text-slate-700 placeholder:text-slate-400"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="cursor-pointer group w-full bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 disabled:from-slate-300 disabled:to-slate-300 disabled:shadow-none text-white font-bold py-4 rounded-2xl shadow-xl shadow-sky-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  เข้าสู่ระบบ
                  <LogIn
                    size={18}
                    className="group-hover:translate-x-1 transition-transform"
                  />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
