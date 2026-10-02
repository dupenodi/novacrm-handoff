/** Series colours allowed by brand.html — accent first, then inbound violet, then muted. */

export type ChartColor = "accent" | "inbound" | "muted" | "ok" | "due" | "risky";

export const CHART_COLOR_VAR: Record<ChartColor, string> = {
  accent: "var(--t-acc)",
  inbound: "var(--t-inbound-fg, var(--t-acc))",
  muted: "var(--t-mut)",
  ok: "var(--t-ok-fg)",
  due: "var(--t-due-fg)",
  risky: "var(--t-risk-fg)",
};

/** Fallback hex when SVG needs a concrete paint (legend swatches can use CSS vars). */
export const CHART_COLOR_FALLBACK: Record<ChartColor, string> = {
  accent: "#1b34ff",
  inbound: "#7a4dff",
  muted: "#8a93a8",
  ok: "#1a7a45",
  due: "#c45a12",
  risky: "#e02b12",
};
