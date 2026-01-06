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
    <div className="md:hidden flex items-center fixed top-0 left-0 right-0 bg-background p-4 border-b z-20 h-16">
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
      <div className="flex-1 text-center">
        <h1 className="text-lg font-bold truncate">{title}</h1>
      </div>
      <div className="w-10"></div>      {/* Placeholder for hamburger menu to balance flexbox */}
    </div>
  );
}
