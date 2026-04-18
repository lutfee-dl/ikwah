"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { initLiff, getLiffIdToken, isLiffInClient } from "@/services/liff";
import { AlertCircle } from "lucide-react";
import liff from "@line/liff";
import { gasApi } from "@/services/gasApi";

export default function RootPage() {
  const router = useRouter();
  const [isExternalBrowser, setIsExternalBrowser] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const initializeApp = async () => {
      const isLiffInitialized = await initLiff();
      
      if (isLiffInitialized) {
        if (!isLiffInClient()) {
          setIsExternalBrowser(true);
          return;
        }

        // ถ้าอยู่ใน LINE ให้ตรวจสอบการล็อกอิน
        if (!liff.isLoggedIn()) {
          liff.login();
          return;
        }

        try {
          const idToken = await getLiffIdToken();
          if (idToken) {
            const res = await gasApi.checkStatus(idToken);
            
            if (res.verified) {
              // เซฟข้อมูลลง localStorage สำหรับดึงไปใช้ใน dashboard
              if (res.profileData) {
                localStorage.setItem("memberData", JSON.stringify(res.profileData));
              }
              
              router.push("/dashboard/home");
            } else {
              // ยังไม่ได้ยืนยันตัวตน ให้ไปหน้า register
              router.push("/register");
            }
          } else {
             setErrorMsg("ดึงข้อมูล Token ไม่สำเร็จ กรุณาลองใหม่");
          }
        } catch (error) {
          console.error("Failed to fetch profile or token", error);
          setErrorMsg("ติดต่อเซิร์ฟเวอร์ไม่ได้");
        }
      }
    };
    initializeApp();
  }, [router]);

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

  return (
    <div className="flex h-screen items-center justify-center bg-blue-50">
      <div className="text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mx-auto"></div>
        <p className="mt-4 text-slate-500 font-medium">กำลังตรวจสอบสถานะ...</p>
        {errorMsg && <p className="mt-2 text-red-500 text-sm">{errorMsg}</p>}
      </div>
    </div>
  );
}