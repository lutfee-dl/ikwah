import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Check if it's admin making an edit vs normal user login
    if (body.action === "updateAdminMember") {
      const { memberId, updateData } = body;
      // When inside the server API route, we shouldn't use gasApi to call back into ourselves 
      // via /api/member. We should call GAS directly.
      const gasUrl = process.env.GAS_API_URL || process.env.NEXT_PUBLIC_GAS_URL || "";
      const response = await fetch(gasUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "admin_update_member",
          adminSecret: process.env.NEXT_PUBLIC_ADMIN_SECRET,
          memberId,
          updateData
        }),
      });
      const data = await response.json();
      return NextResponse.json(data);
    }

    if (body.action === "admin_get_members") {
      const gasUrl = process.env.GAS_API_URL || process.env.NEXT_PUBLIC_GAS_URL || "";
      const response = await fetch(gasUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "admin_get_members",
          adminSecret: process.env.NEXT_PUBLIC_ADMIN_SECRET
        }),
      });
      const data = await response.json();
      return NextResponse.json(data);
    }
    
    if (body.action === "admin_update_loan") {
      const { loanId, status } = body;
      const gasUrl = process.env.GAS_API_URL || process.env.NEXT_PUBLIC_GAS_URL || "";
      const response = await fetch(gasUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "admin_update_loan",
          adminSecret: process.env.NEXT_PUBLIC_ADMIN_SECRET,
          loanId,
          status
        }),
      });
      const data = await response.json();
      return NextResponse.json(data);
    }

    if (body.action === "admin_get_loans") {
      const gasUrl = process.env.GAS_API_URL || process.env.NEXT_PUBLIC_GAS_URL || "";
      const response = await fetch(gasUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "admin_get_loans",
          adminSecret: process.env.NEXT_PUBLIC_ADMIN_SECRET
        }),
      });
      const data = await response.json();
      return NextResponse.json(data);
    }
    
    if (body.action === "admin_get_contracts") {
      const gasUrl = process.env.GAS_API_URL || process.env.NEXT_PUBLIC_GAS_URL || "";
      const response = await fetch(gasUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "admin_get_contracts",
          adminSecret: process.env.NEXT_PUBLIC_ADMIN_SECRET
        }),
      });
      const data = await response.json();
      return NextResponse.json(data);
    }

    if (body.action === "admin_get_repayments") {
      const { contractId } = body;
      const gasUrl = process.env.GAS_API_URL || process.env.NEXT_PUBLIC_GAS_URL || "";
      const response = await fetch(gasUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "admin_get_repayments",
          adminSecret: process.env.NEXT_PUBLIC_ADMIN_SECRET,
          contractId
        }),
      });
      const data = await response.json();
      return NextResponse.json(data);
    }

    if (body.action === "admin_add_repayment") {
      const { contractId, lineUserId, amountPaid, installmentNo, slipUrl, status } = body;
      const gasUrl = process.env.GAS_API_URL || process.env.NEXT_PUBLIC_GAS_URL || "";
      const response = await fetch(gasUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          action: "admin_add_repayment",
          adminSecret: process.env.NEXT_PUBLIC_ADMIN_SECRET,
          contractId,
          lineUserId,
          amountPaid,
          installmentNo,
          slipUrl: slipUrl || "",
          status
        }),
      });
      const data = await response.json();
      return NextResponse.json(data);
    }

    // Normal registration path (or other proxy actions)
    // We shouldn't strictly require these if action != 'register'
    if (body.action === "register") {
      const { lineUserId, displayName, pictureUrl } = body;
      if (!lineUserId || !displayName || !pictureUrl) {
        return NextResponse.json(
          { success: false, msg: "Missing required fields" },
          { status: 400 }
        );
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
