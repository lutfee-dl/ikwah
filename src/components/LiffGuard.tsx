"use client";

import React, { useState, useEffect, ReactNode } from "react";
import { initLiff, isLiffLoggedIn, liffLogin } from "@/services/liff";
import { AlertCircle, Loader2 } from "lucide-react";
import liff from "@line/liff";
import { useRouter } from "next/navigation";

interface LiffGuardProps {
  children: ReactNode;
}

export default function LiffGuard({ children }: LiffGuardProps) {
  const [status, setStatus] = useState<"loading" | "authorized">("loading");
  const [isExternalBrowser, setIsExternalBrowser] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkLiff = async () => {
      try {
        const initialized = await initLiff();

        if (!initialized) {
          setIsExternalBrowser(true);
          setStatus("authorized");
          return;
        }

        // ตรวจสอบว่าอยู่ใน LINE หรือไม่
        if (!liff.isInClient()) {
          setIsExternalBrowser(true);
          setStatus("authorized");
          return;
        }

        if (isLiffLoggedIn()) {
          setStatus("authorized");
        } else {
          if (liff.isInClient()) {
            liffLogin();
          } else {
            setIsExternalBrowser(true);
            setStatus("authorized");
          }
        }
      } catch (err: any) {
        console.error("LiffGuard error", err);
        setIsExternalBrowser(true);
        setStatus("authorized");
      }
    };

    checkLiff();
  }, [router]);

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-blue-50">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-slate-500 font-medium">กำลังตรวจสอบสถานะ...</p>
        </div>
      </div>
    );
  }

  if (isExternalBrowser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-blue-50 p-4">
        <div className="bg-white w-full max-w-sm rounded-3xl shadow-xl p-8 text-center animate-[fadeIn_0.5s]">
          <div className="bg-red-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-red-100">
            <AlertCircle className="w-12 h-12 text-red-500" strokeWidth={1.5} />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">เข้าใช้งานไม่ได้</h2>
          <p className="text-gray-600 leading-relaxed text-sm">
            ขออภัยในความไม่สะดวก ระบบไม่อนุญาตให้เข้าใช้งานผ่าน Browser ภายนอก
            <br className="my-2" />
            กรุณาเปิดลิงก์นี้ผ่านแอปพลิเคชัน LINE เท่านั้น
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
