"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { initLiff, getLiffProfile, isLiffInClient } from "@/services/liff";
import { AlertCircle } from "lucide-react";
// import { gasApi } from "@/services/gasApi"; // TODO: เปิดใช้เมื่อมี GAS API

export default function RootPage() {
  const router = useRouter();
  const [isExternalBrowser, setIsExternalBrowser] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      const isLiffInitialized = await initLiff();
      
      if (isLiffInitialized) {
        if (!isLiffInClient()) {
          setIsExternalBrowser(true);
          return;
        }

        try {
          const profile = await getLiffProfile();
          if (profile) {
            // TODO: เรียกใช้ API ของจริง
            // const res = await gasApi.checkStatus(profile.userId);
            // if (res.success && res.data?.verified) {
            //   router.push("/dashboard");
            // } else {
            //   router.push("/register");
            // }

            // ชั่วคราวไปที่สมัครสมาชิก
            router.push("/register");
          }
        } catch (error) {
          console.error("Failed to fetch profile", error);
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
        <p className="mt-4 text-slate-500 font-medium">กำลังตรวจสอบข้อมูล...</p>
      </div>
    </div>
  );
}