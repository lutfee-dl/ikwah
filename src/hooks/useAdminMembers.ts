import { useState, useEffect, useCallback } from "react";
import { Member } from "@/types";
import { gasApi } from "@/services/gasApi";

export const useAdminMembers = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      
      // Fetch both members and shares report in parallel
      const [membersRes, sharesRes] = await Promise.all([
        gasApi.getAdminMembers(),
        (gasApi as any).getAdminSharesReport()
      ]);

      const memberData = membersRes.data || membersRes;
      const sharesData = sharesRes.success ? sharesRes.data : [];

      // Ensure data is an array before calling map
      if (!Array.isArray(memberData)) {
        console.error("Expected array from gasApi.getAdminMembers, got:", membersRes);
        setMembers([]);
        return;
      }

      // Create a map for quick lookup of shares by ID_No
      const sharesMap: Record<string, any> = {};
      if (Array.isArray(sharesData)) {
        sharesData.forEach((s: any) => {
          if (s.ID_No) sharesMap[s.ID_No] = s;
        });
      }

      const mappedMembers = memberData.map((m: any) => {
        const isArr = Array.isArray(m);
        
        // 1. Determine Member ID
        const memberId = isArr 
          ? String(m[0] || "") 
          : String(m.memberId || m.memberNo || m.MemberNo || m.ID_No || m.no || m.ID || m.id || m.member_id || m.MemberID || m.Member_ID || m["รหัสสมาชิก"] || m["รหัส"] || "");
        
        // 2. Lookup shares from the shares report (Calculated from transactions)
        const shareInfo = sharesMap[memberId];
        const calculatedShares = shareInfo ? Number(shareInfo["รวมเงินคงเหลือ"] || shareInfo["รวมยอดทั้งหมด"] || 0) : null;

        return {
          ...(!isArr ? m : {}),
          memberId,
          
          status: (() => {
            const raw = isArr ? String(m[12] || m[10] || "สมาชิก") : String(m.status || m["สถานะ"] || m["สถานะสมาชิก"] || "สมาชิก");
            const s = raw.trim();
            if (s === "ปกติ" || s === "เป็นสมาชิก") return "สมาชิก";
            return s;
          })(),

          fullName: isArr ? String(m[4] || m[2] || "") : String(m.fullName || m["ชื่อ"] || m["ชื่อ-นามสกุล"] || ""),
          idCard: isArr ? String(m[5] || m[3] || "") : String(m.idCard || m["เลขบัตรประชาชน"] || ""),
          phone: isArr ? String(m[6] || m[4] || "") : String(m.phone || m.Phone || m["เบอร์โทรศัพท์"] || ""),
          
          // Explicitly map LINE Identity fields
          lineId: isArr ? String(m[1] || "") : String(m.lineId || m.userId || ""),
          lineName: isArr ? String(m[3] || m[2] || "") : String(m.lineName || m.displayName || ""),
          pictureUrl: isArr ? String(m[2] || "") : String(m.pictureUrl || m.displayPicture || ""),
          
          // Use calculated shares from Shares Report if available, otherwise fallback to member sheet
          accumulatedShares: calculatedShares !== null 
            ? calculatedShares 
            : Number(isArr ? (m[7] || 0) : (m.accumulatedShares || m.totalSaving || m.saving || m.shares || m.totalShares || m["รวมยอดทั้งหมด"] || m["ยอดสะสมรวม"] || 0)),
          
          totalLoanDebt: Number(
            isArr ? (m[8] || 0) : (m.totalLoanDebt || m["หนี้คงเหลือรวม"] || 0)
          ),

          hasActiveLoan: false,
          loanData: null
        };
      }) as Member[];
      
      setMembers(mappedMembers);
    } catch (err: unknown) {
      console.error("fetchMembers Error:", err);
      setError("ไม่สามารถดึงข้อมูลสมาชิกได้");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  return { members, loading, error, refetch: fetchMembers };
};
