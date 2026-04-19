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

    // 3. ปรับจูนข้อความและค้นหาข้อมูยอดเงิน (Advanced Parsing)
    const cleanText = text 
      .replace(/[^\u0E00-\u0E7Fa-zA-Z0-9\s\.\,\:\-\/\(\)\฿]/g, ' ') 
      .replace(/\s+/g, ' ') 
      .trim(); 

    let amount = 0;
    
    // Amount patterns จากโปรเจกต์อ้างอิง
    const amountPatterns = [ 
      /(?:จำนวนเงิน|จ่าย|ยอดเงิน|โอน|จำนวนเงินทั้งสิ้น)[:\s]+([0-9]{1,3}(?:,?[0-9]{3})*\.[0-9]{2})/i, 
      /(?:Amount|Total|Pay|Net\s*Amount)[:\s]+([0-9]{1,3}(?:,?[0-9]{3})*\.[0-9]{2})/i, 
      /THB[:\s]+([0-9]{1,3}(?:,?[0-9]{3})*\.[0-9]{2})/i, 
      /฿[:\s]*([0-9]{1,3}(?:,?[0-9]{3})*\.[0-9]{2})/, 
      /([0-9]{1,3}(?:,?[0-9]{3})*\.[0-9]{2})\s*(?:บาท|Baht)/i, 
      /\b([1-9][0-9]{0,2}(?:,?[0-9]{3})*\.[0-9]{2})\b/, 
    ]; 

    for (const pattern of amountPatterns) { 
      const match = cleanText.match(pattern); 
      if (match) { 
        const amountStr = match[1].replace(/,/g, ''); 
        const numAmount = parseFloat(amountStr); 
        if (!isNaN(numAmount) && numAmount >= 1) { // ยอดโอนปกติควร >= 1 บาท
          amount = numAmount; 
          break; 
        } 
      } 
    } 

    // fallback: ถ้าหาไม่ได้จริงๆ ให้ลองดึงตัวเลขที่ดูน่าจะเป็นยอดเงินที่สุด (ตัวเลขที่ใหญ่ที่สุดที่เจอมีทศนิยม)
    if (amount === 0) {
        const allMatches = cleanText.replace(/,/g, "").match(/\d+\.\d{2}/g);
        if (allMatches) {
            const numbers = allMatches.map(m => parseFloat(m)).filter(n => n > 0);
            if (numbers.length > 0) {
                amount = Math.max(...numbers); 
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
