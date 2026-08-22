import { Logo } from "@/components/ui-ext/brand-mark";

/**
 * The left half of the signed-out screens. Shared by the login page and
 * /definir-senha so that arriving from an invite link looks like arriving at
 * the front door, rather than at a different application.
 */
export function AuthBrandPanel() {
  return (
    <section
      className="relative flex flex-col justify-between p-8 md:p-12 overflow-hidden md:min-h-screen min-h-[260px]"
      style={{
        background: "linear-gradient(180deg, #f9efe9 0%, #f4ebe5 100%)",
      }}
    >
      <svg
        aria-hidden="true"
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 600 800"
        preserveAspectRatio="xMidYMid slice"
        style={{ opacity: 0.18 }}
      >
        <path
          d="M-50 600 C 100 300, 300 200, 650 250"
          stroke="#ab2c2c"
          strokeWidth="1.5"
          fill="none"
        />
        <path
          d="M-30 700 C 120 420, 320 320, 680 360"
          stroke="#ab2c2c"
          strokeWidth="1"
          fill="none"
        />
        <ellipse
          cx="450"
          cy="180"
          rx="140"
          ry="60"
          transform="rotate(-25 450 180)"
          stroke="#ab2c2c"
          strokeWidth="1"
          fill="none"
        />
      </svg>
      <div className="relative z-10">
        <Logo width={200} priority />
      </div>
      <div className="relative z-10 max-w-[380px]">
        <h1 className="font-serif text-[36px] md:text-[48px] leading-[1.05] tracking-[-0.02em] text-ink">
          Estoque e pedidos
          <br />
          <span className="italic text-[#ab2c2c]">do começo ao fim.</span>
        </h1>
        <p className="mt-4 text-[14px] leading-[1.55] text-ink-2 max-w-[320px]">
          Sistema interno de gestão do Maanaim de Alagoas. Cozinha, compras e
          administração no mesmo lugar.
        </p>
      </div>
      <div className="relative z-10 flex gap-6 text-[12px] text-muted">
        © Maanaim de Alagoas · v2.0
      </div>
    </section>
  );
}
