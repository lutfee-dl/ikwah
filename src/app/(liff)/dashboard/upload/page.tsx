"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, CheckCircle2, AlertCircle, FileImage, Loader2, ArrowLeft, Copy, Wallet, Building2 } from "lucide-react";

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

export default function UploadSlipPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileToken | null>(null);

  const [amount, setAmount] = useState<number | undefined>(undefined);
  const [category, setCategory] = useState("ฝากหุ้นสะสม");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // AI Scanning State
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState({ message: '', percent: 0 });
  const [aiData, setAiData] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
    if (!file) {
      toast.error("กรุณาอัปโหลดรูปภาพสลิปโอนเงิน");
      return;
    }
    if (!profile?.lineUserId) {
      toast.error("ไม่พบข้อมูลผู้ใช้งาน LINE");
      return;
    }

    // Confirmation Step
    const result = await Swal.fire({
      title: 'ยืนยันแจ้งโอนเงิน?',
      html: `
        <div class="text-left p-2 space-y-2">
          <div class="flex justify-between border-b pb-2">
            <span class="text-gray-500">จำนวนเงิน:</span>
            <span class="font-bold text-emerald-600">฿${Number(amount).toLocaleString()}</span>
          </div>
          <div class="flex justify-between border-b pb-2">
            <span class="text-gray-500">หมวดหมู่:</span>
            <span class="font-bold text-slate-700">${category}</span>
          </div>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ใช่, ยืนยันแจ้งโอน',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#059669',
      cancelButtonColor: '#94a3b8',
      customClass: {
        popup: 'rounded-[1.5rem] p-6',
        title: 'font-black text-slate-800',
        confirmButton: 'rounded-full px-6 py-2 font-bold',
        cancelButton: 'rounded-full px-6 py-2 font-bold'
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
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      <div className="flex items-center gap-3 mb-2">
        <button onClick={() => router.back()} className="p-2 bg-white rounded-full shadow-sm border border-slate-100 text-slate-600 active:scale-90 transition-transform">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-black text-slate-800 -tracking-wide">แจ้งโอนเงิน</h1>
          <p className="text-slate-500 text-sm font-medium">อัปโหลดสลิปเพื่อบันทึกรายการ</p>
        </div>
      </div>

      {/* BANK INFORMATION CARD */}
      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-[2rem] p-6 text-white shadow-xl shadow-emerald-200/50 relative overflow-hidden group">
        {/* Decorative elements */}
        <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-colors" />
        <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-black/10 rounded-full blur-3xl" />

        <div className="relative z-10">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
              <Building2 size={14} className="text-emerald-100" />
              <span className="text-xs font-black uppercase tracking-wider">ช่องทางการชำระเงิน</span>
            </div>
            <Wallet size={24} className="opacity-40" />
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-emerald-100/70 text-[10px] font-bold uppercase tracking-widest mb-1">ธนาคารอิสลาม (สาขา ยะรัง ปัตตานี)</p>
              <div className="flex items-center justify-between group/account">
                <h2 className="text-2xl font-black tracking-wider text-white">087-1-20839-3</h2>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText("087-1-20839-3");
                    toast.success("คัดลอกเลขบัญชีแล้ว");
                  }}
                  className="p-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl transition-all active:scale-90"
                >
                  <Copy size={16} />
                </button>
              </div>
            </div>

            <div className="pt-2 border-t border-white/10">
              <p className="text-emerald-100/70 text-[10px] font-bold uppercase tracking-widest mb-1">ชื่อบัญชี</p>
              <p className="text-sm font-bold leading-relaxed">
                กองทุนสะสมอิควะห์ยะรัง <br />
                <span className="text-emerald-50 text-xs font-medium">โดยน.ส.อัฟเสาะห์ กาซอ และ น.ส.มารีนา สาเม็ง</span>
              </p>
            </div>
          </div>
        </div>
      </div>


      <form onSubmit={handleSubmit} className="space-y-6">

        {/* STEP 1: HERO FILE UPLOAD (Always Visible) */}
        <div className="bg-white p-2 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`relative min-h-[280px] rounded-[2rem] flex flex-col items-center justify-center cursor-pointer transition-all duration-500 overflow-hidden ${previewUrl
              ? 'bg-slate-900 ring-4 ring-sky-500/10'
              : 'bg-slate-50 hover:bg-slate-100 border-2 border-dashed border-slate-200'
              }`}
          >
            {previewUrl ? (
              <>
                <img src={previewUrl} alt="Slip Preview" className="absolute inset-0 w-full h-full object-contain opacity-40 blur-lg scale-125 transition-transform duration-700" />
                <img src={previewUrl} alt="Slip Preview" className="relative z-10 max-h-64 rounded-xl shadow-2xl border border-white/20 animate-in zoom-in duration-500" />

                {isScanning && (
                  <div className="absolute inset-0 z-30 bg-black/70 backdrop-blur-[2px] flex flex-col items-center justify-center p-6 text-white text-center animate-in fade-in">
                    <div className="relative">
                      <Loader2 className="animate-spin w-12 h-12 mb-4 text-sky-400" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                      </div>
                    </div>
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
              <div className="flex flex-col items-center text-center px-6 py-12 space-y-4">
                <div className="w-20 h-20 bg-gradient-to-br from-sky-100 to-blue-50 text-sky-500 rounded-3xl flex items-center justify-center shadow-lg transform rotate-3 hover:rotate-0 transition-transform">
                  <FileImage size={32} />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-lg">แตะเพื่ออัปโหลดสลิป</h3>
                  <p className="text-sm text-slate-400 mt-1 font-medium">ระบบจะช่วยกรอกข้อมูลยอดยอดเงินให้ทันที</p>
                </div>
                <div className="bg-sky-500 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest animate-pulse">
                  แนะนำอัปโหลดเป็นอันดับแรก
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
          <div className="space-y-6 animate-in slide-in-from-top-10 fade-in duration-700 fill-mode-both">

            {/* Amount Input */}
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 relative group transition-all hover:shadow-lg hover:shadow-slate-100">
              <div className="flex justify-between items-center mb-3">
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                  จำนวนเงินตามสลิป
                </label>
                {aiData && (
                  <span className="bg-emerald-50 text-emerald-600 text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 size={10} /> ระบบช่วยกรอกแล้ว
                  </span>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-300 font-light text-4xl">฿</span>
                <NumericFormat
                  thousandSeparator={true}
                  inputMode="decimal"
                  value={amount}
                  onValueChange={(values) => {
                    setAmount(values.floatValue);
                  }}
                  placeholder="0.00"
                  className="w-full bg-transparent border-none rounded-none pl-10 pr-4 py-2 text-4xl sm:text-5xl font-black text-slate-800 focus:outline-none transition-all placeholder:text-slate-100"
                />
              </div>
            </div>

            {/* Category Select */}
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-lg transition-all">
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 text-center">
                เลือกหมวดหมู่รายการ
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label className={`cursor-pointer border-2 rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-all duration-300 ${category === "ฝากหุ้นสะสม" ? "border-sky-500 bg-sky-50/50 shadow-inner" : "border-slate-50 bg-white text-slate-400 hover:bg-slate-50 active:scale-95"}`}>
                  <input type="radio" value="ฝากหุ้นสะสม" checked={category === "ฝากหุ้นสะสม"} onChange={e => setCategory(e.target.value)} className="hidden" />
                  <div className={`w-10 h-10 rounded-xl mb-2 flex items-center justify-center transition-colors ${category === "ฝากหุ้นสะสม" ? "bg-sky-500 text-white shadow-lg shadow-sky-200" : "bg-slate-100"}`}>
                    <FileImage size={20} />
                  </div>
                  <span className={`font-black text-xs ${category === "ฝากหุ้นสะสม" ? "text-sky-700" : ""}`}>ฝากหุ้นสะสม</span>
                </label>
                <label className={`cursor-pointer border-2 rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-all duration-300 ${category === "ชำระยอดสินเชื่อ" ? "border-violet-500 bg-violet-50/50 shadow-inner" : "border-slate-50 bg-white text-slate-400 hover:bg-slate-50 active:scale-95"}`}>
                  <input type="radio" value="ชำระยอดสินเชื่อ" checked={category === "ชำระยอดสินเชื่อ"} onChange={e => setCategory(e.target.value)} className="hidden" />
                  <div className={`w-10 h-10 rounded-xl mb-2 flex items-center justify-center transition-colors ${category === "ชำระยอดสินเชื่อ" ? "bg-violet-500 text-white shadow-lg shadow-violet-200" : "bg-slate-100"}`}>
                    <CheckCircle2 size={20} />
                  </div>
                  <span className={`font-black text-xs ${category === "ชำระยอดสินเชื่อ" ? "text-violet-700" : ""}`}>ชำระสินเชื่อ</span>
                </label>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || !file || !amount}
              className={`w-full py-5 rounded-[2rem] font-black text-xl transition-all flex items-center justify-center gap-3 shadow-2xl relative overflow-hidden group ${isSubmitting ? 'bg-slate-900 text-white cursor-not-allowed' :
                !file || !amount ? 'bg-slate-100 text-slate-400 shadow-none' :
                  'bg-slate-900 text-white hover:bg-black active:scale-[0.98]'
                }`}
            >
              {isSubmitting ? (
                <><Loader2 className="animate-spin w-6 h-6" /> กำลังบันทึกข้อมูล...</>
              ) : (
                <>
                  <span>ยืนยันการแจ้งโอน</span>
                  <UploadCloud className="w-6 h-6 group-hover:translate-y-[-2px] transition-transform" />
                </>
              )}
              {/* Shine effect for active button */}
              {!isSubmitting && file && amount && (
                <div className="absolute inset-0 w-[40px] h-full bg-white/20 skew-x-[-20deg] animate-[shine_2s_infinite] left-[-100%]" />
              )}
            </button>
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
