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
  lineName?: string;
}

export function useMemberData() {
  const [memberData, setMemberData] = useState<MemberProfile | null>(null);
  const [loans, setLoans] = useState<any[]>([]); // เพิ่ม State สำหรับเก็บข้อมูลสินเชื่อ
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const cachedData = localStorage.getItem("memberDashboardBundle");
        if (cachedData) {
          const parsed = JSON.parse(cachedData);
          setMemberData(parsed.profileData);
          setLoans(parsed.loans || []);
          setIsLoading(false);
        }

        const isLiffOpen = await initLiff();
        if (!isLiffOpen) {
          setError("ไม่สามารถเปิด LIFF ได้");
          return;
        }

        const token = await getLiffIdToken();
        if (!token) {
          setError("ไม่พบ Token");
          if (!cachedData) router.push("/register");
          return;
        }

        // 🚀 เรียกข้อมูลแบบ Bundle (Profile + Loans) ในครั้งเดียว
        const res = await gasApi.getMemberBundle(token);

        if (res.verified && res.profileData) {
          setMemberData(res.profileData);
          setLoans(res.loans || []);
          localStorage.setItem("memberDashboardBundle", JSON.stringify({
            profileData: res.profileData,
            loans: res.loans
          }));
        } else {
          localStorage.removeItem("memberDashboardBundle");
          router.push("/register");
        }

      } catch (err) {
        console.error("fetch member bundle err", err);
        setError("ดึงข้อมูลไม่สำเร็จ");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [router]);

  return { memberData, loans, isLoading, error };
}
