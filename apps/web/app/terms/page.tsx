import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service — CrossPost",
  description: "Terms for using the CrossPost creator platform.",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#0b0812] px-6 py-16 text-[#f5eef8]">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="text-sm text-[#e0699a] hover:underline">
          ← Back to CrossPost
        </Link>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight">Terms of Service</h1>
        <p className="mt-2 text-sm text-[#b8a9c4]">Last updated: September 21, 2026</p>

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-[#ddd0e4]">
          <section>
            <h2 className="text-lg font-medium text-white">Acceptance</h2>
            <p className="mt-2">
              By using CrossPost you agree to these terms. If you do not agree, do not use the
              service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-white">Your content &amp; responsibilities</h2>
            <ul className="mt-2 list-disc space-y-2 pl-5">
              <li>You must have rights to upload and remix content you submit.</li>
              <li>You are responsible for posts made to connected social accounts.</li>
              <li>You must comply with each platform&apos;s terms and community guidelines.</li>
              <li>Do not use CrossPost for illegal, harmful, or deceptive content.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-medium text-white">Service</h2>
            <p className="mt-2">
              CrossPost is provided as-is. We may change features, limits, or pricing with notice
              where required. AI-generated output may require review before publishing.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-white">Billing</h2>
            <p className="mt-2">
              Paid plans are billed through Stripe. Subscriptions renew according to the plan you
              select unless cancelled.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium text-white">Contact</h2>
            <p className="mt-2">
              Questions about these terms:{" "}
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
