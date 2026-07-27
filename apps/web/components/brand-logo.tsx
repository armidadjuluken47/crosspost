"use client";

import { useId } from "react";
import { BRAND } from "@/lib/brand";
import { BrandMark } from "@/components/brand-mark";

export function BrandLogo({ className = "" }: { className?: string }) {
  const gradientId = useId().replace(/:/g, "");

  return (
    <div role="img" aria-label={BRAND.product} className={`brand-logo ${className}`}>
      <BrandMark className="brand-logo-mark" gradientId={`crosspost-${gradientId}`} />
      <span className="brand-logo-word">{BRAND.name}</span>
    </div>
  );
}
