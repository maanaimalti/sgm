"use client";

import * as React from "react";

export interface MobileHeaderConfig {
  title?: React.ReactNode;
  search?: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
  };
  filters?: React.ReactNode;
  hideTopBar?: boolean;
}

export interface FabConfig {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

interface MobileShellContextValue {
  header: MobileHeaderConfig;
  setHeader: (cfg: MobileHeaderConfig | null) => void;
  fab: FabConfig | null;
  setFab: (cfg: FabConfig | null) => void;
}

const MobileShellContext = React.createContext<MobileShellContextValue | null>(
  null,
);

export function MobileShellProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [header, setHeaderState] = React.useState<MobileHeaderConfig>({});
  const [fab, setFabState] = React.useState<FabConfig | null>(null);

  const setHeader = React.useCallback((cfg: MobileHeaderConfig | null) => {
    setHeaderState(cfg ?? {});
  }, []);

  const setFab = React.useCallback((cfg: FabConfig | null) => {
    setFabState(cfg);
  }, []);

  const value = React.useMemo(
    () => ({ header, setHeader, fab, setFab }),
    [header, setHeader, fab, setFab],
  );

  return (
    <MobileShellContext.Provider value={value}>
      {children}
    </MobileShellContext.Provider>
  );
}

function useMobileShellContext() {
  return React.useContext(MobileShellContext);
}

export function useMobileShellState() {
  return useMobileShellContext();
}

export function useMobileHeader(config: MobileHeaderConfig) {
  const ctx = useMobileShellContext();
  const titleRef = config.title;
  const searchValue = config.search?.value;
  const searchOnChange = config.search?.onChange;
  const searchPlaceholder = config.search?.placeholder;
  const filters = config.filters;
  const hideTopBar = config.hideTopBar;

  React.useEffect(() => {
    if (!ctx) return;
    ctx.setHeader({
      title: titleRef,
      search:
        searchOnChange !== undefined
          ? {
              value: searchValue ?? "",
              onChange: searchOnChange,
              placeholder: searchPlaceholder,
            }
          : undefined,
      filters,
      hideTopBar,
    });
    return () => ctx.setHeader(null);
  }, [
    ctx,
    titleRef,
    searchValue,
    searchOnChange,
    searchPlaceholder,
    filters,
    hideTopBar,
  ]);
}

export function useFAB(config: FabConfig | null) {
  const ctx = useMobileShellContext();
  const icon = config?.icon;
  const label = config?.label;
  const onClick = config?.onClick;
  const enabled = !!config;

  React.useEffect(() => {
    if (!ctx) return;
    if (!enabled || !icon || !label || !onClick) {
      ctx.setFab(null);
      return;
    }
    ctx.setFab({ icon, label, onClick });
    return () => ctx.setFab(null);
  }, [ctx, enabled, icon, label, onClick]);
}
