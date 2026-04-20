import { NextResponse } from "next/server";
import jsQR from "jsqr";
import sharp from "sharp";
import Tesseract from "tesseract.js";

// --- QR Parsing Logic (from User's Accurate Snippet) ---
function parsePromptPayData(data: string) {
	try {
		const info: any = { merchantID: '', amount: 0, reference: '', billPaymentRef1: '', billPaymentRef2: '', success: true };
		let i = 0;
		while (i < data.length) {
			const tag = data.substring(i, i + 2);
			i += 2;
			const lengthLabel = data.substring(i, i + 2);
			const length = parseInt(lengthLabel);
			if (isNaN(length)) break;
			i += 2;
			const value = data.substring(i, i + length);
			i += length;

			if (tag === '29' && value.length > 0) {
				let j = 0;
				while (j < value.length) {
					const subTag = value.substring(j, j + 2);
					j += 2;
					const subLength = parseInt(value.substring(j, j + 2));
					j += 2;
					const subValue = value.substring(j, j + subLength);
					j += subLength;
					if (subTag === '01') info.merchantID = formatPromptPayID(subValue);
				}
			}
			if (tag === '54') info.amount = parseFloat(value) || 0;
			if (tag === '62' && value.length > 0) {
				let j = 0;
				while (j < value.length) {
					const subTag = value.substring(j, j + 2);
					j += 2;
					const subLength = parseInt(value.substring(j, j + 2));
					j += 2;
					const subValue = value.substring(j, j + subLength);
					j += subLength;
					if (subTag === '05') info.reference = subValue;
					if (subTag === '01') info.billPaymentRef1 = subValue;
					if (subTag === '02') info.billPaymentRef2 = subValue;
				}
			}
		}
		return info;
	} catch { return { success: false, amount: 0 }; }
}

function formatPromptPayID(id: string): string {
	if (id.length === 15 && id.startsWith('00')) return id.substring(2).replace(/(\d{1})(\d{4})(\d{5})(\d{2})(\d{1})/, '$1-$2-$3-$4-$5');
	if (id.length === 13 && id.startsWith('66')) return '0' + id.substring(2).replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
	return id;
}

// --- OCR Extraction Logic (from User's Accurate Snippet) ---
function extractSlipInfo(text: string) {
	const info: any = { amount: null, fee: null, date: null, time: null, reference: null, transactionNo: null, fromAccount: null, toAccount: null, transferType: null, };
	const cleanText = text.replace(/[^\u0E00-\u0E7Fa-zA-Z0-9\s\.\,\:\-\/\(\)\฿]/g, ' ').replace(/\s+/g, ' ').trim();
	
	const amountPatterns = [
		/(?:จำนวนเงิน|จ่าย|ยอดเงิน|โอน)[:\s]+([0-9]{1,3}(?:,?[0-9]{3})*\.[0-9]{2})/i,
		/(?:Amount|Total|Pay)[:\s]+([0-9]{1,3}(?:,?[0-9]{3})*\.[0-9]{2})/i,
		/THB[:\s]+([0-9]{1,3}(?:,?[0-9]{3})*\.[0-9]{2})/i,
		/฿[:\s]*([0-9]{1,3}(?:,?[0-9]{3})*\.[0-9]{2})/,
		/([0-9]{1,3}(?:,?[0-9]{3})*\.[0-9]{2})\s*(?:บาท|Baht)/i,
		/\b([1-9][0-9]{0,2}(?:,?[0-9]{3})*\.[0-9]{2})\b/,
	];
	for (const pattern of amountPatterns) {
		const match = cleanText.match(pattern);
		if (match) {
			const amount = match[1].replace(/,/g, '');
			const numAmount = parseFloat(amount);
			if (!isNaN(numAmount) && numAmount >= 0.01 && numAmount <= 10000000) { info.amount = amount; break; }
		}
	}
	const refPatterns = [ /(?:เลขที่อ้างอิง|หมายเลขอ้างอิง|อ้างอิง|Reference|Ref\s*No\.?|Ref\.?)[:\s]*([A-Z0-9]{10,})/i, /(?:Transaction\s*(?:ID|No|Number))[:\s]*([A-Z0-9]{10,})/i, /\b([A-Z]{3,6}[0-9]{8,})\b/, ];
	for (const pattern of refPatterns) { const match = text.match(pattern); if (match && match[1] && match[1].length >= 10 && match[1].length <= 50) { info.reference = match[1].trim(); break; } }
	
	// Quick date/time patterns
	const dateMatch = text.match(/(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4})/i) || text.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/);
	if (dateMatch) info.date = dateMatch[1];
	const timeMatch = text.match(/(\d{1,2}:\d{2}:\d{2})/);
	if (timeMatch) info.time = timeMatch[1];

	const accountPattern = /\b(\d{3}-?\d{1}-?\d{5}-?\d{1})\b/g;
	const accounts = text.match(accountPattern);
	if (accounts && accounts.length >= 1) { info.fromAccount = accounts[0]; if (accounts.length >= 2) info.toAccount = accounts[1]; }

	return info;
}

export async function POST(request: Request) {
	const startTime = Date.now();
	try {
		const body = await request.json();
		const { imageUrl } = body;
		if (!imageUrl) return NextResponse.json({ success: false, msg: "Missing image URL" }, { status: 400 });

		// 1. Fetch image
		let finalUrl = imageUrl;
		if (finalUrl.includes("drive.google.com")) {
			const match = finalUrl.match(/\/d\/([^/]+)/) || finalUrl.match(/[?&]id=([^&]+)/);
			if (match?.[1]) finalUrl = `https://drive.google.com/uc?export=download&id=${match[1]}`;
		}
		const imageRes = await fetch(finalUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
		if (!imageRes.ok) throw new Error(`Image fetch failed: ${imageRes.status}`);
		const buffer = Buffer.from(await imageRes.arrayBuffer());

		// 2. Try QR Scan First
		const sharpImg = sharp(buffer);
		const { width, height } = await sharpImg.metadata();
		const { data } = await sharpImg.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
		
		const qrResult = jsQR(new Uint8ClampedArray(data.buffer), width!, height!, { inversionAttempts: "dontInvert" });

		let qrData = null;
		if (qrResult) {
			qrData = parsePromptPayData(qrResult.data);
		}

		// 3. Always run OCR if requested or as fallback (Server-side Tesseract)
		// To save time, we only run OCR if QR didn't get an amount or if explicitly needed
		let ocrData = null;
		if (!qrData || !qrData.amount) {
			const { data: { text } } = await Tesseract.recognize(buffer, 'tha+eng');
			ocrData = extractSlipInfo(text);
		}

		return NextResponse.json({
			success: true,
			qr_data: qrData,
			ocr_data: ocrData,
			elapsedMs: Date.now() - startTime,
			method: qrData ? "qr" : "ocr"
		});

	} catch (error: any) {
		console.error("slip-verify error:", error.message);
		return NextResponse.json({ success: false, msg: "ประมวลผลไม่สำเร็จ", error: error.message }, { status: 500 });
	}
}
