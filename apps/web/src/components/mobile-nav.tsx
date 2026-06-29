"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Home, Users, ArrowLeftRight, Coins, User } from "lucide-react";
import { motion } from "framer-motion";

const navItems = [
  { key: "home", href: "/", icon: Home },
  { key: "matches", href: "/matches", icon: Users },
  { key: "exchanges", href: "/exchanges", icon: ArrowLeftRight },
  { key: "points", href: "/points", icon: Coins },
  { key: "dashboard", href: "/dashboard", icon: User },
] as const;

export function MobileNav() {
  const pathname = usePathname();
  const t = useTranslations("nav");

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-zinc-950/80 backdrop-blur-md pb-[env(safe-area-inset-bottom,8px)] pt-2 md:hidden">
      <div className="flex h-12 items-center justify-around px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          // Check if active: either exact match, or for subpaths (except root /)
          const isActive = 
            pathname === item.href || 
            (item.href !== "/" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative flex flex-col items-center justify-center flex-1 h-full py-1 text-center group cursor-pointer transition-colors"
            >
              <div className="relative flex flex-col items-center justify-center gap-0.5">
                <Icon
                  className={cn(
                    "h-5 w-5 transition-transform duration-200 group-active:scale-95",
                    isActive ? "text-primary" : "text-zinc-400"
                  )}
                />
                <span
                  className={cn(
                    "text-[10px] font-medium tracking-tight",
                    isActive ? "text-primary" : "text-zinc-500"
                  )}
                >
                  {t(item.key)}
                </span>
                
                {/* Active pill background indicator */}
                {isActive && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute -top-1.5 h-[2px] w-6 bg-primary rounded-full"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
