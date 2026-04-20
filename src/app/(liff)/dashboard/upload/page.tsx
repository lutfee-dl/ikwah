"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, CheckCircle2, AlertCircle, FileImage, Loader2, ArrowLeft, Copy, CreditCard, ChevronDown } from "lucide-react";
import liff from "@line/liff";
import { gasApi } from "@/services/gasApi";
import toast from "react-hot-toast";
import { NumericFormat } from "react-number-format";
import Swal from "sweetalert2";
import jsQR from "jsqr";
import Tesseract from "tesseract.js";

type ProfileToken = {
  lineUserId: string;
  name: string;
};

type Loan = {
  id: string;
  contractNo: string;
  balance: number;
  loanType: string;
};

export default function UploadSlipPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileToken | null>(null);

  const [amount, setAmount] = useState<number | undefined>(undefined);
  const [category, setCategory] = useState("เงินฝากสะสม");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState({ message: '', percent: 0 });
  const [aiData, setAiData] = useState<any>(null);

  // Loan Management
  const [loans, setLoans] = useState<Loan[]>([]);
  const [selectedLoanId, setSelectedLoanId] = useState<string>("");
  const [isLoadingLoans, setIsLoadingLoans] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("คัดลอกลงคลิปบอร์ดแล้ว", {
      icon: "📋",
      style: { borderRadius: '15px', fontWeight: 'bold' }
    });
  };

  useEffect(() => {
    const fetchLoans = async () => {
      if (category === "ชำระงวดเงินกู้" && profile?.lineUserId) {
        setIsLoadingLoans(true);
        try {
          const res = await gasApi.getDashboardData(profile.lineUserId);
          if (res.success && res.activeLoans) {
            setLoans(res.activeLoans);
          } else if (res.success && res.loans) {
            setLoans(res.loans);
          }
        } catch (err) {
          console.error("Failed to fetch loans", err);
        } finally {
          setIsLoadingLoans(false);
        }
      }
    };
    fetchLoans();
  }, [category, profile?.lineUserId]);

  useEffect(() => {
    const setupLiff = async () => {
      try {
        const { initLiff } = await import("@/services/liff");
        const success = await initLiff();
        if (success) {
          const { getLiffProfile } = await import("@/services/liff");
          const profile = await getLiffProfile();
          if (profile) {
            setProfile({
              lineUserId: profile.userId,
              name: profile.displayName || "Member"
            });
          }
        }
      } catch (e) {
        console.error("LIFF init failed", e);
        const localData = localStorage.getItem("memberData");
        if (localData) {
          const p = JSON.parse(localData);
          setProfile({ lineUserId: p.lineUserId || p.line_user_id || "TEST-USER", name: p.fullName || "Member" });
        }
      }
    };
    setupLiff();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      const validTypes = ["image/jpeg", "image/png", "image/webp"];
      if (!validTypes.includes(selectedFile.type)) {
        toast.error("ไฟล์ไม่รองรับ (JPG, PNG, WEBP) เท่านั้น");
        return;
      }
      if (selectedFile.size > 5 * 1024 * 1024) {
        toast.error("ขนาดไฟล์ห้ามเกิน 5MB");
        return;
      }
      setAiData(null);
      setAmount(undefined);
      setFile(selectedFile);
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
      processImage(selectedFile, url);
    }
  };

  const processImage = async (selectedFile: File, url: string) => {
    setIsScanning(true);
    setScanProgress({ message: 'เริ่มการตรวจสอบ...', percent: 0 });
    setAiData(null);

    try {
      setScanProgress({ message: 'หา QR Code...', percent: 20 });
      const qr = await scanQRCode(selectedFile);

      setScanProgress({
        message: 'วิเคราะห์ข้อมูล...', percent: 40
      });
      const ocr = await performOCR(url);

      const finalAiData = {
        qr_data: qr,
        ocr_data: ocr,
        timestamp: new Date().toISOString(),
        method: qr ? 'qr' : 'ocr'
      };

      setAiData(finalAiData);

      const detectedAmount = parseFloat(qr?.amount || ocr?.amount || "0");
      if (detectedAmount > 0 && (!amount || amount === 0)) {
        setAmount(detectedAmount);
        toast.success(`พบยอดเงิน ฿${detectedAmount.toLocaleString()} ในสลิป`, { icon: '✨' });
      }

      setScanProgress({ message: 'ตรวจสอบเสร็จสิ้น!', percent: 100 });
    } catch (err) {
      console.error("Scanning error:", err);
    } finally {
      setTimeout(() => setIsScanning(false), 500);
    }
  };

  const scanQRCode = (file: File): Promise<any | null> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(null);
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code) {
            resolve(parsePromptPayData(code.data));
          } else {
            resolve(null);
          }
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const parsePromptPayData = (data: string) => {
    // Basic detection for PromptPay QR amount (Tag 54)
    const amountMatch = data.match(/54(\d{2})(\d+\.\d{2})/);
    return amountMatch ? { amount: amountMatch[2], raw: data } : { raw: data };
  };

  const performOCR = async (imgUrl: string) => {
    try {
      const { data: { text } } = await Tesseract.recognize(imgUrl, 'tha+eng');
      // Simple regex to find money amount patterns like 1,234.56
      const moneyMatch = text.match(/(\d{1,3}(,\d{3})*(\.\d{2}))/);
      return {
        amount: moneyMatch ? moneyMatch[1].replace(/,/g, '') : null,
        text
      };
    } catch (err) {
      console.error("OCR Error:", err);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !amount || !profile) return;

    setIsSubmitting(true);
    try {
      const reader = new FileReader();
      const base64Data = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      const [mimeInfo, base64DataStr] = base64Data.split(",");
      const mimeType = mimeInfo.split(":")[1].split(";")[0];

      const payload = {
        action: "member_upload_slip",
        lineUserId: profile.lineUserId,
        name: profile.name,
        amount: Number(amount),
        category: category,
        loanId: category === "ชำระงวดเงินกู้" ? selectedLoanId : "",
        filename: file.name,
        mimeType: mimeType,
        fileBase64: base64DataStr,
        aiData: JSON.stringify(aiData)
      };

      const res = await fetch("/api/member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        setSuccess(true);
        toast.success("ส่งหลักฐานสำเร็จ");
      } else {
        Swal.fire({
          title: "ส่งหลักฐานไม่สำเร็จ",
          text: data.msg || "เกิดข้อผิดพลาดในการส่งหลักฐาน",
          icon: "error",
          confirmButtonColor: "#3b82f6"
        });
      }
    } catch (err) {
      console.error(err);
      toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center animate-in fade-in zoom-in duration-500">
        <div className="w-24 h-24 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-emerald-100">
          <CheckCircle2 size={48} />
        </div>
        <h2 className="text-3xl font-black text-slate-800 mb-2">ส่งหลักฐานเรียบร้อย!</h2>
        <p className="text-slate-500 font-medium mb-8">เราจะตรวจสอบและดำเนินการให้เร็วที่สุด</p>
        <button
          onClick={() => router.push("/dashboard/home")}
          className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-black shadow-lg active:scale-95 transition-all"
        >
          กลับหน้าหลัก
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-full flex flex-col gap-6 animate-in fade-in duration-500">
      {!previewUrl && (
        <div className="flex-[0.4] min-h-[200px] bg-gradient-to-br from-slate-800 to-slate-900 rounded-[2.5rem] p-7 flex flex-col justify-between relative overflow-hidden animate-in slide-in-from-top-4 duration-500 shadow-xl shadow-slate-200">
          <div className="absolute right-[-10%] top-[-10%] opacity-10 rotate-12">
            <CreditCard size={170} />
          </div>

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-4 bg-sky-400 rounded-full" />
              <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">ข้อมูลบัญชีธนาคาร</span>
            </div>

            <div className="space-y-1.5">
              <p className="text-sm text-slate-400 font-bold uppercase tracking-tight opacity-80">กองทุนสวัสดิการสมาชิก</p>
              <div className="flex items-center justify-between">
                <span className="text-3xl font-black tracking-wider text-sky-400 tabular-nums">087-1-20839-3</span>
                <button
                  onClick={() => copyToClipboard("0871208393")}
                  className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl active:scale-95 transition-all border border-white/5 shadow-inner"
                >
                  <Copy size={20} />
                </button>
              </div>
            </div>
          </div>

          <div className="relative z-10 pt-5 border-t border-white/5">
            <p className="text-xs text-slate-500 font-black uppercase tracking-widest mb-1">ชื่อบัญชี</p>
            <p className="text-sm font-bold text-slate-200 leading-relaxed">
              รพ.สมเด็จพระยุพราช ด่านซ้าย <br />
              <span className="text-xs font-medium text-slate-500 italic">โดย น.พ.ภักดี สืบนุการณ์ และ น.พ.พรชัย อมรเกื้อกูล</span>
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className={`flex flex-col gap-4 ${!previewUrl ? 'flex-[0.6]' : 'flex-1 overflow-y-auto pb-6 pr-1'}`}>
        <div className={`bg-white p-2 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 flex-shrink-0 ${!previewUrl ? 'h-full' : 'h-[240px]'}`}>
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`relative w-full h-full min-h-[180px] rounded-[2rem] flex flex-col items-center justify-center cursor-pointer transition-all duration-500 overflow-hidden ${previewUrl
              ? 'bg-slate-900 ring-4 ring-sky-500/10'
              : 'bg-slate-50 border-2 border-dashed border-slate-200 hover:bg-slate-100/50'
              }`}
          >
            {previewUrl ? (
              <>
                <img src={previewUrl} alt="Slip Preview" className="absolute inset-0 w-full h-full object-contain opacity-30 blur-xl scale-125" />
                <img src={previewUrl} alt="Slip Preview" className="relative z-10 max-h-[200px] rounded-xl shadow-2xl border border-white/20 animate-in zoom-in duration-500" />

                {isScanning && (
                  <div className="absolute inset-0 z-30 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-white text-center animate-in fade-in">
                    <Loader2 className="animate-spin w-10 h-10 mb-4 text-sky-400" />
                    <p className="font-black text-lg tracking-wide italic">{scanProgress.message}</p>
                    <div className="w-40 bg-white/10 h-1 rounded-full mt-3 overflow-hidden">
                      <div className="h-full bg-sky-400 transition-all duration-300" style={{ width: `${scanProgress.percent}%` }} />
                    </div>
                  </div>
                )}

                <div className="absolute top-4 right-4 z-20">
                  <span className="bg-white/90 backdrop-blur-md text-slate-800 font-black p-2 rounded-xl shadow-lg flex items-center gap-1 text-[10px] uppercase">
                    <UploadCloud size={14} className="text-sky-500" /> แก้ไขรูปภาพ
                  </span>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center text-center p-6 space-y-4">
                <div className="w-16 h-16 bg-sky-50 text-sky-500 rounded-2xl flex items-center justify-center shadow-inner">
                  <FileImage size={28} />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-base">กดเพื่ออัปโหลดสลิป</h3>
                  <p className="text-xs text-slate-400 mt-1 font-medium">รองรับไฟล์ JPG, PNG และ WEBP</p>
                </div>
                <div className="px-4 py-1.5 bg-slate-900 text-white text-[9px] font-black rounded-full uppercase tracking-widest shadow-lg active:scale-95 transition-transform">
                  Upload Now
                </div>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </div>

        {(previewUrl || file) && (
          <div className="space-y-5 animate-in slide-in-from-bottom-10 fade-in duration-700 fill-mode-both pb-10">
            <div className="bg-white p-7 rounded-[2.5rem] border border-slate-100 flex flex-col shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-center mb-3">
                <label className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">จำนวนเงินฝาก (THB)</label>
                {aiData && (
                  <span className="text-[11px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full flex items-center gap-2">
                    <CheckCircle2 size={12} /> ระบบตรวจสอบอัตโนมัติ
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4">
                <span className="text-4xl font-black text-slate-300">฿</span>
                <NumericFormat
                  thousandSeparator={true}
                  inputMode="decimal"
                  value={amount}
                  onValueChange={(values) => setAmount(values.floatValue)}
                  className="w-full bg-transparent text-5xl font-black text-slate-900 focus:outline-none placeholder:text-slate-100"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="bg-white p-7 rounded-[2.5rem] border border-slate-100 flex flex-col shadow-sm">
              <label className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-5 text-center">เลือกประเภทการทำรายการ</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setCategory("เงินฝากสะสม")}
                  className={`py-5 px-4 rounded-3xl font-black text-sm transition-all flex flex-col items-center gap-3 ${category === "เงินฝากสะสม" ? "bg-sky-500 text-white shadow-xl shadow-sky-200" : "bg-slate-50 text-slate-400 hover:bg-slate-100"}`}
                >
                  <FileImage size={24} />
                  <span>เงินฝากสะสม</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCategory("ชำระงวดเงินกู้")}
                  className={`py-5 px-4 rounded-3xl font-black text-sm transition-all flex flex-col items-center gap-3 ${category === "ชำระงวดเงินกู้" ? "bg-violet-500 text-white shadow-xl shadow-violet-200" : "bg-slate-50 text-slate-400 hover:bg-slate-100"}`}
                >
                  <CreditCard size={24} />
                  <span>ชำระรายงวด</span>
                </button>
              </div>
            </div>

            {category === "ชำระงวดเงินกู้" && (
              <div className="bg-violet-50/40 p-7 rounded-[2.5rem] border border-violet-100 animate-in fade-in duration-300 shadow-inner">
                <label className="block text-[11px] font-black uppercase tracking-widest text-violet-400 mb-4 text-center">เลือกสัญญาที่ต้องการชำระ</label>
                {isLoadingLoans ? (
                  <div className="flex items-center justify-center py-4 gap-3 text-violet-500 font-black">
                    <Loader2 size={20} className="animate-spin" />
                    <span>กำลังโหลดข้อมูลสัญญา...</span>
                  </div>
                ) : (
                  <div className="relative">
                    <select
                      value={selectedLoanId}
                      onChange={(e) => setSelectedLoanId(e.target.value)}
                      className="w-full bg-white border-2 border-violet-100 rounded-2xl py-4 px-5 text-base font-black text-slate-800 focus:outline-none focus:border-violet-500 transition-all appearance-none shadow-sm"
                    >
                      <option value="">เลือกสัญญาจากรายการที่มี...</option>
                      {loans.map(loan => (
                        <option key={loan.id} value={loan.id}>{loan.loanType} (ยอดคงเหลือ: {loan.balance.toLocaleString()})</option>
                      ))}
                    </select>
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-violet-400">
                      <ChevronDown size={24} />
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="pt-2 px-1">
              <button
                type="submit"
                disabled={isSubmitting || !file || !amount}
                className={`w-full py-6 rounded-[2.5rem] font-black text-2xl tracking-wide transition-all flex items-center justify-center gap-4 shadow-2xl relative overflow-hidden group ${isSubmitting ? 'bg-slate-900 text-white' :
                  !file || !amount ? 'bg-slate-100 text-slate-400 shadow-none cursor-not-allowed' :
                    'bg-slate-900 text-white hover:bg-black active:scale-[0.98]'}`}
              >
                {isSubmitting ? <Loader2 className="animate-spin w-8 h-8" /> : <>ยืนยันการทำรายการ <UploadCloud size={30} /></>}
                {!isSubmitting && file && amount && (
                  <div className="absolute inset-0 w-[80px] h-full bg-white/10 skew-x-[-25deg] animate-[shine_2s_infinite] left-[-100%]" />
                )}
              </button>
              <p className="text-center text-[10px] text-slate-400 mt-6 font-black uppercase tracking-[0.4em]">
                Secure Transaction Verified
              </p>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
