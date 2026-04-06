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
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify(body),
    });

    const responseText = await response.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      console.error("GAS Response parsing error. Raw response:", responseText);
      return NextResponse.json(
        { success: false, msg: "Invalid response from GAS Server", raw: responseText },
        { status: 500 }
      );
    }
    
    return NextResponse.json(data);
    
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("Proxy API Error:", errorMsg);
    return NextResponse.json(
      { success: false, msg: "Internal Server Error", error: errorMsg },
      { status: 500 }
    );
  }
}
