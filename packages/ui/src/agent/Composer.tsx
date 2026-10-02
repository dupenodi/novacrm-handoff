"use client";

import type { ChangeEvent, ReactNode } from "react";
import { Button } from "../theme";
import { cx } from "../theme/utils";
import type { ComposerMode } from "./types";

export type ComposerAttachment = {
  name: string;
  meta?: string;
};

export type ComposerProps = {
  mode: ComposerMode;
  modes?: ComposerMode[];
  onModeChange?: (mode: ComposerMode) => void;
  modeHint?: string;
  value: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  attachment?: ComposerAttachment | null;
  onRemoveAttachment?: () => void;
  onAttach?: () => void;
  micActive?: boolean;
  onToggleMic?: () => void;
  sendLabel?: string;
  onSend?: () => void;
  draftMeta?: ReactNode;
  disabled?: boolean;
  className?: string;
};

const DEFAULT_MODES: ComposerMode[] = ["Ask", "Capture", "Dictate"];

export function Composer({
  mode,
  modes = DEFAULT_MODES,
  onModeChange,
  modeHint,
  value,
  onChange,
  placeholder,
  attachment,
  onRemoveAttachment,
  onAttach,
  micActive = false,
  onToggleMic,
  sendLabel = "Send",
  onSend,
  draftMeta,
  disabled = false,
  className,
}: ComposerProps) {
  return (
    <div className={cx("a-composer", className)}>
      <div className="a-composer__modes">
        {modes.map((m) => (
          <button
            key={m}
            type="button"
            className={cx("a-composer__mode", m === mode && "a-composer__mode--on")}
            onClick={() => onModeChange?.(m)}
            disabled={disabled}
          >
            {m}
          </button>
        ))}
        {modeHint ? <span className="a-composer__hint">{modeHint}</span> : null}
      </div>

      <textarea
        className="a-composer__input"
        value={value}
        rows={4}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onChange?.(e.target.value)}
      />

      {attachment ? (
        <div className="a-composer__attach">
          <span className="a-composer__attach-thumb" aria-hidden />
          <div>
            <div className="a-composer__attach-name">{attachment.name}</div>
            {attachment.meta ? (
              <div className="a-composer__attach-meta">{attachment.meta}</div>
            ) : null}
          </div>
          {onRemoveAttachment ? (
            <Button
              variant="icon"
              onClick={onRemoveAttachment}
              aria-label="Remove attachment"
              style={{ width: 24, height: 24, padding: 0 }}
            >
              ×
            </Button>
          ) : null}
        </div>
      ) : null}

      <div className="a-composer__foot">
        {onToggleMic ? (
          <Button
            variant="secondary"
            onClick={onToggleMic}
            disabled={disabled}
            style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
          >
            <span
              className={cx("a-mic-dot", micActive && "a-mic-dot--live")}
              aria-hidden
            />
            {micActive ? "Listening…" : "Mic"}
          </Button>
        ) : null}
        {onAttach ? (
          <Button variant="secondary" onClick={onAttach} disabled={disabled}>
            Attach
          </Button>
        ) : null}
        {draftMeta ? <span className="a-composer__meta">{draftMeta}</span> : null}
        <span className="a-composer__send">
          <Button variant="primary" onClick={onSend} disabled={disabled || !value.trim()}>
            {sendLabel}
          </Button>
        </span>
      </div>
    </div>
  );
}
