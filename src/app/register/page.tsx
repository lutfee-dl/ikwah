"use client";
import { useState } from "react";
import { IMaskInput } from "react-imask";
import Swal from "sweetalert2";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function RegisterPage() {
  const router = useRouter();
  
  // mock state สำหรับการพรีวิว (เมื่อทำของจริงจะต้องดึงจาก liff.getProfile())
  const [profileData, _setProfileData] = useState({
    userId: "mock-user-id",
    lineName: "Mock User",
    pictureUrl: "https://lh3.googleusercontent.com/d/1UZwuV3B2SAOv2rCafeY7rne-22I1EulQ",
  });

  /* โค้ดของจริงสำหรับดึงข้อมูล LINE Profile
  useEffect(() => {
    const fetchLineProfile = async () => {
      try {
        await liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID || "YOUR_LIFF_ID" });
        if (liff.isLoggedIn()) {
          const profile = await liff.getProfile();
          _setProfileData({
            userId: profile.userId,
            lineName: profile.displayName,
            pictureUrl: profile.pictureUrl || "",
          });
        }
      } catch (error) {
        console.error("LIFF get profile failed", error);
      }
    };
    fetchLineProfile();
  }, []);
  */

  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState("");
  const [idCard, setIdCard] = useState("");
  const [phone, setPhone] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validation states
  const [isIdValid, setIsIdValid] = useState(false);
  const [isPhoneValid, setIsPhoneValid] = useState(false);

  const validateThaiID = (id: string) => {
    if (id.length !== 13 || !/^\d{13}$/.test(id)) return false;
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(id.charAt(i)) * (13 - i);
    }
    const check = (11 - (sum % 11)) % 10;
    return check === parseInt(id.charAt(12));
  };

  const validateThaiPhone = (phone: string) => {
    return /^0[689]\d{8}$/.test(phone);
  };

  const handleIdAccept = (value: string, mask: { unmaskedValue: string }) => {
    const rawValue = mask.unmaskedValue;
    setIdCard(rawValue);
    setIsIdValid(validateThaiID(rawValue));
  };

  const handlePhoneAccept = (value: string, mask: { unmaskedValue: string }) => {
    const rawValue = mask.unmaskedValue;
    setPhone(rawValue);
    setIsPhoneValid(validateThaiPhone(rawValue));
  };

  const handleVerifyName = async () => {
    if (!fullName.trim()) {
      Swal.fire("แจ้งเตือน", "กรุณากรอกชื่อ-นามสกุล", "warning");
      return;
    }
    setIsVerifying(true);

    // Mock API call
    setTimeout(() => {
      setIsVerifying(false);
      // สมมติว่า verify เลสร็จแล้วผ่าน
      setStep(2);
    }, 1500);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    // Mock API Submit
    setTimeout(() => {
      setIsSubmitting(false);
      Swal.fire({
        icon: "success",
        title: "สำเร็จ!",
        text: "ยืนยันตัวตนสำเร็จแล้ว (Mock)",
      }).then(() => {
        router.push("/dashboard");
      });
    }, 1500);
  };

  return (
    <div className="bg-blue-50 flex items-center justify-center min-h-screen p-4 font-sans">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-xl overflow-hidden p-6 relative">
        
        {step === 1 && (
          <div className="animate-fade-in">
            <div className="text-center mb-4">
              <div className="w-full max-w-[200px] h-24 mx-auto overflow-hidden flex items-center justify-center relative">
                 <Image 
                   src="../LOGO-Ikwah.png" 
                   alt="Logo" 
                   width={200} 
                   height={96} 
                   className="w-full h-full object-contain scale-[1.8] transform origin-center" 
                   unoptimized 
                 />
              </div>
              <div className="mt-2 mb-4">
                <h2 className="text-2xl font-bold text-[#2d3748]">ยืนยันตัวตน</h2>
                <p className="text-gray-400 text-sm mt-1">ยินดีต้อนรับสมาชิกกองทุน</p>
                <p className="text-gray-400 text-sm mt-1 leading-tight">กรุณาระบุชื่อ-นามสกุล ที่ลงทะเบียนไว้</p>
              </div>
            </div>
            <div className="flex flex-col gap-6">
              <div className="relative">
                <label className="text-[11px] font-bold text-blue-600 uppercase tracking-widest ml-1 mb-1 block">ชื่อ - นามสกุล</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="กรอกชื่อ - นามสกุล (ไม่ใส่คำนำหน้า)"
                  className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:bg-white focus:border-blue-500 outline-none transition-all duration-300 text-gray-700 placeholder-gray-300"
                />
              </div>
              <button
                onClick={handleVerifyName}
                disabled={isVerifying}
                className="cursor-pointer w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold py-4 rounded-2xl transition-all duration-200 shadow-md flex items-center justify-center gap-2 disabled:bg-blue-400 disabled:shadow-none"
              >
                {isVerifying ? (
                  <svg className="animate-spin h-5 w-5 mx-auto text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>
                ) : (
                  <>
                    <span>ตรวจสอบข้อมูล</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="animate-fade-in">
            <div className="text-center mb-6">
              {profileData.pictureUrl && (
                <Image 
                  src={profileData.pictureUrl} 
                  alt="Profile" 
                  width={80} 
                  height={80} 
                  className="w-20 h-20 rounded-full mx-auto border-4 border-blue-100 shadow-sm mb-3 object-cover" 
                  unoptimized 
                />
              )}
              <h2 className="text-xl font-bold text-gray-800">กรอกข้อมูลสมาชิก</h2>
              <p className="text-blue-600 font-semibold mt-1">คุณ <span>{fullName}</span></p>
              <p className="text-gray-400 text-sm mt-1 leading-tight">ระบุข้อมูลเพิ่มเติม เพื่อความปลอดภัย</p>
            </div>
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-xs text-gray-500 ml-1 font-semibold">เลขบัตรประชาชน</label>
                <IMaskInput
                  mask="0-0000-00000-00-0"
                  unmask={true}
                  onAccept={handleIdAccept}
                  placeholder="X-XXXX-XXXXX-XX-X"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-gray-700 tracking-tighter"
                />
                {!isIdValid && idCard.length > 0 && idCard.length === 13 && (
                  <p className="text-red-500 text-[10px] mt-1">เลขบัตรประชาชนไม่ถูกต้อง</p>
                )}
              </div>
              <div>
                <label className="text-xs text-gray-500 ml-1 font-semibold">เบอร์โทรศัพท์มือถือ</label>
                <IMaskInput
                  mask="00-0000-0000"
                  unmask={true}
                  onAccept={handlePhoneAccept}
                  placeholder="08-1234-5678"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-gray-700 tracking-widest"
                />
                {!isPhoneValid && phone.length > 0 && phone.length === 10 && (
                  <p className="text-red-500 text-[10px] mt-1">กรุณากรอกเบอร์มือถือที่ถูกต้อง</p>
                )}
              </div>
            </div>
            <button
              onClick={handleSubmit}
              disabled={!(isIdValid && isPhoneValid) || isSubmitting}
              className="cursor-pointer w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3.5 rounded-xl transition shadow-lg shadow-green-500/30 disabled:bg-gray-300 disabled:shadow-none flex items-center justify-center"
            >
               {isSubmitting ? (
                  <svg className="animate-spin h-5 w-5 mx-auto text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>
                ) : "ยืนยันการลงทะเบียน"}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
