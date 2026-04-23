import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // 🛡️ จัดการคำสั่งสำหรับแอดมิน (Admin API Proxy)
    if (body.action && (body.action.startsWith("admin_") || body.action === "updateAdminMember")) {
      const gasUrl = process.env.GAS_API_URL || process.env.NEXT_PUBLIC_GAS_URL || "";

      // แปลงชื่อ Action บางตัวที่หน้าบ้านเรียกต่างจาก GAS (ถ้ามี)
      const gasAction = body.action === "updateAdminMember" ? "admin_update_member" : body.action;

      // สร้าง Payload ใหม่ โดยใช้ ADMIN_SECRET ตัวพิมพ์ใหญ่ตามที่ GAS ต้องการ
      const payload = {
        ...body,
        action: gasAction,
        ADMIN_SECRET: process.env.NEXT_PUBLIC_ADMIN_SECRET || body.ADMIN_SECRET || body.adminSecret
      };

      const response = await fetch(gasUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();

      try {
        const data = JSON.parse(responseText);
        return NextResponse.json(data);
      } catch (e) {
        console.error("Failed to parse GAS response as JSON:", e);
        return NextResponse.json({ success: false, msg: "Invalid JSON from GAS", raw: responseText }, { status: 500 });
      }
    }

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
