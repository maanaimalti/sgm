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

interface ShellState {
  header: MobileHeaderConfig;
  fab: FabConfig | null;
}

interface ShellSetters {
  setHeader: (cfg: MobileHeaderConfig | null) => void;
  setFab: (cfg: FabConfig | null) => void;
}

// State and setters live in SEPARATE contexts on purpose. Pages subscribe only
// to the setters (which never change identity), so publishing a new header/fab
// re-renders the shell chrome but NOT the page. Subscribing pages to the
// changing state instead is what caused an infinite setState→render loop:
// the page re-rendered, rebuilt its inline `icon`/`filters`/`onClick`, those
// fed the publish effect again, and round it went ("Maximum update depth").
const ShellStateContext = React.createContext<ShellState | null>(null);
const ShellSettersContext = React.createContext<ShellSetters | null>(null);

export function MobileShellProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [header, setHeaderState] = React.useState<MobileHeaderConfig>({});
  const [fab, setFabState] = React.useState<FabConfig | null>(null);

  // Stable for the lifetime of the provider — pages depend on these.
  const setters = React.useMemo<ShellSetters>(
    () => ({
      setHeader: (cfg) => setHeaderState(cfg ?? {}),
      setFab: (cfg) => setFabState(cfg),
    }),
    [],
  );

  const state = React.useMemo<ShellState>(
    () => ({ header, fab }),
    [header, fab],
  );

  return (
    <ShellSettersContext.Provider value={setters}>
      <ShellStateContext.Provider value={state}>
        {children}
      </ShellStateContext.Provider>
    </ShellSettersContext.Provider>
  );
}

/** Read the current header/fab — for the shell chrome only. */
export function useMobileShellState() {
  return React.useContext(ShellStateContext);
}

function useShellSetters() {
  return React.useContext(ShellSettersContext);
}

export function useMobileHeader(config: MobileHeaderConfig) {
  const setters = useShellSetters();
  const latest = React.useRef(config);
  latest.current = config;

  // Re-publish on every commit (no deps) so live bits (filter counts, active
  // chip, search value) stay current. This cannot loop: pages don't subscribe
  // to shell state, so setHeader re-renders the chrome only, never this page.
  React.useEffect(() => {
    if (!setters) return;
    const c = latest.current;
    setters.setHeader({
      title: c.title,
      search: c.search
        ? {
            value: c.search.value,
            onChange: (v: string) => latest.current.search?.onChange(v),
            placeholder: c.search.placeholder,
          }
        : undefined,
      filters: c.filters,
      hideTopBar: c.hideTopBar,
    });
  });

  React.useEffect(() => {
    return () => setters?.setHeader(null);
  }, [setters]);
}

export function useFAB(config: FabConfig | null) {
  const setters = useShellSetters();
  const latest = React.useRef(config);
  latest.current = config;

  // Re-publish on every commit (no deps); same rationale as useMobileHeader.
  React.useEffect(() => {
    if (!setters) return;
    const c = latest.current;
    if (!c || !c.icon || !c.label || !c.onClick) {
      setters.setFab(null);
      return;
    }
    setters.setFab({
      icon: c.icon,
      label: c.label,
      onClick: () => latest.current?.onClick?.(),
    });
  });

  React.useEffect(() => {
    return () => setters?.setFab(null);
  }, [setters]);
}
