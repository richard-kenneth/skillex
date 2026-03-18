"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LayoutDashboard, LogOut, Code, User, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Home", href: "/" },
  { label: "Browse", href: "/browse" },
  { label: "Matches", href: "/matches" },
  { label: "Dashboard", href: "/dashboard" },
];

export function Navbar() {
  const { data: session, isPending } = useSession();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center space-x-2 transition-opacity hover:opacity-80">
            <Code className="h-6 w-6 text-primary" />
            <span className="font-bold text-xl tracking-tight hidden sm:block">
              Skill Exchange
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-primary",
                  pathname === item.href
                    ? "text-white"
                    : "text-zinc-400"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {/* Auth Section */}
          <div className="flex items-center">
            {isPending ? (
              <div className="h-8 w-8 animate-pulse rounded-full bg-zinc-800" />
            ) : session?.user ? (
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  className="hidden text-zinc-400 hover:text-white md:flex"
                  onClick={() => signOut()}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-9 w-9 rounded-full outline-none ring-offset-background transition-all hover:ring-2 hover:ring-primary/20">
                      <Avatar className="h-9 w-9 border border-white/10">
                        <AvatarImage src={session.user.image ?? ""} alt={session.user.name ?? "User avatar"} />
                        <AvatarFallback className="bg-primary/10 text-primary font-medium">
                          {session.user.name?.charAt(0) ?? "U"}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-64 p-2 bg-zinc-950 border-zinc-800" align="end" sideOffset={8}>
                    <div className="flex flex-col space-y-1 p-2">
                      <p className="font-semibold text-sm text-white">{session.user.name}</p>
                      <p className="text-xs text-zinc-500 truncate">
                        {session.user.email}
                      </p>
                    </div>
                    <DropdownMenuSeparator className="bg-zinc-800" />
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard" className="flex w-full items-center gap-2 cursor-pointer p-2 rounded-sm text-zinc-300 hover:text-white hover:bg-zinc-900">
                        <LayoutDashboard className="h-4 w-4" />
                        <span>Dashboard</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard/profile" className="flex w-full items-center gap-2 cursor-pointer p-2 rounded-sm text-zinc-300 hover:text-white hover:bg-zinc-900">
                        <User className="h-4 w-4" />
                        <span>Profile Settings</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-zinc-800" />
                    <DropdownMenuItem
                      className="flex w-full items-center gap-2 cursor-pointer text-red-400 hover:text-red-300 hover:bg-red-950/30 p-2 rounded-sm"
                      onClick={() => signOut()}
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  asChild
                  className="hidden sm:flex text-zinc-400 hover:text-white"
                >
                  <Link href="/sign-in">Log in</Link>
                </Button>
                <Button 
                  size="sm" 
                  className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium px-5"
                  asChild
                >
                  <Link href="/sign-up">Get Started</Link>
                </Button>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden text-zinc-400 hover:text-white">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[240px] md:hidden bg-zinc-950 border-zinc-800 p-2">
              <div className="flex flex-col gap-1">
                {navItems.map((item) => (
                  <DropdownMenuItem key={item.href} asChild>
                    <Link 
                      href={item.href} 
                      className={cn(
                        "flex w-full items-center p-2 text-sm rounded-md transition-colors",
                        pathname === item.href ? "bg-zinc-900 text-white" : "text-zinc-400 hover:bg-zinc-900/50 hover:text-white"
                      )}
                    >
                      {item.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
                
                <DropdownMenuSeparator className="my-2 bg-zinc-800" />
                
                {session?.user ? (
                  <>
                    <div className="px-2 py-1.5 mb-1">
                      <p className="text-sm font-medium text-white truncate">{session.user.name}</p>
                      <p className="text-xs text-zinc-500 truncate">{session.user.email}</p>
                    </div>
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard/profile" className="flex w-full items-center gap-2 p-2 text-sm text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-md">
                        <User className="h-4 w-4" />
                        <span>Profile Settings</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="flex w-full items-center gap-2 p-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-950/30 rounded-md cursor-pointer"
                      onClick={() => signOut()}
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href="/sign-in" className="flex w-full items-center p-2 text-sm text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-md">Log in</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/sign-up" className="flex w-full items-center p-2 text-sm bg-primary text-primary-foreground hover:bg-primary/90 rounded-md font-medium">Get Started</Link>
                    </DropdownMenuItem>
                  </>
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

