import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";

export async function POST(request: Request) {
  try {
    // 🔍 เช็คเบื้องต้นว่าตั้งค่า Admin SDK ครบไหม
    if (!process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
      console.error("Critical: Firebase Admin Environment Variables are missing!");
      return NextResponse.json({
        success: false,
        msg: "เซิร์ฟเวอร์ยังไม่ได้ตั้งค่า Firebase Admin SDK"
      }, { status: 500 });
    }

    const { uid, docId, ADMIN_SECRET } = await request.json();

    // 🛡️ ตรวจสอบ Secret Key เพื่อความปลอดภัย
    if (ADMIN_SECRET !== process.env.NEXT_PUBLIC_ADMIN_SECRET) {
      return NextResponse.json({ success: false, msg: "Unauthorized" }, { status: 401 });
    }

    const adminAuth = getAdminAuth();
    const adminDb = getAdminDb();

    if (!uid || !docId) {
      return NextResponse.json({ success: false, msg: "Missing UID or DocID" }, { status: 400 });
    }

    try {
      await adminAuth.deleteUser(uid);
    } catch (authError: any) {
      if (authError.code === "auth/user-not-found") {
        console.warn("User not found in Firebase Auth, proceeding to delete Firestore doc.");
      } else {
        throw authError;
      }
    }

    await adminDb.collection("system_admins").doc(docId).delete();

    return NextResponse.json({
      success: true,
      msg: "ลบบัญชีแอดมินออกจากระบบเรียบร้อยแล้ว"
    });

  } catch (error: any) {
    console.error("Delete Admin API Error:", error);
    return NextResponse.json({
      success: false,
      msg: "เกิดข้อผิดพลาด: " + (error.message || "Unknown error")
    }, { status: 500 });
  }
}
