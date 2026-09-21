import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — CrossPost",
  description: "How CrossPost collects, uses, and protects your data.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#0b0812] px-6 py-16 text-[#f5eef8]">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="text-sm text-[#e0699a] hover:underline">
          ← Back to CrossPost
        </Link>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight">Privacy Policy</h1>
        <p className="mt-2 text-sm text-[#b8a9c4]">Last updated: September 21, 2026</p>

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-[#ddd0e4]">
          <section>
            <h2 className="text-lg font-medium text-white">Overview</h2>
            <p className="mt-2">
              CrossPost (&quot;we&quot;, &quot;us&quot;) helps creators remix short-form video and publish to
              connected social accounts. This policy describes what we collect and how we use it.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-white">Information we collect</h2>
            <ul className="mt-2 list-disc space-y-2 pl-5">
              <li>Account details from Google sign-in (name, email, profile photo).</li>
              <li>Content you upload (face photos, source videos) and generated remix outputs.</li>
              <li>OAuth tokens for connected YouTube, TikTok, or Instagram accounts (stored encrypted).</li>
              <li>Usage, billing, and support data needed to operate the service.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-medium text-white">How we use information</h2>
            <ul className="mt-2 list-disc space-y-2 pl-5">
              <li>Provide identity-swap video generation and social publishing.</li>
              <li>Authenticate you and manage subscriptions.</li>
              <li>Improve reliability, security, and product performance.</li>
              <li>Comply with legal obligations.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-medium text-white">Third-party services</h2>
            <p className="mt-2">
              We use providers such as Firebase (authentication), Stripe (payments), cloud storage,
              and AI/video processing APIs. Connected platforms (Google/YouTube, TikTok, Meta)
              receive only the data required to publish on your behalf when you choose to post.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-white">Data retention &amp; security</h2>
            <p className="mt-2">
              We retain data while your account is active and as needed for legal or operational
              purposes. OAuth tokens are encrypted at rest. You may disconnect social accounts or
              request account deletion by contacting support.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-white">Contact</h2>
            <p className="mt-2">
              Questions about this policy:{" "}
              <a className="text-[#e0699a] hover:underline" href="mailto:support@crosspost.app">
                support@crosspost.app
              </a>
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
