"use client";

import type { ReactNode } from "react";
import { cx } from "./utils";
import { Button } from "./Button";

export type IntegrationBusyAction =
  | "connect"
  | "disconnect"
  | "reconnect"
  | "manage";

export type IntegrationRowProps = {
  name: string;
  logoUrl?: string | null;
  connected: boolean;
  /** Auth / ownership chips (OAuth2, managed, …) */
  meta?: ReactNode;
  /** Secondary facts (tool counts, category, account) */
  facts?: ReactNode;
  /** Permission / scope chips */
  scopes?: ReactNode;
  /**
   * Which action is in flight. Only that button shows a spinner;
   * siblings stay idle (and can still be disabled via `disabled`).
   */
  busyAction?: IntegrationBusyAction | null;
  /** Disable actions (e.g. another row is mid-flight, or no API key) */
  disabled?: boolean;
  /** Soft warning under the row (expired token, etc.) */
  attention?: string | null;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onReconnect?: () => void;
  /** Secondary action when connected (e.g. Manage / switch method) */
  onManage?: () => void;
  connectLabel?: string;
  disconnectLabel?: string;
  manageLabel?: string;
  className?: string;
};

/** Placeholder bar sizes, in render order: title row, facts line, scope chips, action. */
const SKELETON_TITLE = [120, 72, 96];
const SKELETON_SCOPES = [52, 64, 48, 70];

function SkeletonBar({ width, height }: { width: number | string; height: number }) {
  return <span className="t-integration__skel-bar" style={{ width, height }} />;
}

export function IntegrationRowSkeleton() {
  return (
    <li className="t-integration t-integration--skel" aria-hidden>
      <div className="t-integration__main">
        <div className="t-integration__mark t-integration__skel-block" />
        <div className="t-integration__body">
          <div className="t-integration__title-row">
            {SKELETON_TITLE.map((width, i) => (
              <SkeletonBar key={i} width={width} height={i === 0 ? 14 : 18} />
            ))}
          </div>
          <SkeletonBar width="55%" height={12} />
          <div className="t-integration__scopes">
            {SKELETON_SCOPES.map((width, i) => (
              <SkeletonBar key={i} width={width} height={18} />
            ))}
          </div>
        </div>
      </div>
      <div className="t-integration__aside">
        <SkeletonBar width={88} height={32} />
      </div>
    </li>
  );
}

export function IntegrationRow({
  name,
  logoUrl,
  connected,
  meta,
  facts,
  scopes,
  busyAction = null,
  disabled = false,
  attention = null,
  onConnect,
  onDisconnect,
  onReconnect,
  onManage,
  connectLabel = "Connect",
  disconnectLabel = "Disconnect",
  manageLabel = "Manage",
  className,
}: IntegrationRowProps) {
  /** Only the in-flight button spins; while one is busy the others are locked. */
  const actionState = (action: IntegrationBusyAction) => ({
    loading: busyAction === action,
    disabled: busyAction != null ? busyAction !== action : disabled,
  });

  return (
    <li
      className={cx(
        "t-integration",
        connected ? "t-integration--connected" : "t-integration--idle",
        attention && "t-integration--attention",
        className,
      )}
    >
      <div className="t-integration__main">
        <div className="t-integration__mark" aria-hidden>
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" width={32} height={32} loading="lazy" referrerPolicy="no-referrer" />
          ) : (
            <span className="t-integration__mark-fallback">{name.slice(0, 1)}</span>
          )}
        </div>

        <div className="t-integration__body">
          <div className="t-integration__title-row">
            <h4 className="t-integration__name">{name}</h4>
            {meta ? <div className="t-integration__meta">{meta}</div> : null}
          </div>
          {facts ? <div className="t-integration__facts">{facts}</div> : null}
          {attention ? <p className="t-integration__attention">{attention}</p> : null}
          {scopes ? <div className="t-integration__scopes">{scopes}</div> : null}
        </div>
      </div>

      <div className="t-integration__aside">
        {connected ? (
          <>
            {onReconnect ? (
              <Button variant="primary" {...actionState("reconnect")} onClick={onReconnect}>
                Reconnect
              </Button>
            ) : null}
            {onManage ? (
              <Button variant="secondary" {...actionState("manage")} onClick={onManage}>
                {manageLabel}
              </Button>
            ) : null}
            {onDisconnect ? (
              // Next to Reconnect, Disconnect steps back visually.
              <Button variant={onReconnect ? "plain" : "secondary"} {...actionState("disconnect")} onClick={onDisconnect}>
                {disconnectLabel}
              </Button>
            ) : null}
          </>
        ) : (
          <Button
            variant="primary"
            loading={busyAction === "connect"}
            disabled={actionState("connect").disabled || !onConnect}
            onClick={onConnect}
          >
            {connectLabel}
          </Button>
        )}
      </div>
    </li>
  );
}
