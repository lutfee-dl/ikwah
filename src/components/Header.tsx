"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { ASSETS } from "@/config";

export default function Header() {
  const pathname = usePathname();

  return (
    <header
      className={`sticky top-0 z-40 bg-white/80 backdrop-blur-md px-5 py-4 flex justify-between items-center border-b border-slate-100 transition-all ${pathname === "/dashboard/profile" ? "opacity-0 -translate-y-full pointer-events-none" : ""
        }`}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 flex items-center justify-center text-white overflow-hidden">
          <Image
            src={ASSETS.IMAGES.LOGO}
            alt="Logo"
            width={40}
            height={40}
            className="object-contain"
            priority
          />
        </div>
        <div>
          <p className="text-[15px] text-blue-600 font-bold leading-none uppercase tracking-tighter">
            กองทุนอิควะฮฺ
          </p>
          <p className="text-sm font-semibold text-slate-800">สา’สุข ยะรัง</p>
        </div>
      </div>
      <Link href="/dashboard/profile" className="text-slate-400 hover:text-blue-600 transition">
        <i className="fa-regular fa-circle-user text-2xl"></i>
      </Link>
    </header>
  );
}
