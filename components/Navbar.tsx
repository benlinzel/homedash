"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Menu, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useOnlineStatus } from "./OnlineStatusProvider";

const navLinks = [
  { href: "/", label: "Dashboard" },
  { href: "/docker", label: "Docker" },
  { href: "/network", label: "Network" },
];

export default function Navbar() {
  const pathname = usePathname();
  const { isOnline } = useOnlineStatus();

  return (
    <header className={cn("sticky top-0 z-50 w-full", "glassy")}>
      <div className="container flex h-16 items-center justify-between">
        <div className="mx-4 hidden md:flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <Image
              src="/icons/logo.png"
              alt="HomeDash Logo"
              width={32}
              height={32}
              className="h-8 w-8"
            />
            <span className="font-bold">HomeDash</span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "transition-colors hover:text-foreground/80",
                  pathname === href ? "text-foreground" : "text-foreground/60"
                )}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Right side of Navbar */}
        <div className="hidden md:flex items-center space-x-4">
          {!isOnline && (
            <div className="flex items-center text-sm text-destructive">
              <WifiOff className="h-4 w-4 mr-2" />
              Offline
            </div>
          )}
        </div>

        {/* Mobile Nav */}
        <div className="flex w-full items-center justify-between md:hidden">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <Image
              src="/icons/logo.png"
              alt="HomeDash Logo"
              width={24}
              height={24}
              className="h-6 w-6"
            />
            <span className="font-bold">HomeDash</span>
          </Link>

          <div className="flex items-center space-x-2">
            {!isOnline && (
              <div className="flex items-center text-sm text-destructive">
                <WifiOff className="h-4 w-4" />
              </div>
            )}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle Menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-48 pt-10">
                <SheetHeader>
                  <SheetTitle className="sr-only">
                    Mobile Navigation Menu
                  </SheetTitle>
                  <SheetDescription className="sr-only">
                    A list of links to navigate the application.
                  </SheetDescription>
                </SheetHeader>
                <nav className="flex flex-col gap-4 mt-4">
                  {navLinks.map(({ href, label }) => (
                    <Link
                      key={href}
                      href={href}
                      className={cn(
                        "text-lg font-medium transition-colors hover:text-foreground/80",
                        pathname === href
                          ? "text-foreground"
                          : "text-foreground/60"
                      )}
                    >
                      {label}
                    </Link>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
