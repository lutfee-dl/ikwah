"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, CheckCircle2, AlertCircle, FileImage, Loader2, ArrowLeft } from "lucide-react";
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
    const refPatterns = [ /(?:เลขที่อ้างอิง|Reference|Ref\s*No\.?)[:\s]*([A-Z0-9]{10,})/i, /\b([A-Z]{3}[0-9]{10,})\b/ ];
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

    try {
      setIsSubmitting(true);
      
      const base64Image = await toBase64(file);
      const base64DataStr = base64Image.split(",")[1]; // remove the prefix 
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
          ส่งข้อมูลของท่านเข้าสู่ระบบเรียบร้อยแล้ว<br/>แอดมินจะดำเนินการตรวจสอบยอดและอัปเดตระบบในไม่ช้า
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
    <div className="space-y-6 pb-20 animate-in fade-in duration-300">
      <div className="flex items-center gap-3 mb-2">
        <button onClick={() => router.back()} className="p-2 bg-white rounded-full shadow-sm border border-slate-100 text-slate-600">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-black text-slate-800 -tracking-wide">แจ้งโอนเงิน</h1>
          <p className="text-slate-500 text-sm font-medium">อัปโหลดสลิปเพื่อบันทึกรายการ</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        
        {/* Amount Input */}
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            จำนวนเงินตามสลิป (บาท)
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">฿</span>
            <NumericFormat
              thousandSeparator={true}
              inputMode="decimal"
              value={amount}
              onValueChange={(values) => {
                setAmount(values.floatValue);
              }}
              placeholder="0.00"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-3 sm:py-4 text-xl sm:text-2xl font-black text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition-all placeholder:text-slate-300 placeholder:font-medium"
            />
          </div>
        </div>

        {/* Category Select */}
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            หมวดหมู่รายการ
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className={`cursor-pointer border-2 rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-all ${category === "ฝากหุ้นสะสม" ? "border-sky-500 bg-sky-50 text-sky-700" : "border-slate-100 bg-white text-slate-500 hover:border-slate-200"}`}>
              <input type="radio" value="ฝากหุ้นสะสม" checked={category === "ฝากหุ้นสะสม"} onChange={e => setCategory(e.target.value)} className="hidden" />
              <CheckCircle2 size={24} className={`mb-2 ${category === "ฝากหุ้นสะสม" ? "text-sky-500" : "text-slate-200"}`} />
              <span className="font-bold text-sm">ฝากหุ้นสะสม</span>
            </label>
            <label className={`cursor-pointer border-2 rounded-2xl p-4 flex flex-col items-center justify-center text-center transition-all ${category === "ชำระยอดสินเชื่อ" ? "border-violet-500 bg-violet-50 text-violet-700" : "border-slate-100 bg-white text-slate-500 hover:border-slate-200"}`}>
              <input type="radio" value="ชำระยอดสินเชื่อ" checked={category === "ชำระยอดสินเชื่อ"} onChange={e => setCategory(e.target.value)} className="hidden" />
              <CheckCircle2 size={24} className={`mb-2 ${category === "ชำระยอดสินเชื่อ" ? "text-violet-500" : "text-slate-200"}`} />
              <span className="font-bold text-sm">ชำระยอดสินเชื่อ</span>
            </label>
          </div>
        </div>

        {/* File Upload */}
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
              แนบสลิปการโอนเงิน
            </label>
            <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold">Max 5MB</span>
          </div>
          
          <div 
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-6 cursor-pointer transition-colors relative overflow-hidden ${previewUrl ? 'border-sky-500 bg-slate-900' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'}`}
          >
            {previewUrl ? (
              <>
                <img src={previewUrl} alt="Slip Preview" className="absolute inset-0 w-full h-full object-contain opacity-50 blur-md scale-110" />
                <img src={previewUrl} alt="Slip Preview" className="relative z-10 max-h-48 rounded-lg shadow-2xl border border-white/20" />
                
                {isScanning && (
                  <div className="absolute inset-0 z-30 bg-black/60 flex flex-col items-center justify-center p-6 text-white text-center">
                    <Loader2 className="animate-spin w-10 h-10 mb-3 text-sky-400" />
                    <p className="font-bold text-sm">{scanProgress.message}</p>
                    <div className="w-full max-w-[150px] bg-white/20 h-1 rounded-full mt-3 overflow-hidden">
                      <div className="h-full bg-sky-400 transition-all duration-300" style={{ width: `${scanProgress.percent}%` }} />
                    </div>
                  </div>
                )}

                <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 bg-black/40 transition-opacity z-20">
                  <span className="bg-white text-slate-800 font-bold px-4 py-2 rounded-full text-sm shadow-xl flex items-center gap-2">
                    <UploadCloud size={16} /> เปลี่ยนรูปภาพ
                  </span>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center text-center space-y-3 py-4">
                <div className="w-14 h-14 bg-sky-100 text-sky-500 rounded-full flex items-center justify-center shadow-sm">
                  <FileImage size={24} />
                </div>
                <div>
                  <p className="font-bold text-slate-700">แทปเพื่อเลือกรูปภาพสลิป</p>
                  <p className="text-xs text-slate-400 mt-1">รองรับ JPG, PNG, WEBP</p>
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

        <button 
          type="submit" 
          disabled={isSubmitting || !file || !amount}
          className={`w-full py-4 rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-2 shadow-xl ${
            isSubmitting ? 'bg-slate-800 text-white shadow-slate-200 cursor-not-allowed' :
            !file || !amount ? 'bg-slate-100 text-slate-400 shadow-none' :
            'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-sky-200/50 hover:opacity-90 active:scale-[0.98]'
          }`}
        >
          {isSubmitting ? (
            <><Loader2 className="animate-spin w-6 h-6" /> กำลังอัปโหลดข้อมูล...</>
          ) : (
            <><UploadCloud className="w-6 h-6" /> ยืนยันการส่งสลิป</>
          )}
        </button>

      </form>
    </div>
  );
}
