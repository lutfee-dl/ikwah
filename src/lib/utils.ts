/**
 * รวมฟังก์ชัน Utility ต่างๆ สำหรับระบบ
 */

/**
 * จัดรูปแบบวันที่ให้เป็นแบบไทย (วว/ดด/ปปปป)
 */
export const formatDate = (dateStr: string | Date | null | undefined) => {
  if (!dateStr) return "-";
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return String(dateStr);
    return new Intl.DateTimeFormat("th-TH", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);
  } catch (e) {
    return String(dateStr);
  }
};

/**
 * จัดรูปแบบวันเวลาให้เป็นแบบไทย (วว/ดด/ปปปป 00:00:00)
 */
export const formatDateTime = (dateStr: string | Date | null | undefined) => {
  if (!dateStr) return "-";
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return String(dateStr);
    return new Intl.DateTimeFormat("th-TH", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(date);
  } catch (e) {
    return String(dateStr);
  }
};

/**
 * จัดรูปแบบเวลา (00:00)
 */
export const formatTime = (dateStr: string | Date | null | undefined) => {
  if (!dateStr) return "-";
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);
  } catch (e) {
    return "";
  }
};

/**
 * จัดรูปแบบตัวเลขเงิน
 */
export const formatCurrency = (amount: number | string | undefined) => {
  return (Number(amount) || 0).toLocaleString("th-TH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
};
export function cn(...inputs: (string | undefined | null | boolean | number)[]) {
  return inputs.filter(Boolean).join(' ');
}
