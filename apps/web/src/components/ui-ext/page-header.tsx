"use client";

import { Search } from "lucide-react";
import * as React from "react";

import { Input, InputGroup } from "@/components/ui/input";

interface PageHeaderProps {
  crumbs?: React.ReactNode[];
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  search?:
    | boolean
    | {
        value: string;
        onChange: (v: string) => void;
        placeholder?: string;
      };
}

export function PageHeader({
  crumbs,
  title,
  subtitle,
  actions,
  search,
}: PageHeaderProps) {
  const searchObj = typeof search === "object" ? search : null;
  const showSearch = !!search;

  return (
    <div className="hidden md:block px-8 pt-7 pb-5 border-b border-line bg-surface">
      <div className="flex items-center justify-between gap-4 mb-4">
        {crumbs && crumbs.length > 0 ? (
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-1.5 text-[12.5px] text-muted"
          >
            {crumbs.map((c, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: breadcrumbs are stable and ordered
              <React.Fragment key={i}>
                <span
                  className={
                    i === crumbs.length - 1 ? "text-ink-2" : "text-muted"
                  }
                >
                  {c}
                </span>
                {i < crumbs.length - 1 && (
                  <span aria-hidden="true" className="text-faint">
                    ›
                  </span>
                )}
              </React.Fragment>
            ))}
          </nav>
        ) : (
          <div />
        )}
        {showSearch && (
          <div className="max-w-[360px] w-full">
            <InputGroup
              leading={<Search size={14} />}
              className="h-9 rounded-pill"
            >
              <Input
                value={searchObj?.value ?? ""}
                onChange={(e) => searchObj?.onChange(e.target.value)}
                placeholder={searchObj?.placeholder ?? "Buscar..."}
              />
            </InputGroup>
          </div>
        )}
      </div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-[32px] leading-[1.05] tracking-[-0.02em] text-ink">
            {title}
          </h1>
          {subtitle && (
            <div className="mt-1.5 text-[13.5px] text-muted">{subtitle}</div>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
