import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0b0812] px-6 text-center text-white">
      <p className="text-sm font-medium uppercase tracking-widest text-[#e0699a]">404</p>
      <h1 className="text-3xl font-semibold">Page not found</h1>
      <p className="max-w-md text-sm text-white/70">
        That link doesn&apos;t exist. Head back to create a remix or browse your projects.
      </p>
      <div className="flex gap-3">
        <Link
          href="/create"
          className="rounded-full bg-[#e0699a] px-5 py-2 text-sm font-medium text-white"
        >
          Create
        </Link>
        <Link
          href="/projects"
          className="rounded-full border border-white/20 px-5 py-2 text-sm font-medium text-white"
        >
          Projects
        </Link>
      </div>
    </div>
  );
}
