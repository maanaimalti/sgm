import type * as React from "react";

interface FormSectionProps {
  index: string | number;
  title: string;
  desc?: string;
  children: React.ReactNode;
}

export function FormSection({
  index,
  title,
  desc,
  children,
}: FormSectionProps) {
  return (
    <section className="grid grid-cols-1 md:grid-cols-[180px,1fr] gap-4 md:gap-6 py-6 border-b border-line last:border-0">
      <div className="flex md:flex-col gap-3 items-start">
        <span className="inline-flex items-center justify-center size-6 rounded-pill bg-brand-soft text-brand-ink font-mono text-[12.5px] shrink-0">
          {index}
        </span>
        <div className="md:mt-1">
          <h3 className="font-serif text-[17px] leading-tight text-ink">
            {title}
          </h3>
          {desc && (
            <p className="mt-1 text-[12.5px] text-muted leading-snug">{desc}</p>
          )}
        </div>
      </div>
      <div>{children}</div>
    </section>
  );
}
