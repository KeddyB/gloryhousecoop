"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Image from "next/image";

export function MobileHeader({ title, onBack }: { title: string, onBack: () => void }) {
  return (
    <div className="md:hidden flex items-center justify-between fixed top-0 left-0 right-0 bg-background p-4 border-b z-20">
      <Button variant="ghost" size="icon" onClick={onBack}>
        <ArrowLeft className="h-5 w-5" />
      </Button>
      <h1 className="text-lg font-bold">{title}</h1>
      <Image src="/favicon.ico" alt="Glory House Logo" className="w-8 h-8 rounded-full" width={8} height={8}/>
    </div>
  );
}
