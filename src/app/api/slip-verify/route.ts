import { NextResponse } from "next/server";
import { createWorker } from "tesseract.js";

export async function POST(request: Request) {
  try {
    const { imageUrl } = await request.json();

    if (!imageUrl) {
      return NextResponse.json({ success: false, msg: "Missing imageUrl" }, { status: 400 });
    }

    let finalUrl = imageUrl;

    // 🔄 แปลงลิงก์ Google Drive ให้เป็น Direct Link ก่อน Fetch
    if (finalUrl.includes("drive.google.com")) {
      const driveMatch = finalUrl.match(/\/d\/([^/]+)/) || finalUrl.match(/[?&]id=([^&]+)/);
      if (driveMatch && driveMatch[1]) {
        finalUrl = `https://lh3.googleusercontent.com/u/0/d/${driveMatch[1]}`;
      }
    }

    // 1. Fetch image
    const response = await fetch(finalUrl);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 2. Perform OCR
    const worker = await createWorker("tha+eng");
    const { data: { text } } = await worker.recognize(buffer);
    await worker.terminate();

    // 3. Parse Amount
    // 🇹🇭 มองหาคำเสี่ยง: "จำนวนเงิน", "Amount", หรือ "เงินโอน"
    // Regex สำหรับหากตัวเลขที่มีจุดทศนิยมและอยู่ในบรรทัดที่มีพวึกคำเหล่านี้
    let amount = 0;
    
    // พัฒนา Regex ให้ฉลาดขึ้น: มองหาตัวเลขที่ตามหลังคำว่าจำนวนเงิน
    const lines = text.split("\n");
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].replace(/,/g, ""); // ลบคอมม่าออกก่อน
        if (line.includes("จำนวนเงิน") || line.toLowerCase().includes("amount")) {
            // หาตัวเลขในบรรทัดนี้หรือบรรทัดถัดไป
            const match = line.match(/\d+\.\d{2}/) || (lines[i+1] && lines[i+1].replace(/,/g, "").match(/\d+\.\d{2}/));
            if (match) {
                amount = parseFloat(match[0]);
                break;
            }
        }
    }

    // fallback: ถ้าหาไม่ได้จริงๆ ให้ลองดึงตัวเลขที่ดูน่าจะเป็นยอดเงินที่สุด (ตัวเลขที่ใหญ่ที่สุดที่เจอมีทศนิยม)
    if (amount === 0) {
        const allMatches = text.replace(/,/g, "").match(/\d+\.\d{2}/g);
        if (allMatches) {
            // มักจะเป็นตัวเลขที่เยอะที่สุดในบรรทัดกลางๆ (เลี่ยงค่าธรรมเนียม 0.00)
            const numbers = allMatches.map(m => parseFloat(m)).filter(n => n > 0);
            if (numbers.length > 0) {
                amount = Math.max(...numbers); // เอาค่าที่มากที่สุดมาเป็นยอดโอน
            }
        }
    }

    return NextResponse.json({
      success: true,
      amount: amount,
      rawText: text, // เก็บไว้ debug
    });

  } catch (error: any) {
    console.error("OCR Error:", error);
    return NextResponse.json({ success: false, msg: "OCR Failed", error: error.message }, { status: 500 });
  }
}
