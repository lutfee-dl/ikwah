"use client";
import React, { ReactNode } from "react";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-slate-50 min-h-screen relative flex flex-col">
      {/* Top Profile Header (Sticky) */}
      <Header />

      {/* Content Area */}
      <main className="flex-1 px-5 py-6 w-full">
        {children}
      </main>

      {/* Bottom Navigation Bar */}
      <BottomNav />
    </div>
  );
}
