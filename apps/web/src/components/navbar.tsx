"use client";

import Link from "next/link";
import { useSession, signOut, signIn } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LayoutDashboard, LogOut, Code, User } from "lucide-react";

export function Navbar() {
  const { data: session, isPending } = useSession();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center px-4 md:px-8">
        <div className="mr-4 flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <Code className="h-6 w-6 text-primary" />
            <span className="hidden font-bold sm:inline-block">
              Skill Exchange
            </span>
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none">
            {/* Search or other right-aligned elements can go here */}
          </div>
          <nav className="flex items-center">
            {isPending ? (
              <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
            ) : session?.user ? (
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  className="hidden text-muted-foreground hover:text-foreground md:flex"
                  onClick={() => signOut()}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full outline-none ring-offset-background transition-colors focus-visible:ring-2 focus-visible:ring-ring">
                      <Avatar className="h-8 w-8 border border-muted transition-transform active:scale-95">
                        <AvatarImage src={session.user.image ?? ""} alt={session.user.name ?? "User avatar"} />
                        <AvatarFallback className="bg-primary/10 text-primary font-medium">
                          {session.user.name?.charAt(0) ?? "U"}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-64 p-2" align="end" sideOffset={8}>
                    <div className="flex items-center justify-start gap-2 p-2">
                      <div className="flex flex-col space-y-0.5 leading-none">
                        <p className="font-semibold text-sm">{session.user.name}</p>
                        <p className="text-xs text-muted-foreground truncate w-[180px]">
                          {session.user.email}
                        </p>
                      </div>
                    </div>
                    <DropdownMenuSeparator className="my-1" />
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard" className="flex w-full items-center gap-2 cursor-pointer transition-colors hover:bg-accent p-2 rounded-sm">
                        <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
                        <span>Dashboard</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/profile" className="flex w-full items-center gap-2 cursor-pointer transition-colors hover:bg-accent p-2 rounded-sm">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>Profile</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="my-1" />
                    <DropdownMenuItem
                      className="flex w-full items-center gap-2 cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive p-2 rounded-sm"
                      onClick={() => signOut()}
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <Button 
                size="sm" 
                className="font-medium"
                asChild
              >
                <Link href="/sign-in">Sign In</Link>
              </Button>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
