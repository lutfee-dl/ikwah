import admin from "firebase-admin";

const firebaseAdminConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
};

function initializeAdmin() {
  if (!admin.apps.length) {
    if (firebaseAdminConfig.clientEmail && firebaseAdminConfig.privateKey) {
      try {
        admin.initializeApp({
          credential: admin.credential.cert(firebaseAdminConfig as admin.ServiceAccount),
        });
      } catch (error) {
        console.error("❌ Firebase Admin Initialization Error:", error);
      }
    }
  }
  return admin;
}

// เปลี่ยนจากการ export ตัวแปรตรงๆ เป็นการเรียกใช้ผ่าน function เพื่อป้องกัน Error ตอนเริ่มโหลดไฟล์
export const getAdminAuth = () => {
  initializeAdmin();
  return admin.auth();
};

export const getAdminDb = () => {
  initializeAdmin();
  return admin.firestore();
};

export default admin;
