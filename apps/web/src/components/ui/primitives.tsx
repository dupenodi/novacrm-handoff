import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { LoadingIcon } from "./icons";
import styles from "./ui.module.css";

export function cx(...names: Array<string | false | null | undefined>): string {
  return names.filter(Boolean).join(" ");
}

// —— Button ——————————————————————————————————————————————————————————————

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: "sm" | "md";
  loading?: boolean;
  icon?: ReactNode;
  /** Icon-only buttons need an accessible label. */
  label?: string;
};

export function Button({
  variant = "secondary",
  size = "md",
  loading = false,
  icon,
  label,
  children,
  className,
  disabled,
  type = "button",
  ...rest
}: ButtonProps) {
  const iconOnly = !children;
  return (
    <button
      type={type}
      className={cx(
        styles.button,
        styles[variant],
        size === "sm" && styles.sm,
        iconOnly && styles.iconOnly,
        loading && styles.loading,
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      aria-label={iconOnly ? label : undefined}
      title={iconOnly ? label : undefined}
      {...rest}
    >
      <span className={styles.buttonLabel}>
        {icon}
        {children}
      </span>
      {loading ? (
        <span className={styles.spinnerOverlay}>
          <Spinner size={15} />
        </span>
      ) : null}
    </button>
  );
}

export function ButtonLink({
  href,
  icon,
  children,
  external = false,
}: {
  href: string;
  icon?: ReactNode;
  children: ReactNode;
  external?: boolean;
}) {
  const className = cx(styles.button, styles.secondary);
  const content = (
    <span className={styles.buttonLabel}>
      {icon}
      {children}
    </span>
  );
  return external ? (
    <a href={href} className={className} target="_blank" rel="noreferrer">
      {content}
    </a>
  ) : (
    <Link href={href} className={className}>
      {content}
    </Link>
  );
}

// —— Badge ———————————————————————————————————————————————————————————————

export type Tone = "neutral" | "accent" | "blue" | "green" | "amber" | "red";

const BADGE_TONE: Record<Tone, string | undefined> = {
  neutral: styles.neutral,
  accent: styles.toneAccent,
  blue: styles.blue,
  green: styles.green,
  amber: styles.amber,
  red: styles.red,
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={cx(styles.badge, BADGE_TONE[tone])}>{children}</span>
  );
}

// —— Spinner, dot, skeleton ——————————————————————————————————————————————

export function Spinner({ size = 16, className }: { size?: number; className?: string }) {
  return <LoadingIcon className={cx(styles.spinner, className)} width={size} height={size} aria-hidden />;
}

const DOT_TONE: Record<Tone, string | undefined> = {
  neutral: styles.dotNeutral,
  accent: styles.dotAmber,
  blue: styles.dotBlue,
  green: styles.dotGreen,
  amber: styles.dotAmber,
  red: styles.dotRed,
};

export function StatusDot({ tone, pulse = false }: { tone: Tone; pulse?: boolean }) {
  return <span className={cx(styles.dot, DOT_TONE[tone], pulse && styles.dotPulse)} aria-hidden />;
}

export function Skeleton({ width, height = 12, style }: { width?: number | string; height?: number; style?: CSSProperties }) {
  return <span className={styles.skeleton} style={{ display: "block", width, height, ...style }} aria-hidden />;
}
