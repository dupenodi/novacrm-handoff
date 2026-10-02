import type { HTMLAttributes } from "react";
import { cx } from "./utils";

export type ChannelGlyphProps = {
  channel: string;
  size?: number;
} & HTMLAttributes<HTMLSpanElement>;

/** Small bordered glyph for a channel (in / @ / …). */
export function ChannelGlyph({
  channel,
  size = 20,
  className,
  style,
  ...rest
}: ChannelGlyphProps) {
  return (
    <span
      className={cx("t-channel", className)}
      style={{ width: size, height: size, ...style }}
      title={channel}
      {...rest}
    >
      {channel}
    </span>
  );
}
