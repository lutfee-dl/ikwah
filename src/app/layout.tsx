import type { Metadata } from "next";
import { Kanit } from "next/font/google";
import "./globals.css";

const kanit = Kanit({
  variable: "--font-kanit",
  subsets: ["thai"],
  weight: ["300", "400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Ikwah - กองทุนอิควะฮฺ สา’สุข ยะรัง",
  description: "Ikwah - กองทุนอิควะฮฺ สา’สุข ยะรัง",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="th"
      className={`${kanit.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
        
        {children}
      </body>
    </html>
  );
}