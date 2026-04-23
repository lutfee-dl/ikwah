"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  UploadCloud,
  CheckCircle2,
  FileImage,
  Loader2,
  ArrowLeft,
  Copy,
  ChevronDown,
  Info,
  AlertTriangle,
  Banknote,
  Wallet
} from "lucide-react";

import liff from "@line/liff";
import NextImage from "next/image";
import toast from "react-hot-toast";
import { NumericFormat } from "react-number-format";
import Swal from "sweetalert2";
import jsQR from "jsqr";
import Tesseract from "tesseract.js";
import { ASSETS } from "@/config";
import { gasApi } from "@/services/gasApi";
import { MemberLoan } from "@/types";

type ProfileToken = {
  lineId: string;
  name: string;
};

// --- Subcomponent to handle search params safely in Suspense ---
function UploadForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchCategory = searchParams.get("category");
  const searchContractId = searchParams.get("contractId");

  const [profile, setProfile] = useState<ProfileToken | null>(null);

  const [amount, setAmount] = useState<number | undefined>(undefined);
  const [category, setCategory] = useState(searchCategory || "ฝากหุ้นสะสม");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Loan State
  const [loans, setLoans] = useState<MemberLoan[]>([]);
  const [selectedContractId, setSelectedContractId] = useState(searchContractId || "");
  const [isLoadingLoans, setIsLoadingLoans] = useState(true);

  // AI Scanning State
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState({ message: '', percent: 0 });
  const [aiData, setAiData] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

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
              lineId: profile.userId,
              name: profile.displayName || "Member"
            });
            fetchLoans();
          }
        }
      } catch (e) {
        console.error("LIFF init failed", e);
        // Fallback for testing
        const localData = localStorage.getItem("memberData");
        if (localData) {
          const p = JSON.parse(localData);
          setProfile({ lineId: p.lineId || p.lineUserId || p.line_user_id || "TEST-USER", name: p.fullName || "Member" });
          fetchLoans();
        }
      }
    };

    const fetchLoans = async () => {
      setIsLoadingLoans(true);
      try {
        const { getLiffIdToken } = await import("@/services/liff");
        const token = await getLiffIdToken();
        if (token) {
          const res = await gasApi.getMemberLoans(token);
          if (res.success) {
            const activeLoans = res.data.filter((l: any) => l.status === "กำลังผ่อน");
            setLoans(activeLoans);
            // If we have loans but no pre-selected contract, select the first one
            if (activeLoans.length > 0 && !searchContractId) {
              setSelectedContractId(activeLoans[0].contractId);
            }
          }
        }
      } catch (err) {
        console.error("Fetch loans err", err);
      } finally {
        setIsLoadingLoans(false);
      }
    };

    setupLiff();
  }, [searchContractId]);

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

      // 🛑 MANDATORY CHECK: If no QR code found, reject the image
      if (!qr) {
        setIsScanning(false);
        await Swal.fire({
          title: "กรุณาอัปโหลดสลิปที่ถูกต้อง",
          text: "โปรดใช้รูปภาพสลิปโอนเงินที่ถูกต้อง",
          icon: "error",
          confirmButtonText: "ตกลง",
          confirmButtonColor: "#ef4444",
          customClass: {
            popup: 'rounded-[1.5rem]',
            confirmButton: 'rounded-full px-8 py-2'
          }
        });

        // Reset states
        setFile(null);
        setPreviewUrl(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      // 2. Scan OCR (Supplementary)
      setScanProgress({ message: 'อ่านข้อความจากสลิป...', percent: 40 });
      const ocr = await performOCR(url);

      const finalAiData = {
        qr_data: qr,
        ocr_data: ocr,
        timestamp: new Date().toISOString(),
        method: 'qr' // Always QR based now
      };

      setAiData(finalAiData);

      // Super Feature: Auto-fill amount from QR (Most accurate)
      const detectedAmount = parseFloat(qr?.amount || ocr?.amount || "0");
      if (detectedAmount > 0 && (!amount || amount === 0)) {
        setAmount(detectedAmount);
        toast.success(`พบยอดเงิน ฿${detectedAmount.toLocaleString()} ในสลิป`, { icon: '💰' });
      }

      setScanProgress({ message: 'เสร็จสิ้น!', percent: 100 });
    } catch (err) {
      console.error("Scanning error:", err);
      toast.error("เกิดข้อผิดพลาดในการวิเคราะห์สลิป");
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
    if (category === "ชำระยอดสินเชื่อ" && !selectedContractId) {
      toast.error("กรุณาเลือกเลขที่สัญญาที่ต้องการชำระ");
      return;
    }
    if (!file) {
      toast.error("กรุณาอัปโหลดรูปภาพสลิปโอนเงิน");
      return;
    }
    if (!profile?.lineId) {
      toast.error("ไม่พบข้อมูลผู้ใช้งาน LINE");
      return;
    }

    // Confirmation Step
    const result = await Swal.fire({
      title: 'ยืนยันการแจ้งโอนเงิน?',
      html: `
        <div class="text-left p-4 space-y-3 bg-slate-50 rounded-2xl border border-slate-100">
          <div class="flex justify-between items-center pb-2 border-b border-slate-200/50">
            <span class="text-[10px] font-black uppercase text-slate-400">จำนวนเงินที่โอน</span>
            <span class="font-black text-xl text-emerald-600">฿${Number(amount).toLocaleString()}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-[10px] font-black uppercase text-slate-400">หมวดหมู่รายการ</span>
            <span class="font-bold text-slate-700">${category}</span>
          </div>
          ${category === 'ชำระยอดสินเชื่อ' ? `
          <div class="flex justify-between items-center">
            <span class="text-[10px] font-black uppercase text-slate-400">เลขที่สัญญา</span>
            <span class="font-bold text-violet-600">${selectedContractId}</span>
          </div>
          ` : ''}
          <p class="text-[10px] text-slate-400 italic text-center mt-2 font-medium">* โปรดตรวจสอบยอดเงินให้ตรงกับสลิปจริง</p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ยืนยันแจ้งโอน',
      cancelButtonText: 'แก้ไข',
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#94a3b8',
      customClass: {
        popup: 'rounded-[2rem] p-6',
        title: 'font-black text-slate-800',
        confirmButton: 'rounded-2xl px-8 py-3 font-bold',
        cancelButton: 'rounded-2xl px-8 py-3 font-bold'
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
        lineId: profile.lineId,
        name: profile.name,
        amount: Number(amount),
        category: category,
        contractId: category === "ชำระยอดสินเชื่อ" ? selectedContractId : "",
        filename: file.name,
        mimeType: mimeType,
        fileBase64: base64DataStr,
        idToken: idToken,
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
      <div className="flex items-center gap-3 mb-2">
        <button onClick={() => router.back()} className="p-2 bg-white rounded-full shadow-sm border border-slate-100 text-slate-600 active:scale-90 transition-transform">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-black text-slate-800 -tracking-wide">แจ้งโอนเงิน</h1>
          <p className="text-slate-500 text-sm font-medium">บันทึกรายการฝากหุ้นหรือชำระสินเชื่อ</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* STEP 1: Select Type */}
        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 transition-all">
          <label className="block text-[10px] font-black uppercase text-slate-400 mb-6 text-center tracking-widest">1. เลือกประเภทรายการ</label>
          <div className="grid grid-cols-2 gap-4">
            <label className={`cursor-pointer border-2 rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-all duration-300 ${category === "ฝากหุ้นสะสม" ? "border-sky-500 bg-sky-50/50 shadow-inner" : "border-slate-50 bg-white text-slate-400 hover:bg-slate-50 active:scale-95"}`}>
              <input type="radio" value="ฝากหุ้นสะสม" checked={category === "ฝากหุ้นสะสม"} onChange={e => setCategory(e.target.value)} className="hidden" />
              <div className={`w-12 h-12 rounded-xl mb-3 flex items-center justify-center transition-colors ${category === "ฝากหุ้นสะสม" ? "bg-sky-500 text-white shadow-lg shadow-sky-200" : "bg-slate-100"}`}>
                <Wallet size={24} />
              </div>
              <span className={`font-black text-sm ${category === "ฝากหุ้นสะสม" ? "text-sky-700" : ""}`}>ฝากหุ้นสะสม</span>
            </label>

            <label className={`relative cursor-pointer border-2 rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-all duration-300 
              ${loans.length === 0 && !isLoadingLoans ? "opacity-40 cursor-not-allowed border-slate-100 bg-slate-50 grayscale" :
                category === "ชำระยอดสินเชื่อ" ? "border-violet-500 bg-violet-50/50 shadow-inner" : "border-slate-50 bg-white text-slate-400 hover:bg-slate-50 active:scale-95"}`}
            >
              <input
                type="radio"
                value="ชำระยอดสินเชื่อ"
                disabled={loans.length === 0 && !isLoadingLoans}
                checked={category === "ชำระยอดสินเชื่อ"}
                onChange={e => setCategory(e.target.value)}
                className="hidden"
              />
              <div className={`w-12 h-12 rounded-xl mb-3 flex items-center justify-center transition-colors ${category === "ชำระยอดสินเชื่อ" ? "bg-violet-500 text-white shadow-lg shadow-violet-200" : "bg-slate-100"}`}>
                <Banknote size={24} />
              </div>
              <span className={`font-black text-sm ${category === "ชำระยอดสินเชื่อ" ? "text-violet-700" : ""}`}>ชำระสินเชื่อ</span>
              {loans.length === 0 && !isLoadingLoans && (
                <div className="absolute -top-2 -right-2 bg-rose-500 text-white p-1 rounded-full shadow-lg">
                  <AlertTriangle size={10} />
                </div>
              )}
            </label>
          </div>

          {/* Loan Picker & Recommendation */}
          {category === "ชำระยอดสินเชื่อ" && (
            <div className="mt-6 pt-6 border-t border-slate-100 space-y-4 animate-in slide-in-from-top-4 duration-500">
              {isLoadingLoans ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="animate-spin text-violet-500 w-5 h-5" />
                </div>
              ) : loans.length > 0 ? (
                <>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-wider">เลือกสัญญาที่ต้องการชำระ</label>
                    <div className="relative group">
                      <select
                        value={selectedContractId}
                        onChange={(e) => setSelectedContractId(e.target.value)}
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 appearance-none focus:outline-none focus:border-violet-500 transition-all font-bold text-slate-700 pr-12"
                      >
                        {loans.map(loan => (
                          <option key={loan.contractId} value={loan.contractId}>
                            {loan.loanType} - #{loan.contractId}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300 group-focus-within:text-violet-500 transition-colors">
                        <ChevronDown size={20} />
                      </div>
                    </div>
                  </div>

                  {/* Payment Hint */}
                  {selectedContractId && (
                    <div className="bg-violet-50 rounded-2xl p-4 border border-violet-100 flex items-start gap-3">
                      <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-violet-500 shadow-sm shrink-0">
                        <Info size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-violet-900">แนะนำยอดชำระงวดนี้</p>
                        <p className="text-[10px] text-violet-700 font-medium">
                          ยอดต่องวดของคุณคือ <span className="font-black text-violet-900">฿{(loans.find(l => l.contractId === selectedContractId)?.installmentAmount || 0).toLocaleString()}</span><br />
                          หรือยอดคงเหลือทั้งหมด <span className="font-black text-violet-900">฿{(loans.find(l => l.contractId === selectedContractId)?.remainingBalance || 0).toLocaleString()}</span>
                        </p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-center text-rose-500 font-bold text-sm py-4">ไม่พบสัญญาเงินกู้ที่สามารถชำระได้</p>
              )}
            </div>
          )}

          {category === "ฝากหุ้นสะสม" && (
            <div className="mt-6 pt-6 border-t border-slate-100 animate-in slide-in-from-top-4 duration-500">
              <div className="bg-sky-50 rounded-2xl p-4 border border-sky-100 flex items-start gap-3">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-sky-500 shadow-sm shrink-0">
                  <Info size={16} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* STEP 2: Bank Info */}
        <div className="space-y-4 animate-in slide-in-from-bottom-6 duration-700 fill-mode-both delay-150">
          <label className="block text-[10px] font-black uppercase text-slate-400 text-center tracking-widest">2. โอนเงินไปยังบัญชี</label>
          <div className="mx-auto bg-slate-900 rounded-[2.5rem] p-6 text-white shadow-xl relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 p-6 opacity-10 scale-150 rotate-12">
              <NextImage src={ASSETS.IMAGES.LOGO_ISLAMIC_BANK} alt="BG" width={100} height={100} />
            </div>

            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center p-1 shadow-lg">
                  <NextImage src={ASSETS.IMAGES.LOGO_ISLAMIC_BANK} alt="Islamic Bank" width={48} height={48} />
                </div>
                <div>
                  <h3 className="font-black text-lg leading-tight">ธนาคารอิสลามแห่งประเทศไทย</h3>
                  <p className="text-sky-400 text-xs font-bold">สาขายะรัง ปัตตานี</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 group">
                  <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-1">เลขที่บัญชี</p>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black tracking-widest">087-1-20839-3</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText("087-1-20839-3");
                        toast.success("คัดลอกเลขบัญชีแล้ว", { icon: '📋' });
                      }}
                      className="p-2.5 bg-white text-slate-900 rounded-xl shadow-lg active:scale-90 transition-transform"
                    >
                      <Copy size={18} />
                    </button>
                  </div>
                </div>
                <div className="px-2">
                  <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-1">ชื่อบัญชี</p>
                  <p className="font-black text-lg">กองทุนสะสมอิควะห์ยะรัง</p>
                  <p className="text-sky-300 text-xs">โดยน.ส.อัฟเสาะห์ กาซอ และ น.ส.มารีนา สาเม็ง</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* STEP 3: Upload Slip */}
        <div className="space-y-4 animate-in slide-in-from-bottom-6 duration-700 fill-mode-both delay-300">
          <label className="block text-[10px] font-black uppercase text-slate-400 text-center tracking-widest">3. อัปโหลดสลิปหลักฐาน</label>

          <div className="bg-white p-2 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`relative min-h-[240px] rounded-[2rem] flex flex-col items-center justify-center cursor-pointer transition-all duration-500 overflow-hidden ${previewUrl
                ? 'bg-slate-900 ring-4 ring-sky-500/10'
                : 'bg-slate-50 hover:bg-slate-100 border-2 border-dashed border-slate-200'
                }`}
            >
              {previewUrl ? (
                <>
                  <img src={previewUrl} alt="Slip Preview" className="absolute inset-0 w-full h-full object-contain opacity-40 blur-lg scale-125 transition-transform duration-700" />
                  <img src={previewUrl} alt="Slip Preview" className="relative z-10 max-h-56 rounded-xl shadow-2xl border border-white/20 animate-in zoom-in duration-500" />
                  {isScanning && (
                    <div className="absolute inset-0 z-30 bg-black/70 backdrop-blur-[2px] flex flex-col items-center justify-center p-6 text-white text-center animate-in fade-in">
                      <Loader2 className="animate-spin w-12 h-12 mb-4 text-sky-400" />
                      <p className="font-black text-lg tracking-wide uppercase italic">{scanProgress.message}</p>
                      <div className="w-full max-w-[180px] bg-white/10 h-1.5 rounded-full mt-4 overflow-hidden border border-white/5">
                        <div className="h-full bg-gradient-to-r from-sky-400 to-blue-500 transition-all duration-300" style={{ width: `${scanProgress.percent}%` }} />
                      </div>
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 bg-black/40 transition-opacity z-20">
                    <span className="bg-white/90 backdrop-blur-md text-slate-800 font-black px-6 py-3 rounded-full text-sm shadow-2xl flex items-center gap-2 transform translate-y-4 hover:translate-y-0 transition-transform">
                      <UploadCloud size={18} className="text-sky-500" /> เปลี่ยนรูปภาพ
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center text-center px-6 py-10 space-y-4">
                  <div className="w-20 h-20 bg-gradient-to-br from-sky-100 to-blue-50 text-sky-500 rounded-3xl flex items-center justify-center shadow-lg transform rotate-3 hover:rotate-0 transition-transform">
                    <FileImage size={32} />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 text-lg">แตะเพื่อเลือกสลิป</h3>
                    <p className="text-sm text-slate-400 mt-1 font-medium italic">ระบบจะดึงยอดเงินจากสลิปให้อัตโนมัติ</p>
                  </div>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileChange} />
            </div>
          </div>
        </div>

        {/* STEP 4: Confirm Amount */}
        {(previewUrl || file) && (
          <div className="space-y-6 animate-in slide-in-from-top-6 fade-in duration-700 fill-mode-both">
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 relative group transition-all hover:shadow-lg hover:shadow-slate-100">
              <label className="block text-xs font-black uppercase text-slate-400 mb-3 text-center tracking-widest">ตรวจสอบยอดเงินที่ตรวจพบ</label>
              <div className="relative flex justify-center">
                <span className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-200 font-light text-3xl">฿</span>
                <NumericFormat
                  thousandSeparator={true}
                  inputMode="decimal"
                  value={amount}
                  onValueChange={(values) => setAmount(values.floatValue)}
                  placeholder="0.00"
                  className="w-full bg-transparent border-none rounded-none text-center py-2 text-5xl font-black text-slate-800 focus:outline-none transition-all placeholder:text-slate-100"
                />
              </div>
              <p className="text-center text-[10px] text-slate-400 font-bold mt-2 uppercase tracking-tighter">* หากยอดไม่ตรง โปรดแก้ไขให้ถูกต้องตามสลิปจริง</p>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting || !file || !amount}
              className={`w-full py-6 rounded-[2rem] font-black text-xl transition-all flex items-center justify-center gap-3 shadow-2xl relative overflow-hidden group ${isSubmitting ? 'bg-slate-900 text-white cursor-not-allowed' :
                !file || !amount ? 'bg-slate-100 text-slate-400 shadow-none' :
                  'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-[0.98]'
                }`}
            >
              {isSubmitting ? (
                <><Loader2 className="animate-spin w-6 h-6" /> กำลังบันทึกข้อมูล...</>
              ) : (
                <><span>ยืนยันแจ้งโอนเงิน</span><CheckCircle2 className="w-6 h-6" /></>
              )}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}

// --- Main Page Export with Suspense Wrapper ---
export default function UploadSlipPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="animate-spin text-sky-500 w-10 h-10" />
        <p className="text-slate-400 font-medium">กำลังเตรียมหน้าแจ้งโอน...</p>
      </div>
    }>
      <UploadForm />
    </Suspense>
  );
}
