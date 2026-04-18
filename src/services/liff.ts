import liff from "@line/liff";

const LIFF_ID = process.env.NEXT_PUBLIC_LIFF_ID || "";

// ฟังก์ชันสำหรับ Initialize LIFF
export const initLiff = async () => {
  try {
    if (!LIFF_ID) {
      console.warn("LIFF_ID is not defined in environment variables");
    }

    await liff.init({ liffId: LIFF_ID });
    
    // ตรวจสอบสถานะการล็อกอิน
    // เอาการบังคับล็อกอินออก ถ้าเกิดว่าเราไม่อยู่ใน Liff หรือ Client 
    // ควรจัดการสิทธิ์การเด้งไป login ที่ระดับหน้า Page ดีกว่า
    
    return true;
  } catch (error) {
    console.error("LIFF Initialization failed", error);
    return false;
  }
};

// ฟังก์ชันสำหรับดึงข้อมูลโปรไฟล์
export const getLiffProfile = async () => {
  try {
    await liff.ready;
    const profile = await liff.getProfile();
    return profile;
  } catch (error) {
    console.error("LIFF getProfile failed", error);
    return null;
  }
};

// ฟังก์ชันสำหรับเช็คว่าเป็น LINE Client หรือไม่
export const isLiffInClient = () => {
  return liff.isInClient();
};

// ฟังก์ชันดึง Token สำหรับส่งไปยืนยันที่ GAS API
export const getLiffIdToken = async () => {
  try {
    await liff.ready;
    return liff.getIDToken();
  } catch (error) {
    console.error("LIFF getIDToken failed", error);
    return null;
  }
};

// ปิดหน้าต่าง LIFF
export const liffCloseWindow = () => {
  if (liff.isInClient()) {
    liff.closeWindow();
  }
};
