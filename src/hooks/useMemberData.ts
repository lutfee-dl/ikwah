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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const cachedData = localStorage.getItem("memberData");
        if (cachedData) {
          setMemberData(JSON.parse(cachedData));
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

        const res = await gasApi.checkStatus(token);

        if (res.verified && res.profileData) {
          setMemberData(res.profileData);
          localStorage.setItem("memberData", JSON.stringify(res.profileData));
        } else {
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

