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
      title: 'ยืนยันการทำรายการ',
      html: `
        <div class="text-left space-y-2 p-2">
          <p class="text-slate-500 text-sm">ตรวจสอบความถูกต้องก่อนบันทึกระบบ</p>
          <div class="bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <p class="text-xs font-bold text-slate-400 uppercase">ยอดโอน</p>
            <p class="text-2xl font-black text-sky-600">฿${amount.toLocaleString()}</p>
            <p class="text-xs font-bold text-slate-400 uppercase mt-3">หมวดหมู่</p>
            <p class="text-sm font-bold text-slate-700">${category}</p>
            ${category === "ชำระยอดสินเชื่อ" && selectedLoanId ? `
              <p class="text-xs font-bold text-slate-400 uppercase mt-3">จากสัญญา</p>
              <p class="text-sm font-bold text-violet-700 text-xs">ID: ${selectedLoanId}</p>
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
      <div className="flex flex-col items-center justify-center py-12 text-center animate-in fade-in zoom-in duration-300">
        <div className="w-24 h-24 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 size={48} />
        </div>
        <h2 className="text-2xl font-black text-slate-800 mb-2">อัปโหลดสลิปสำเร็จ!</h2>
        <p className="text-slate-500 mb-8 max-w-[280px]">
          ส่งข้อมูลของท่านเข้าสู่ระบบเรียบร้อยแล้ว<br />แอดมินจะดำเนินการตรวจสอบยอดและอัปเดตระบบในไม่ช้า
        </p>
        <button
          onClick={() => router.push("/dashboard/home")}
          className="bg-slate-900 text-white font-bold px-8 py-3 rounded-full hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200"
        >
          กลับหน้าหลัก
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 text-slate-600 active:scale-90 transition-transform">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-3xl font-black text-slate-800 -tracking-wide">แจ้งโอนเงิน</h1>
            <p className="text-slate-500 text-base font-medium">บันทึกรายการฝากและชำระเงิน</p>
          </div>
        </div>
      </div>

      {/* 🏦 BANK INFORMATION HEADER */}
      {!previewUrl && (
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-[2.5rem] shadow-2xl shadow-slate-200 text-white relative overflow-hidden animate-in slide-in-from-top-4 duration-500">
          <div className="absolute right-[-10%] top-[-10%] opacity-10 rotate-12">
            <CreditCard size={180} />
          </div>
          
          <div className="relative z-10 space-y-5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">ช่องทางการโอนเงิน</span>
            </div>
            
            <div className="space-y-1">
              <p className="text-xs text-slate-400 font-bold uppercase">ธนาคารอิสลามแห่งประเทศไทย</p>
              <div className="flex items-center justify-between group">
                <span className="text-3xl font-black tracking-wider text-sky-400">087-1-20839-3</span>
                <button 
                  onClick={() => copyToClipboard("0871208393")}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all active:scale-95"
                  title="Copy account number"
                >
                  <Copy size={18} />
                </button>
              </div>
            </div>

            <div className="pt-2 border-t border-white/5 space-y-1">
               <p className="text-[10px] text-slate-500 font-bold uppercase">ชื่อบัญชี</p>
               <p className="text-xs font-bold leading-relaxed text-slate-300">
                 กองทุนสะสมอิควะห์ยะรัง<br/>
                 <span className="text-[10px] font-medium opacity-60">โดย น.ส.อัฟเสาะห์ กาซอ และ น.ส.มารีนา สาเม็ง</span>
               </p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">

        {/* STEP 1: HERO FILE UPLOAD (Always Visible) */}
        <div className="bg-white p-3 rounded-[3rem] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`relative min-h-[300px] rounded-[2.5rem] flex flex-col items-center justify-center cursor-pointer transition-all duration-500 overflow-hidden ${previewUrl
              ? 'bg-slate-900 ring-8 ring-sky-500/5'
              : 'bg-slate-50 hover:bg-slate-100 border-2 border-dashed border-slate-200'
              }`}
          >
            {previewUrl ? (
              <>
                <img src={previewUrl} alt="Slip Preview" className="absolute inset-0 w-full h-full object-contain opacity-30 blur-xl scale-125 transition-transform duration-700" />
                <img src={previewUrl} alt="Slip Preview" className="relative z-10 max-h-80 rounded-2xl shadow-2xl border border-white/20 animate-in zoom-in duration-500" />

                {isScanning && (
                  <div className="absolute inset-0 z-30 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-8 text-white text-center animate-in fade-in">
                    <Loader2 className="animate-spin w-16 h-16 mb-6 text-sky-400" />
                    <p className="font-black text-2xl tracking-wide uppercase italic">{scanProgress.message}</p>
                    <div className="w-full max-w-[200px] bg-white/10 h-2 rounded-full mt-6 overflow-hidden border border-white/5">
                      <div className="h-full bg-gradient-to-r from-sky-400 to-blue-500 transition-all duration-300" style={{ width: `${scanProgress.percent}%` }} />
                    </div>
                  </div>
                )}

                <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 bg-black/50 transition-opacity z-20">
                  <span className="bg-white text-slate-800 font-black px-8 py-4 rounded-full text-base shadow-2xl flex items-center gap-3 transform translate-y-4 hover:translate-y-0 transition-transform">
                    <UploadCloud size={24} className="text-sky-500" /> เปลี่ยนรูปสลิป
                  </span>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center text-center px-8 py-14 space-y-6">
                <div className="w-24 h-24 bg-gradient-to-br from-sky-100 to-blue-50 text-sky-500 rounded-[2rem] flex items-center justify-center shadow-lg transform rotate-6 hover:rotate-0 transition-all">
                  <FileImage size={40} />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-2xl mb-1">แตะเพื่ออัปโหลดสลิป</h3>
                  <p className="text-base text-slate-400 font-medium">ระบบจะวิเคราะห์และกรอกข้อมูลให้ทันที</p>
                </div>
                <div className="flex gap-2">
                  <span className="bg-sky-500 text-white text-[11px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest animate-pulse shadow-lg shadow-sky-200">
                    AI Verified Ready
                  </span>
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
          <div className="space-y-8 animate-in slide-in-from-top-10 fade-in duration-700 fill-mode-both px-2">

            {/* Amount Input */}
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 relative group transition-all hover:shadow-xl hover:shadow-slate-100">
              <div className="flex justify-between items-center mb-4">
                <label className="block text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">
                  จำนวนเงินโอน (THB)
                </label>
                {aiData && (
                  <span className="bg-emerald-50 text-emerald-600 text-[10px] font-black px-3 py-1 rounded-full flex items-center gap-1.5 animate-bounce">
                    <CheckCircle2 size={12} /> สแกนอัตโนมัติแล้ว
                  </span>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-200 font-bold text-5xl">฿</span>
                <NumericFormat
                  thousandSeparator={true}
                  inputMode="decimal"
                  value={amount}
                  onValueChange={(values) => {
                    setAmount(values.floatValue);
                  }}
                  placeholder="0.00"
                  className="w-full bg-transparent border-none rounded-none pl-12 pr-4 py-4 text-5xl sm:text-6xl font-black text-slate-800 focus:outline-none transition-all placeholder:text-slate-50"
                />
              </div>
              <div className="h-0.5 w-full bg-slate-50 mt-2 group-focus-within:bg-sky-500 transition-colors" />
            </div>

            {/* Category Select */}
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 hover:shadow-xl transition-all">
              <label className="block text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 mb-6 text-center">
                ประเภทการโอนเงิน
              </label>
              <div className="grid grid-cols-2 gap-5">
                <label className={`cursor-pointer border-2 rounded-3xl p-6 flex flex-col items-center justify-center text-center transition-all duration-300 ${category === "ฝากหุ้นสะสม" ? "border-sky-500 bg-sky-50/50 shadow-inner scale-105" : "border-slate-50 bg-white text-slate-400 hover:bg-slate-50 active:scale-95"}`}>
                  <input type="radio" value="ฝากหุ้นสะสม" checked={category === "ฝากหุ้นสะสม"} onChange={e => setCategory(e.target.value)} className="hidden" />
                  <div className={`w-14 h-14 rounded-2xl mb-3 flex items-center justify-center transition-all ${category === "ฝากหุ้นสะสม" ? "bg-sky-500 text-white shadow-xl shadow-sky-200" : "bg-slate-100"}`}>
                    <FileImage size={28} />
                  </div>
                  <span className={`font-black text-sm ${category === "ฝากหุ้นสะสม" ? "text-sky-700" : ""}`}>ฝากหุ้นสะสม</span>
                </label>
                <label className={`cursor-pointer border-2 rounded-3xl p-6 flex flex-col items-center justify-center text-center transition-all duration-300 ${category === "ชำระยอดสินเชื่อ" ? "border-violet-500 bg-violet-50/50 shadow-inner scale-105" : "border-slate-50 bg-white text-slate-400 hover:bg-slate-50 active:scale-95"}`}>
                  <input type="radio" value="ชำระยอดสินเชื่อ" checked={category === "ชำระยอดสินเชื่อ"} onChange={e => setCategory(e.target.value)} className="hidden" />
                  <div className={`w-14 h-14 rounded-2xl mb-3 flex items-center justify-center transition-all ${category === "ชำระยอดสินเชื่อ" ? "bg-violet-500 text-white shadow-xl shadow-violet-200" : "bg-slate-100"}`}>
                    <CreditCard size={28} />
                  </div>
                  <span className={`font-black text-sm ${category === "ชำระยอดสินเชื่อ" ? "text-violet-700" : ""}`}>ชำระสินเชื่อ</span>
                </label>
              </div>
            </div>

            {/* Smart Loan Selector (If Repayment) */}
            {category === "ชำระยอดสินเชื่อ" && (
              <div className="bg-violet-50/30 p-8 rounded-[2.5rem] border border-violet-100 shadow-sm animate-in slide-in-from-bottom-4 duration-500">
                <label className="block text-[11px] font-black uppercase tracking-[0.3em] text-violet-400 mb-4 text-center">
                  ระบุสัญญาที่ต้องการชำระ
                </label>
                
                {isLoadingLoans ? (
                  <div className="flex items-center justify-center py-6 gap-3 text-violet-500 font-bold">
                    <Loader2 size={24} className="animate-spin" />
                    <span>กำลังโหลดข้อมูลสัญญา...</span>
                  </div>
                ) : loans.length > 0 ? (
                  <div className="relative">
                    <select
                      value={selectedLoanId}
                      onChange={(e) => setSelectedLoanId(e.target.value)}
                      className="w-full bg-white border-2 border-violet-100 rounded-2xl py-4 px-5 text-lg font-black text-slate-800 appearance-none focus:outline-none focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 shadow-sm transition-all"
                    >
                      <option value="">เลือกสัญญาจากรายการ...</option>
                      {loans.map((loan) => (
                        <option key={loan.id} value={loan.id}>
                          {loan.loanType} - ID: {loan.id.slice(-6).toUpperCase()}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-violet-300">
                       <ChevronDown size={24} />
                    </div>
                    {selectedLoanId && (
                      <div className="mt-4 p-4 bg-white rounded-2xl border border-violet-100 text-slate-600 flex justify-between items-center animate-in fade-in">
                          <span className="text-xs font-bold uppercase tracking-wider opacity-60">ยอดคงเหลือ</span>
                          <span className="font-black text-violet-600">
                             ฿{loans.find(l => l.id === selectedLoanId)?.balance.toLocaleString()}
                          </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6 bg-white rounded-2xl border border-violet-100">
                     <AlertCircle size={32} className="mx-auto text-amber-500 mb-2" />
                     <p className="text-sm font-bold text-slate-600">ไม่พบคอนแทคสัญญาที่ยังมียอดค้าง</p>
                     <p className="text-[10px] text-slate-400 mt-1 uppercase font-black">Contract Not Found</p>
                  </div>
                )}
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-4 px-2">
              <button
                type="submit"
                disabled={isSubmitting || !file || !amount}
                className={`w-full py-6 rounded-[2.5rem] font-black text-2xl tracking-wide transition-all flex items-center justify-center gap-4 shadow-2xl relative overflow-hidden group ${isSubmitting ? 'bg-slate-900 text-white cursor-not-allowed' :
                  !file || !amount ? 'bg-slate-100 text-slate-400 shadow-none' :
                    'bg-slate-900 text-white hover:bg-black active:scale-[0.97]'
                  }`}
              >
                {isSubmitting ? (
                  <><Loader2 className="animate-spin w-8 h-8" /> กำลังบันทึกข้อมูล...</>
                ) : (
                  <>
                    <span>ยืนยันแจ้งโอน</span>
                    <UploadCloud className="w-8 h-8 group-hover:translate-y-[-4px] transition-transform" />
                  </>
                )}
                {/* Premium Shine Effect */}
                {!isSubmitting && file && amount && (
                  <div className="absolute inset-0 w-[60px] h-full bg-white/20 skew-x-[-25deg] animate-[shine_2s_infinite] left-[-100%]" />
                )}
              </button>
              <p className="text-center text-[10px] text-slate-400 mt-6 font-black uppercase tracking-[0.4em]">
                Secure Transaction Verified
              </p>
            </div>
          </div>
        )}

      </form>

      <style jsx>{`
        @keyframes shine {
          100% { left: 200%; }
        }
      `}</style>
    </div>
  );
}
