"use client";

import { Loader2 } from "lucide-react";
import { CreatorAuthProvider, useCreatorAuth } from "@/components/creator/creator-auth-provider";
import { CreatorToastProvider } from "@/components/creator/creator-toast";
import { LandingPage } from "@/components/landing/landing-page";

function HomeEntry() {
  const { loading } = useCreatorAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b0812]">
        <Loader2 className="h-7 w-7 animate-spin text-[#e0699a]" />
      </div>
    );
  }

  return <LandingPage />;
}

export default function HomePage() {
  return (
    <CreatorAuthProvider>
      <CreatorToastProvider>
        <HomeEntry />
      </CreatorToastProvider>
    </CreatorAuthProvider>
  );
}
