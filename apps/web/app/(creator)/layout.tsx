import { cookies } from "next/headers";
import { CreatorShell } from "@/components/creator/creator-shell";

export default async function CreatorLayout({ children }: { children: React.ReactNode }) {
  const stored = (await cookies()).get("crosspost_theme")?.value;
  const initialTheme = stored === "dark" || stored === "light" ? stored : undefined;

  return <CreatorShell initialTheme={initialTheme}>{children}</CreatorShell>;
}
