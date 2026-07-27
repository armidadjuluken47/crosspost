export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 border-b pb-5 lg:flex-row lg:items-center lg:justify-between" style={{ borderColor: "var(--border)" }}>
      <div>
        <h1 className="font-display text-2xl font-extrabold uppercase tracking-wide lg:text-3xl">{title}</h1>
        {subtitle ? (
          <p className="mt-1 font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
            {subtitle}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
