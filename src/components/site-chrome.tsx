"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Radar } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "cn";

const links = [
  { href: "/", label: "现场检测" },
  { href: "/directory", label: "公开收录" },
  { href: "/business", label: "商务合作" },
];

export function SiteHeader() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-xl bg-[#176b5b] text-white">
            <Radar className="size-5" />
          </span>
          <span className="text-lg font-bold">Signal<span className="text-[#176b5b]">Deck</span></span>
        </Link>
        <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={pathname === link.href ? "text-slate-950" : "hover:text-slate-950"}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <Link href="/business" className={cn(buttonVariants(), "hidden md:inline-flex")}>投放广告</Link>
        <Sheet>
          <SheetTrigger render={<Button variant="ghost" size="icon" className="md:hidden" aria-label="打开菜单" />}>
            <Menu />
          </SheetTrigger>
          <SheetContent>
            <SheetTitle className="flex items-center gap-2"><Radar className="text-primary" />SignalDeck</SheetTitle>
            <div className="mt-8 grid gap-2">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(buttonVariants({ variant: "ghost" }), "justify-start")}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 text-sm text-slate-500 sm:flex-row sm:justify-between sm:px-6">
        <span className="font-semibold text-slate-800">SignalDeck</span>
        <span>付费只买展示位置，不买检测分数。</span>
        <span>© 2026</span>
      </div>
    </footer>
  );
}
