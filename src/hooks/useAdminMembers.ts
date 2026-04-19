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
      const data = await gasApi.getAdminMembers();
      
      const mappedMembers = data.map((m: Partial<Member>) => ({
        ...m,
        hasActiveLoan: false,
        loanData: null
      })) as Member[];
      
      setMembers(mappedMembers);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || "ไม่สามารถเชื่อมต่อกับ Server ได้");
      } else {
        setError("ไม่สามารถเชื่อมต่อกับ Server ได้");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  return { members, loading, error, refetch: fetchMembers };
};
