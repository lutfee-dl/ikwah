"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { initLiff, getLiffIdToken } from "@/services/liff";
import { gasApi } from "@/services/gasApi";

export interface MemberProfile {
  memberNo: string;
  prefix?: string;
  fullName: string;
  idCard: string;
  phone: string;
  accumulatedShares: number;
  pictureUrl?: string;
  lineName?: string; // เพิ่ม lineName เข้ามาใน profile
}

export function useMemberData() {
  const [memberData, setMemberData] = useState<MemberProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. เช็ค localStorage ก่อนเพื่อความเร็ว (กรณีรีเฟรชหรือเปลี่ยนหน้าใน Dashboard)
        const cachedData = localStorage.getItem("memberData");
        if (cachedData) {
          setMemberData(JSON.parse(cachedData));
          setIsLoading(false);
          // ทำงานต่อเบื้องหลังเพื่ออัพเดตค่าเป็นปัจจุบัน (Revalidate in background)
        }

        // 2. ดึงจาก API ผ่าน GAS อีกครั้งเพื่อความสดใหม่
        const isLiffOpen = await initLiff();
        if (!isLiffOpen) {
           setError("ไม่สามารถเปิด LIFF ได้");
           return;
        }

        const token = await getLiffIdToken();
        if (!token) {
           setError("ไม่พบ Token");
           // ถ้าของเก่าไม่มีในแคชเลย แปลว่าไม่ได้ล็อกอินจริง
           if (!cachedData) router.push("/register");
           return;
        }

        const res = await gasApi.checkStatus(token);
        
        // 3. ยืนยันสำเร็จก็เซฟลงแคชและเข้าอัพเดต State
        if (res.verified && res.profileData) {
          setMemberData(res.profileData);
          localStorage.setItem("memberData", JSON.stringify(res.profileData));
        } else {
          // ไม่พบข้อมูลยืนยันตัวตน เด้งไปสมัครสมาชิก
          localStorage.removeItem("memberData");
          router.push("/register");
        }

      } catch (err) {
        console.error("fetch member err", err);
        setError("ดึงข้อมูลไม่สำเร็จ");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [router]);

  return { memberData, isLoading, error };
}
