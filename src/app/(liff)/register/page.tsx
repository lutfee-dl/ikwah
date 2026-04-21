"use client";
import { useState, useEffect } from "react";
import { IMaskInput } from "react-imask";
import Swal from "sweetalert2";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { gasApi } from "@/services/gasApi";
import { initLiff, getLiffProfile, getLiffIdToken, liffCloseWindow } from "@/services/liff";
import { ASSETS } from "@/config";
import toast from "react-hot-toast";

export default function RegisterPage() {
  const router = useRouter();

  const [profileData, _setProfileData] = useState({
    userId: "",
    lineName: "",
    pictureUrl: "",
    idToken: "",
  });

  useEffect(() => {
    const fetchLineProfile = async () => {
      try {
        await initLiff();
        const profile = await getLiffProfile();
        const token = await getLiffIdToken();

        if (profile && token) {
          _setProfileData({
            userId: profile.userId,
            lineName: profile.displayName,
            pictureUrl: profile.pictureUrl || "",
            idToken: token,
          });
        }
      } catch (error) {
        console.error("LIFF setup failed on register page", error);
      }
    };
    fetchLineProfile();
  }, []);

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

    if (!profileData.idToken) {
      Swal.fire("แจ้งเตือน", "ไม่พบข้อมูลยืนยันตัวตนจาก LINE กรุณาเข้าสู่ระบบใหม่", "error");
      return;
    }

    setIsVerifying(true);
    const tid = toast.loading("กำลังตรวจสอบรายชื่อ...");

    try {
      const res = await gasApi.verifyName(fullName, profileData.idToken);
      setIsVerifying(false);

      if (res.success) {
        toast.success("พบรายชื่อในระบบ", { id: tid });
        setStep(2);
      } else {
        toast.error(res.msg || "ไม่พบรายชื่อในระบบ", { id: tid });
        Swal.fire({
          title: "ไม่พบข้อมูลสมาชิก",
          text: res.msg || "กรุณาตรวจสอบการสะกดชื่อ-นามสกุล หรือติดต่อแอดมินหากคุณเป็นสมาชิกใหม่",
          icon: "error",
          confirmButtonColor: "#2563eb"
        });
      }
    } catch (error) {
      setIsVerifying(false);
      toast.error("การเชื่อมต่อขัดข้อง", { id: tid });
      Swal.fire("ข้อผิดพลาด", "ติดต่อเซิร์ฟเวอร์ไม่ได้", "error");
    }
  };

  const handleSubmit = async () => {
    // --- ✨ SWEETALERT CONFIRMATION ---
    const confirm = await Swal.fire({
      title: "ยืนยันการลงทะเบียน?",
      text: "กรุณาตรวจสอบข้อมูลชื่อ-นามสกุล และเบอร์โทรศัพท์ให้ถูกต้อง",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "ลงทะเบียน",
      cancelButtonText: "แก้ไขข้อมูล",
      confirmButtonColor: "#22c55e",
      cancelButtonColor: "#64748b",
      customClass: {
        popup: "rounded-3xl",
        confirmButton: "rounded-xl px-8 py-2",
        cancelButton: "rounded-xl px-8 py-2"
      }
    });

    if (!confirm.isConfirmed) return;

    setIsSubmitting(true);
    const tid = toast.loading("กำลังบันทึกข้อมูล...");

    // Format ให้มีขีดแบบที่ GAS ต้องการ (17 และ 12 ตัวอักษร)
    const formattedIdCard = idCard.length === 13
      ? `${idCard.slice(0, 1)}-${idCard.slice(1, 4)}-${idCard.slice(4, 9)}-${idCard.slice(9, 12)}-${idCard.slice(12)}`
      : idCard;

    const formattedPhone = phone.length === 10
      ? `${phone.slice(0, 2)}-${phone.slice(2, 6)}-${phone.slice(6)}`
      : phone;

    try {
      const res = await gasApi.register({
        idToken: profileData.idToken,
        fullName,
        idCard: formattedIdCard,
        phone: formattedPhone,
        pictureUrl: profileData.pictureUrl,
        lineName: profileData.lineName,
      });

      setIsSubmitting(false);

      if (res.success) {
        toast.success("ลงทะเบียนสำเร็จ!", { id: tid });
        Swal.fire({
          icon: "success",
          title: "ลงทะเบียนสำเร็จ!",
          text: "ยินดีต้อนรับเข้าใช้งานระบบกองทุนอิควะฮฺ",
          confirmButtonColor: "#22c55e",
          customClass: { popup: "rounded-3xl" }
        }).then(() => {
          liffCloseWindow();
          router.push("/dashboard/home");
        });
      } else {
        toast.error(res.msg || "บันทึกไม่สำเร็จ", { id: tid });
        Swal.fire({
          title: "เกิดข้อผิดพลาด",
          text: res.msg || "ไม่สามารถบันทึกข้อมูลได้",
          icon: "error"
        });
      }
    } catch (error) {
      setIsSubmitting(false);
      toast.error("การเชื่อมต่อขัดข้อง", { id: tid });
      Swal.fire("ข้อผิดพลาด", "บันทึกข้อมูลไม่สำเร็จ", "error");
    }
  };

  return (
    <div className="bg-blue-50 flex items-center justify-center min-h-screen p-4 font-sans">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-xl overflow-hidden p-6 relative">

        {step === 1 && (
          <div className="animate-fade-in">
            <div className="text-center mb-4">
              <div className="w-full max-w-[200px] h-24 mx-auto overflow-hidden flex items-center justify-center relative">
                <Image
                  src={ASSETS.IMAGES.LOGO_IKWAH}
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
          <div id="step2" className="animate-fade-in text-center">
            <div className="mb-6">
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
              <p className="text-blue-600 font-semibold mt-1">คุณ <span id="showName">{fullName}</span></p>
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
