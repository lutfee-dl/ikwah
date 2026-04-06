import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // ดึง URL ของ GAS จาก Environment Variable ที่ซ่อนไว้ในเซิร์ฟเวอร์
    const gasUrl = process.env.GAS_API_URL || process.env.NEXT_PUBLIC_GAS_URL;
    
    if (!gasUrl) {
      console.error("GAS_API_URL is missing in environment variables.");
      return NextResponse.json(
        { success: false, msg: "Server configuration error" },
        { status: 500 }
      );
    }

    // 🚀 ส่งข้อมูลต่อไปยัง GAS API โดยที่หน้าบ้าน (Frontend) จะไม่เห็น URL นี้เลย
    const response = await fetch(gasUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error("Proxy API Error:", error);
    return NextResponse.json(
      { success: false, msg: "Internal Server Error" },
      { status: 500 }
    );
  }
}
