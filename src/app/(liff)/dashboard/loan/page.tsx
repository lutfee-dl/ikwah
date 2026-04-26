"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMemberData } from "@/hooks/useMemberData";
import { getLiffIdToken } from "@/services/liff";
import { ArrowLeft, Send, AlertCircle, CheckCircle } from "lucide-react";
import { NumericFormat } from "react-number-format";
import Swal from "sweetalert2";
import { toast } from "react-hot-toast";
import { Skeleton } from "@/components/ui/Skeleton";

const LoanSkeleton = () => (
  <div className="animate-pulse max-w-md mx-auto space-y-6 pt-2">
    <div className="flex items-center gap-4 px-1">
      <Skeleton className="w-10 h-10 rounded-full bg-slate-100" />
      <Skeleton className="h-6 w-32 bg-slate-100" />
    </div>
    <div className="bg-white rounded-4xl p-6 border border-slate-100 shadow-sm space-y-6">
      <Skeleton className="h-20 w-full rounded-2xl bg-slate-50" />
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24 bg-slate-100" />
            <Skeleton className="h-12 w-full rounded-2xl bg-slate-50" />
          </div>
        ))}
      </div>
      <Skeleton className="h-14 w-full rounded-2xl bg-blue-100" />
    </div>
  </div>
);

