"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Image from "next/image";

export function MobileHeader({
  title,
  onBack,
  showBack = true,
}: {
  title: string;
  onBack?: () => void;
  showBack?: boolean;
}) {
  return (
    <div className="md:hidden flex items-center justify-between fixed top-0 left-0 right-0 bg-background p-4 border-b z-20 h-16">
      {/* Left side */}
      <div className="flex items-center gap-3">
        <Image
          src="/favicon.ico"
          alt="Glory House Logo"
          width={32}
          height={32}
          className="rounded-full"
        />
        {showBack && onBack && (
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Centered Title */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <h1 className="text-lg font-bold truncate">{title}</h1>
      </div>

      {/* Right side placeholder for hamburger */}
      <div className="w-10 h-10"></div>
    </div>
  );
}
