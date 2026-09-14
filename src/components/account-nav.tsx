"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "cn";

export function AccountNav() {
  const pathname = usePathname();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/account/me").then((response) => response.json()).then((data: { email?: string | null }) => {
      setEmail(data.email ?? null);
    }).catch(() => setEmail(null));
  }, [pathname]);

  if (email) {
    return (
      <Link href="/account" className={cn(buttonVariants(), "hidden md:inline-flex")}>站长后台</Link>
    );
  }
  return (
    <Link href="/account/login" className={cn(buttonVariants({ variant: "outline" }), "hidden md:inline-flex")}>站长登录</Link>
  );
}
