"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Key,
  BarChart2,
  BookOpen,
  Terminal,
  ArrowLeft,
  Sparkles,
  Code2
} from "lucide-react";

export function DeveloperNavbar() {
  const pathname = usePathname();

  const navItems = [
    { name: "Overview", href: "/developer", icon: LayoutDashboard },
    { name: "API Keys", href: "/developer/keys", icon: Key },
    { name: "Usage", href: "/developer/usage", icon: BarChart2 },
    { name: "Documentation", href: "/developer/docs", icon: BookOpen },
    { name: "Playground", href: "/developer/playground", icon: Terminal }
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Brand & Developer Platform Badge */}
        <div className="flex items-center gap-4">
          <Link href="/chat" className="group flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            <span className="text-xs font-medium">Back to App</span>
          </Link>

          <div className="h-4 w-px bg-slate-800" />

          <Link href="/developer" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-md shadow-indigo-600/30">
              <Code2 className="h-5 w-5" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-lg tracking-tight">QuickSolv</span>
              <span className="rounded-md bg-indigo-950/80 border border-indigo-700/50 px-2 py-0.5 text-xs font-semibold text-indigo-300">
                Developer API
              </span>
            </div>
          </Link>
        </div>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-indigo-600/15 text-indigo-400 border border-indigo-500/30"
                    : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-indigo-400" : "text-slate-500"}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User Account / Status */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/60 px-3 py-1 text-xs text-slate-300">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>API Online (v1)</span>
          </div>
          <Link
            href="/developer/playground"
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 transition-colors shadow-sm shadow-indigo-600/20"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Try Sandbox</span>
          </Link>
        </div>
      </div>

      {/* Mobile Sub-Navigation */}
      <div className="flex md:hidden overflow-x-auto border-t border-slate-800/80 px-4 py-2 gap-2 scrollbar-none">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-medium ${
                isActive
                  ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30"
                  : "text-slate-400 bg-slate-900/50"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {item.name}
            </Link>
          );
        })}
      </div>
    </header>
  );
}
