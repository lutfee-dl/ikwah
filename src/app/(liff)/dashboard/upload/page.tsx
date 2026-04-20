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
  const [category, setCategory] = useState("ฝากหุ้นสะสม");
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
    toast.success("คัดลอกเลขบัญชีแล้ว", {
      icon: "📋",
      style: { borderRadius: '15px', fontWeight: 'bold' }
    });
  };

  useEffect(() => {
    const fetchLoans = async () => {
      if (category === "ชำระยอดสินเชื่อ" && profile?.lineUserId) {
        setIsLoadingLoans(true);
        try {
          // Note: In a real app, you might want to call a specific endpoint for member loans 
          // but we'll use getDashboardData which historically should include debt/contract info
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
        // Fallback for testing
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

      // Validate type
      const validTypes = ["image/jpeg", "image/png", "image/webp"];
      if (!validTypes.includes(selectedFile.type)) {
        toast.error("รองรับเฉพาะไฟล์รูปภาพ (JPG, PNG, WEBP) เท่านั้น");
        return;
      }

      // Validate size (5MB)
      if (selectedFile.size > 5 * 1024 * 1024) {
        toast.error("ไฟล์ขนาดใหญ่เกิน 5MB");
        return;
      }

      // RESET Scanner State for new file
      setAiData(null);
      setAmount(undefined);
      setFile(selectedFile);
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);

      // Start AI Scanning (QR + OCR) in background
      processImage(selectedFile, url);
    }
  };

  const processImage = async (selectedFile: File, url: string) => {
    setIsScanning(true);
    setScanProgress({ message: 'วิเคราะห์สลิป...', percent: 0 });
    setAiData(null);

    try {
      // 1. Scan QR Code
      setScanProgress({ message: 'อ่าน QR Code...', percent: 20 });
      const qr = await scanQRCode(selectedFile);

      // 2. Scan OCR (Parallel/Fallback)
      setScanProgress({ message: 'อ่านข้อความจากสลิป...', percent: 40 });
      const ocr = await performOCR(url);

      const finalAiData = {
        qr_data: qr,
        ocr_data: ocr,
        timestamp: new Date().toISOString(),
        method: qr ? 'qr' : 'ocr'
      };

      setAiData(finalAiData);

      // Super Feature: Auto-fill amount if detected and not already entered
      const detectedAmount = parseFloat(qr?.amount || ocr?.amount || "0");
      if (detectedAmount > 0 && (!amount || amount === 0)) {
        setAmount(detectedAmount);
        toast.success(`พบยอดเงิน ฿${detectedAmount.toLocaleString()} ในสลิป`, { icon: '💰' });
      }

      setScanProgress({ message: 'เสร็จสิ้น!', percent: 100 });
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

  const performOCR = async (imageUrl: string): Promise<any | null> => {
    try {
      const result = await Tesseract.recognize(imageUrl, 'tha+eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            const p = Math.round(m.progress * 100);
            setScanProgress({ message: `วิเคราะห์สลิป... ${p}%`, percent: 40 + p * 0.6 });
          }
        },
      });
      return extractSlipInfo(result.data.text);
    } catch (err) {
      console.error('OCR Error:', err);
      return null;
    }
  };

  // --- Accurate Parsing Logic ---
  const parsePromptPayData = (data: string): any | null => {
    try {
      const info: any = { merchantID: '', amount: '', reference: '', billPaymentRef1: '', billPaymentRef2: '' };
      let i = 0;
      while (i < data.length) {
        const tag = data.substring(i, i + 2); i += 2;
        const length = parseInt(data.substring(i, i + 2)); i += 2;
        const value = data.substring(i, i + length); i += length;
        if (tag === '29' && value.length > 0) {
          let j = 0;
          while (j < value.length) {
            const subTag = value.substring(j, j + 2); j += 2;
            const subLength = parseInt(value.substring(j, j + 2)); j += 2;
            const subValue = value.substring(j, j + subLength); j += subLength;
            if (subTag === '01') info.merchantID = formatPromptPayID(subValue);
          }
        }
        if (tag === '54') info.amount = value;
        if (tag === '62' && value.length > 0) {
          let j = 0;
          while (j < value.length) {
            const subTag = value.substring(j, j + 2); j += 2;
            const subLength = parseInt(value.substring(j, j + 2)); j += 2;
            const subValue = value.substring(j, j + subLength); j += subLength;
            if (subTag === '05') info.reference = subValue;
            if (subTag === '01') info.billPaymentRef1 = subValue;
            if (subTag === '02') info.billPaymentRef2 = subValue;
          }
        }
      }
      return info;
    } catch { return null; }
  };

  const formatPromptPayID = (id: string): string => {
    if (id.length === 15 && id.startsWith('00')) return id.substring(2).replace(/(\d{1})(\d{4})(\d{5})(\d{2})(\d{1})/, '$1-$2-$3-$4-$5');
    if (id.length === 13 && id.startsWith('66')) return '0' + id.substring(2).replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
    return id;
  };

  const extractSlipInfo = (text: string): any => {
    const info: any = { amount: null, date: null, time: null, reference: null };
    const cleanText = text.replace(/[^\u0E00-\u0E7Fa-zA-Z0-9\s\.\,\:\-\/\(\)\฿]/g, ' ').replace(/\s+/g, ' ').trim();
    const amountPatterns = [
      /(?:จำนวนเงิน|จ่าย|ยอดเงิน|โอน)[:\s]+([0-9]{1,3}(?:,?[0-9]{3})*\.[0-9]{2})/i,
      /(?:Amount|Total|Pay)[:\s]+([0-9]{1,3}(?:,?[0-9]{3})*\.[0-9]{2})/i,
      /THB[:\s]+([0-9]{1,3}(?:,?[0-9]{3})*\.[0-9]{2})/i,
      /([0-9]{1,3}(?:,?[0-9]{3})*\.[0-9]{2})\s*(?:บาท|Baht)/i,
      /\b([1-9][0-9]{0,2}(?:,?[0-9]{3})*\.[0-9]{2})\b/,
    ];
    for (const pattern of amountPatterns) {
      const match = cleanText.match(pattern);
      if (match) {
        const val = match[1].replace(/,/g, '');
        if (!isNaN(parseFloat(val))) { info.amount = val; break; }
      }
    }
    const refPatterns = [/(?:เลขที่อ้างอิง|Reference|Ref\s*No\.?)[:\s]*([A-Z0-9]{10,})/i, /\b([A-Z]{3}[0-9]{10,})\b/];
    for (const p of refPatterns) { const m = text.match(p); if (m) { info.reference = m[1] || m[0]; break; } }
    return info;
  };

  const toBase64 = (f: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(f);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      toast.error("กรุณาระบุจำนวนเงินให้ถูกต้อง");
      return;
    }
    if (!category) {
      toast.error("กรุณาเลือกหมวดหมู่รายการ");
      return;
    }
    if (category === "ชำระยอดสินเชื่อ" && !selectedLoanId && loans.length > 0) {
      toast.error("กรุณาเลือกบัตรสินเชื่อที่ต้องการชำระ");
      return;
    }
    if (!file) {
      toast.error("กรุณาอัปโหลดรูปภาพสลิปโอนเงิน");
      return;
    }
    if (!profile?.lineUserId) {
      toast.error("ไม่พบข้อมูลผู้ใช้งาน LINE");
      return;
    }

    // --- Confirmation Logic ---
    const result = await Swal.fire({
      title: 'แจ้งโอนเงิน',
      html: `
        <div class="text-left space-y-1.5 px-1 py-1">
          <div class="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <div class="flex justify-between items-center mb-2">
               <span class="text-[9px] font-bold text-slate-400 uppercase">ยอดเงิน</span>
               <span class="text-xl font-black text-sky-600">฿${amount.toLocaleString()}</span>
            </div>
            <div class="flex justify-between items-center">
               <span class="text-[9px] font-bold text-slate-400 uppercase">ประเภท</span>
               <span class="text-[11px] font-bold text-slate-700">${category}</span>
            </div>
            ${category === "ชำระยอดสินเชื่อ" && selectedLoanId ? `
              <div class="flex justify-between items-center mt-1 pt-1 border-t border-slate-200/50">
                <span class="text-[9px] font-bold text-slate-400 uppercase">ID สัญญา</span>
                <span class="text-[10px] font-bold text-violet-600">${selectedLoanId.slice(-6).toUpperCase()}</span>
              </div>
            ` : ""}
          </div>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ยืนยันแจ้งโอน',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#0f172a',
      cancelButtonColor: '#94a3b8',
      reverseButtons: true,
      customClass: {
        popup: 'rounded-[2.5rem]',
        confirmButton: 'rounded-full px-6 py-2.5 font-bold',
        cancelButton: 'rounded-full px-6 py-2.5 font-bold'
      }
    });

    if (!result.isConfirmed) return;

    try {
      setIsSubmitting(true);

      const base64Image = await toBase64(file);
      const base64DataStr = base64Image.split(",")[1];
      const mimeType = file.type;

      let idToken = "";
      if (typeof window !== "undefined" && liff.isLoggedIn()) {
        idToken = liff.getIDToken() || "";
      }

      const payload = {
        action: "member_upload_slip",
        lineUserId: profile.lineUserId,
        name: profile.name,
        amount: Number(amount),
        category: category,
        loanId: category === "ชำระยอดสินเชื่อ" ? selectedLoanId : "",
        filename: file.name,
        mimeType: mimeType,
        fileBase64: base64DataStr,
        idToken: idToken,
        aiData: JSON.stringify(aiData) // Pass findings to backend
      };

      const res = await fetch("/api/member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (data.success) {
        setSuccess(true);
        toast.success("อัปโหลดสลิปเรียบร้อยแล้ว");
      } else {
        Swal.fire({
          title: "อัปโหลดไม่สำเร็จ",
          text: data.msg || "เกิดข้อผิดพลาดในการอัปโหลดสลิป",
          icon: "error",
          confirmButtonColor: "#3b82f6"
        });
      }
    } catch (err) {
      console.error(err);
      toast.error("ไม่สามารถเชื่อมต่อระบบได้");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center animate-in fade-in duration-300">
        <div className="w-20 h-20 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mb-4">
          <CheckCircle2 size={40} />
        </div>
        <h2 className="text-xl font-black text-slate-800 mb-1">แจ้งโอนสำเร็จ!</h2>
        <p className="text-slate-500 text-xs mb-6 max-w-[240px]">
          ส่งข้อมูลเรียบร้อยแล้ว แอดมินจะตรวจสอบยอดในไม่ช้า
        </p>
        <button
          onClick={() => router.push("/dashboard/home")}
          className="bg-slate-900 text-white font-bold px-8 py-3 rounded-full text-sm shadow-lg overflow-hidden"
        >
          กลับหน้าหลัก
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100svh-80px)] max-h-[800px] gap-4 animate-in fade-in duration-500 overflow-hidden">
      {/* HEADER (Compact) */}
      <div className="flex items-center gap-3 shrink-0">
        <button onClick={() => router.back()} className="p-2 bg-white rounded-xl shadow-sm border border-slate-100 text-slate-600 active:scale-90 transition-transform">
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-xl font-black text-slate-800 -tracking-wide">แจ้งโอนเงิน</h1>
      </div>

      {/* 🏦 BANK INFORMATION HEADER (40% Area) */}
      {!previewUrl && (
        <div className="flex-[0.4] min-h-[180px] bg-sky-50 rounded-[2rem] border border-sky-100 p-5 flex flex-col justify-between relative overflow-hidden animate-in slide-in-from-top-4 duration-500">
          <div className="absolute right-[-20px] top-[-20px] text-sky-100/50 rotate-12">
            <CreditCard size={140} />
          </div>

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-4 bg-sky-500 rounded-full" />
              <span className="text-[10px] font-black uppercase tracking-widest text-sky-600/70">ช่องทางการโอนเงิน</span>
            </div>

            <div className="space-y-0.5">
              <p className="text-xs text-slate-400 font-black uppercase tracking-tighter">ธนาคารอิสลามแห่งประเทศไทย</p>
              <div className="flex items-center justify-between">
                <span className="text-1xl font-black tracking-tight text-slate-900 tabular-nums">087-1-20839-3</span>
                <button
                  onClick={() => copyToClipboard("0871208393")}
                  className="p-2.5 bg-white shadow-sm border border-sky-100 text-sky-600 rounded-xl active:scale-90 transition-all"
                >
                  <Copy size={16} />
                </button>
              </div>
            </div>
          </div>

          <div className="relative z-10 pt-3 border-t border-sky-200/50">
            <p className="text-[9px] text-sky-600/50 font-black uppercase tracking-widest mb-0.5">ชื่อบัญชีรับโอน</p>
            <p className="text-xs font-black text-slate-800 leading-[1.3]">
              กองทุนสะสมอิควะห์ยะรัง <br />
              <span className="text-xs font-bold text-slate-400">โดย น.ส.อัฟเสาะห์ กาซอ และ น.ส.มารีนา สาเม็ง</span>
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className={`flex flex-col gap-2 ${!previewUrl ? 'flex-[0.6]' : ''}`}>

        {/* STEP 1: HERO FILE UPLOAD (Micro Tight when preview exists) */}
        <div className={`bg-white p-1 rounded-[1.2rem] shadow-lg shadow-slate-200/50 border border-slate-100 flex-shrink-0 ${!previewUrl ? 'h-full' : 'h-[100px]'}`}>
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`relative w-full h-full min-h-[80px] rounded-[1rem] flex flex-col items-center justify-center cursor-pointer transition-all duration-500 overflow-hidden ${previewUrl
              ? 'bg-slate-900 ring-2 ring-sky-500/10'
              : 'bg-white border-2 border-dashed border-slate-200 hover:bg-slate-50'
              }`}
          >
            {previewUrl ? (
              <>
                <img src={previewUrl} alt="Slip Preview" className="absolute inset-0 w-full h-full object-contain opacity-40 blur-lg scale-110" />
                <img src={previewUrl} alt="Slip Preview" className="relative z-10 max-h-[80px] rounded shadow-2xl border border-white/20 animate-in zoom-in duration-500" />

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
                    <UploadCloud size={14} className="text-sky-500" /> เปลี่ยนรูป
                  </span>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center text-center p-6 space-y-4">
                <div className="w-16 h-16 bg-sky-50 text-sky-500 rounded-2xl flex items-center justify-center shadow-inner">
                  <FileImage size={28} />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-base">แตะเพื่อเลือกรูปสลิป</h3>
                  <p className="text-xs text-slate-400 mt-1 font-medium">ระบบจะแกะข้อมูลยอดเงินให้อัตโนมัติ</p>
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

        {/* STEP 2: REVEAL FIELDS (Only show when file is picked) */}
        {(previewUrl || file) && (
          <div className="space-y-2 animate-in slide-in-from-bottom-10 fade-in duration-700 fill-mode-both pb-2">

            {/* Amount Input */}
            <div className="bg-white p-3 rounded-[1rem] border border-slate-100 flex flex-col shadow-sm">
              <div className="flex justify-between items-center mb-0.5">
                <label className="text-[8px] font-black uppercase tracking-widest text-slate-400">จำนวนเงินโอน</label>
                {aiData && <span className="text-[8px] font-black text-emerald-500 flex items-center gap-1"><CheckCircle2 size={8} /> AI Verified</span>}
              </div>
              <div className="flex items-center gap-1.5 focus-within:translate-x-1 transition-transform">
                <span className="text-xl font-black text-sky-500">฿</span>
                <NumericFormat
                  thousandSeparator={true}
                  inputMode="decimal"
                  value={amount}
                  onValueChange={(values) => setAmount(values.floatValue)}
                  className="w-full bg-transparent text-2xl font-black text-slate-900 focus:outline-none"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Category Select */}
            <div className="bg-white p-3 rounded-[1rem] border border-slate-100 flex flex-col shadow-sm">
              <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-2 text-center">ประเภทรายการ</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCategory("ฝากหุ้นสะสม")}
                  className={`py-2 px-3 rounded-lg font-black text-[10px] transition-all ${category === "ฝากหุ้นสะสม" ? "bg-sky-500 text-white shadow-md active:scale-95" : "bg-slate-50 text-slate-400"}`}
                >
                  ฝากหุ้น
                </button>
                <button
                  type="button"
                  onClick={() => setCategory("ชำระยอดสินเชื่อ")}
                  className={`py-2 px-3 rounded-lg font-black text-[10px] transition-all ${category === "ชำระยอดสินเชื่อ" ? "bg-violet-500 text-white shadow-md active:scale-95" : "bg-slate-50 text-slate-400"}`}
                >
                  ชำระสินเชื่อ
                </button>
              </div>
            </div>

            {/* Smart Loan Selector (If Repayment) */}
            {category === "ชำระยอดสินเชื่อ" && (
              <div className="bg-violet-50/50 p-2.5 rounded-[1rem] border border-violet-100 animate-in fade-in duration-300">
                <label className="block text-[8px] font-black uppercase tracking-widest text-violet-400 mb-1 text-center">สัญญาที่ชำระ</label>
                {isLoadingLoans ? (
                  <div className="flex items-center justify-center py-1 gap-2 text-violet-400 font-bold text-[9px]"><Loader2 size={10} className="animate-spin" /> โหลด...</div>
                ) : (
                  <select
                    value={selectedLoanId}
                    onChange={(e) => setSelectedLoanId(e.target.value)}
                    className="w-full bg-white border border-violet-200 rounded-md py-1.5 px-2 text-[10px] font-black text-slate-800 focus:outline-none shadow-sm"
                  >
                    <option value="">เลือกสัญญา...</option>
                    {loans.map(loan => (
                      <option key={loan.id} value={loan.id}>{loan.loanType} (ยอด: {loan.balance.toLocaleString()})</option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || !file || !amount}
              className={`w-full py-3 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2 shadow-lg ${isSubmitting ? 'bg-slate-900 text-white' :
                !file || !amount ? 'bg-slate-100 text-slate-400 shadow-none' : 'bg-slate-900 text-white active:scale-[0.98] active:bg-black hover:shadow-xl'}`}
            >
              {isSubmitting ? <Loader2 className="animate-spin w-4 h-4" /> : <>ส่งข้อมูลแจ้งโอน <UploadCloud size={16} /></>}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
