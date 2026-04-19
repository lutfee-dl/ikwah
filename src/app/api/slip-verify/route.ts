import { NextResponse } from "next/server";
import jsQR from "jsqr";
import sharp from "sharp";

// ฟังก์ชันถอดรหัส PromptPay EMV QR
function parsePromptPayQR(data: string) {
  let amount = 0;
  let promptPayId = "";
  let currency = "";
  let country = "";
  let ref1 = "";
  let ref2 = "";
  let slipId = "";
  let initiationMethod = "";

  try {
    let i = 0;
    while (i < data.length - 3) {
      const tag = data.substring(i, i + 2);
      const len = parseInt(data.substring(i + 2, i + 4), 10);
      if (isNaN(len) || len < 0) break;
      const value = data.substring(i + 4, i + 4 + len);
      i += 4 + len;

      if (tag === "01") initiationMethod = value === "12" ? "dynamic" : "static";
      if (tag === "53") currency = value === "764" ? "THB" : value;
      if (tag === "54") amount = parseFloat(value) || 0;
      if (tag === "58") country = value;

      // Merchant Account Info (PromptPay ID อยู่ใน subfield 01)
      if (tag === "26" || tag === "29" || tag === "30") {
        let j = 0;
        while (j < value.length - 3) {
          const stag = value.substring(j, j + 2);
          const slen = parseInt(value.substring(j + 2, j + 4), 10);
          if (isNaN(slen)) break;
          const sval = value.substring(j + 4, j + 4 + slen);
          j += 4 + slen;
          if (stag === "01") promptPayId = sval;
        }
      }

      // Additional Data (ref1, ref2, slipId)
      if (tag === "62") {
        let j = 0;
        while (j < value.length - 3) {
          const stag = value.substring(j, j + 2);
          const slen = parseInt(value.substring(j + 2, j + 4), 10);
          if (isNaN(slen)) break;
          const sval = value.substring(j + 4, j + 4 + slen);
          j += 4 + slen;
          if (stag === "01") ref1 = sval;
          if (stag === "02") ref2 = sval;
          if (stag === "05") slipId = sval;
        }
      }
    }
  } catch (_) { /* ignore parse errors */ }

  return { amount, promptPayId, currency, country, ref1, ref2, slipId, initiationMethod };
}

export async function POST(request: Request) {
  const startTime = Date.now();
  try {
    const { imageUrl } = await request.json();

    if (!imageUrl) {
      return NextResponse.json({ success: false, msg: "Missing imageUrl" }, { status: 400 });
    }

    // แปลงลิงก์ Google Drive → Direct link
    let finalUrl = imageUrl;
    if (finalUrl.includes("drive.google.com")) {
      const match = finalUrl.match(/\/d\/([^/]+)/) || finalUrl.match(/[?&]id=([^&]+)/);
      if (match?.[1]) {
        finalUrl = `https://drive.google.com/uc?export=download&id=${match[1]}`;
      }
    }

    // 1. Fetch รูปภาพ
    const imageRes = await fetch(finalUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!imageRes.ok) throw new Error(`Image fetch failed: ${imageRes.status} ${imageRes.statusText}`);

    const arrayBuffer = await imageRes.arrayBuffer();

    // 2. แปลงรูปเป็น raw pixel ด้วย sharp
    const sharpImg = sharp(Buffer.from(arrayBuffer));
    const { width, height } = await sharpImg.metadata();
    const { data } = await sharpImg
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // 3. ใช้ jsQR อ่าน QR code
    const qrResult = jsQR(
      new Uint8ClampedArray(data.buffer),
      width!,
      height!,
      { inversionAttempts: "dontInvert" }
    );

    const elapsed = Date.now() - startTime;

    if (qrResult) {
      const qrData = qrResult.data;
      const { amount, promptPayId, currency, country, ref1, ref2, slipId, initiationMethod } = parsePromptPayQR(qrData);

      return NextResponse.json({
        success: true,
        amount,            // ยอดเงิน (0 = QR ไม่ฝังยอด ให้ user กรอก)
        promptPayId,       // PromptPay ID ปลายทาง (เบอร์/เลขบัตร)
        currency,          // THB
        country,           // TH
        ref1,              // Bill Reference 1 (เลขอ้างอิง)
        ref2,              // Bill Reference 2
        slipId,            // Slip ID / Reference Label
        initiationMethod,  // static / dynamic
        qrRaw: qrData,
        elapsedMs: elapsed,
        method: "qr",
      });
    }

    // 4. ถ้าหา QR ไม่เจอ → ส่งกลับแบบ success=false + rawText ว่าง
    return NextResponse.json({
      success: false,
      amount: 0,
      msg: "ไม่พบ QR Code ในรูปสลิป กรุณาตรวจสอบรูปหรือกรอกยอดเงินด้วยตนเอง",
      elapsedMs: elapsed,
      method: "qr",
    });

  } catch (error: any) {
    console.error("slip-verify error:", error.message);
    return NextResponse.json(
      { success: false, msg: "ประมวลผลไม่สำเร็จ", error: error.message },
      { status: 500 }
    );
  }
}