export default function LoanRequestPage() {
  const router = useRouter();
  const { memberData, isLoading } = useMemberData();

  const [amount, setAmount] = useState("");
  const [itemName, setItemName] = useState("");
  const [duration, setDuration] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [loanType, setLoanType] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!loanType) {
      toast.error("กรุณาเลือกประเภทสินเชื่อ");
      return;
    }

    const amountNum = parseInt(amount);

    if (!amount || amountNum <= 0) {
      toast.error("กรุณาระบุจำนวนเงินให้ถูกต้อง");
      return;
    }

    if (loanType === "ฉุกเฉิน" && amountNum > 10000) {
      toast.error("สินเชื่อฉุกเฉิน ระบุได้ไม่เกิน 10,000 บาท");
      return;
    }
    if (
      (loanType === "ก้อดฮาซัน" || loanType === "ซื้อขาย") &&
      amountNum > 200000
    ) {
      toast.error(`สินเชื่อ${loanType} ระบุได้ไม่เกิน 200,000 บาท`);
      return;
    }

    if (!duration) {
      toast.error("กรุณาเลือกระยะเวลาผ่อนชำระ");
      return;
    }

    if (!itemName) {
      toast.error("กรุณาระบุชื่อรายการหรือวัตถุประสงค์");
      return;
    }

    // --- ✨ SWEETALERT CONFIRMATION ---
    const confirm = await Swal.fire({
      title: "ยืนยันการส่งคำขอ?",
      html: `
        <div class="text-left text-sm space-y-2 py-2">
        <p><b>รายการ:</b> ${itemName}</p>
        <p><b>จำนวนเงิน:</b> ${amountNum.toLocaleString()} บาท</p>
        <p><b>ประเภท:</b> ${loanType}</p>
        <p><b>ระยะเวลา:</b> ${duration} เดือน</p>
        </div>
      `,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "ตกลง ส่งคำขอ",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#2563eb",
      cancelButtonColor: "#64748b",
      customClass: {
        popup: "rounded-3xl",
        confirmButton: "rounded-xl px-6 py-2 content-bold",
        cancelButton: "rounded-xl px-6 py-2"
      }
    });

    if (!confirm.isConfirmed) return;
    // ---------------------------------

    setIsSubmitting(true);
    setErrorMsg("");
    const tid = toast.loading("กำลังส่งข้อมูล...");

    try {
      const token = await getLiffIdToken();
      if (!token) {
        Swal.fire("Session Expired", "เซสชันหมดอายุ กรุณาเข้าแอปใหม่อีกครั้ง", "error");
        toast.dismiss(tid);
        setIsSubmitting(false);
        return;
      }

      const payload = {
        action: "submit_loan",
        idToken: token,
        memberNo: memberData?.memberNo,
        fullName: memberData?.fullName,
        phone: memberData?.phone,
        lineName: memberData?.lineName || "ไม่ระบุ",
        loanType: loanType,
        amount: amountNum,
        duration: parseInt(duration),
        itemName: itemName,
      };

      const res = await fetch("/api/member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        toast.success("บันทึกคำขอสินเชื่อลงระบบเรียบร้อยแล้ว", { id: tid, duration: 4000 });
        setSuccessMsg("ส่งคำขอสำเร็จ");
        setTimeout(() => {
          router.push("/dashboard/home");
        }, 4000);
      } else {
        toast.error(data.msg || "เกิดข้อผิดพลาดในการส่งข้อมูล", { id: tid });
        Swal.fire({
          title: "ทำรายการไม่สำเร็จ",
          text: data.msg || "ระบบไม่สามารถบันทึกข้อมูลได้ในขณะนี้",
          icon: "error",
          confirmButtonColor: "#2563eb"
        });
      }
    } catch {
      Swal.fire("Error", "ไม่สามารถติดต่อเซิร์ฟเวอร์ได้", "error");
      toast.dismiss(tid);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <LoanSkeleton />;

  if (successMsg) {
    return (
      <div className="flex h-[80vh] items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl text-center max-w-sm w-full animate-[fadeIn_0.5s]">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            ส่งคำขอสำเร็จ
          </h2>
          <p className="text-gray-600 text-sm mb-6 leading-relaxed">
            ระบบได้ส่งข้อมูลการขอสินเชื่อเรียบร้อยแล้ว
            <br />
            กรุณารอดำเนินการตรวจสอบและติดต่อไปยังเบอร์{" "}
            <b>{memberData?.phone}</b>
          </p>
          <p className="text-[11px] text-gray-400">กำลังพาคุณกลับหน้าหลัก...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto animate-[fadeIn_0.3s] pb-20 pt-2">
      <div className="flex items-center gap-4 mb-6 px-1">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center text-slate-600 hover:bg-slate-50 transition"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold text-slate-800">ยื่นขอสินเชื่อ</h1>
      </div>

      <div className="bg-white rounded-4xl p-6 shadow-sm border border-slate-100">
        <div className="mb-6 p-4 bg-slate-50 rounded-2xl flex items-center justify-between border border-slate-100 shadow-inner">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center text-blue-600">
              <i className="fas fa-user-circle text-lg"></i>
            </div>
            <div className="text-sm">
              <p className="font-bold text-slate-800 leading-none">{memberData?.fullName}</p>
              <p className="text-[11px] text-slate-500 mt-1">{memberData?.phone}</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest bg-blue-50 px-2 py-1 rounded-md">ยืนยันตัวตนแล้ว</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              ชื่อรายการ / วัตถุประสงค์
            </label>
            <input
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="เช่น ลงทุนทำธุรกิจ ซื้อเครื่องใช้ไฟฟ้า, จัดงานแต่งงานฯลฯ"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition resize-none placeholder:text-slate-300"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              ประเภทสินเชื่อ
            </label>
            <select
              value={loanType}
              onChange={(e) => {
                setLoanType(e.target.value);
                setDuration("");
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none transition custom-select"
              required
            >
              <option value="" disabled>
                -- กรุณาเลือกประเภทสินเชื่อ --
              </option>
              <option value="ฉุกเฉิน">ฉุกเฉิน (ไม่เกิน 10,000 บาท)</option>
              <option value="ก้อดฮาซัน">ก้อดฮาซัน (ไม่เกิน 200,000 บาท)</option>
              <option value="ซื้อขาย">ซื้อขาย (ไม่เกิน 200,000 บาท)</option>
            </select>
            {loanType === "ฉุกเฉิน" && (
              <p className="text-[11px] text-orange-500 mt-1.5 ml-1 leading-snug">
                * มีค่าธรรมเนียมบริการ 30 บาท/สัญญา <br />* ชำระคืนภายใน 3 เดือน
                (ชำระไม่เกินวันที่ 5 ของเดือน)
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              จำนวนเงินที่ต้องการกู้ (บาท)
            </label>
            <NumericFormat
              value={amount}
              thousandSeparator=","
              allowNegative={false}
              inputMode="decimal"
              placeholder="ระบุจำนวนเงิน"
              className={`w-full bg-slate-50 border ${errorMsg &&
                (errorMsg.includes("เกิน") || errorMsg.includes("จำนวนเงิน"))
                ? "border-red-500 focus:ring-red-500/50"
                : "border-slate-200 focus:ring-blue-500/50"
                } rounded-2xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 transition`}
              onValueChange={(values) => {
                const num = values.value;
                setAmount(num);

                if (num) {
                  const number = parseInt(num);
                  if (loanType === "ฉุกเฉิน" && number > 10000) {
                    setErrorMsg("สินเชื่อฉุกเฉิน ระบุได้ไม่เกิน 10,000 บาท");
                  } else if (
                    (loanType === "ก้อดฮาซัน" || loanType === "ซื้อขาย") &&
                    number > 200000
                  ) {
                    setErrorMsg(
                      `สินเชื่อ${loanType} ระบุได้ไม่เกิน 200,000 บาท`,
                    );
                  } else {
                    setErrorMsg("");
                  }
                } else {
                  setErrorMsg("");
                }
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              ระยะเวลาผ่อนชำระ
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none transition custom-select"
              required
              disabled={!loanType}
            >
              <option value="" disabled>
                {loanType
                  ? "-- กรุณาเลือกระยะเวลาผ่อนชำระ --"
                  : "-- โปรดเลือกประเภทสินเชื่อก่อน --"}
              </option>
              {loanType === "ฉุกเฉิน" ? (
                <>
                  <option value="1">1 เดือน</option>
                  <option value="2">2 เดือน</option>
                  <option value="3">3 เดือน</option>
                </>
              ) : (
                <>
                  <option value="3">3 เดือน</option>
                  <option value="6">6 เดือน</option>
                  <option value="9">9 เดือน</option>
                  <option value="12">1 ปี (12 เดือน)</option>
                  <option value="18">1 ปีครึ่ง (18 เดือน)</option>
                  <option value="24">2 ปี (24 เดือน)</option>
                  <option value="30">2 ปีครึ่ง (30 เดือน)</option>
                  <option value="36">3 ปี (36 เดือน)</option>
                </>
              )}
            </select>
          </div>

          {errorMsg && (
            <p className="text-red-500 text-sm text-center font-medium bg-red-50 py-2 rounded-xl">
              {errorMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-2xl py-3.5 font-semibold shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 transition disabled:opacity-70 disabled:cursor-not-allowed mt-4"
          >
            {isSubmitting ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
            ) : (
              <>
                <Send size={18} />
                ส่งคำขอสินเชื่อ
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
