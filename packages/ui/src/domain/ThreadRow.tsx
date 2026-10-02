import type { HTMLAttributes, ReactNode } from "react";
import { ChannelGlyph } from "../theme/ChannelGlyph";
import { Chip, type ChipTone } from "../theme/Chip";
import { cx } from "../theme/utils";

export type ThreadRowProps = {
  unread?: boolean;
  channel: string;
  typeLabel: ReactNode;
  typeTone?: ChipTone;
  title: ReactNode;
  snippet?: ReactNode;
  age?: ReactNode;
} & HTMLAttributes<HTMLElement>;

export function ThreadRow({
  unread = false,
  channel,
  typeLabel,
  typeTone = "inbound",
  title,
  snippet,
  age,
  className,
  ...rest
}: ThreadRowProps) {
  return (
    <article className={cx("d-thread", className)} {...rest}>
      <span
        className={cx("d-thread__dot", unread && "is-unread")}
        aria-hidden
      />
      <ChannelGlyph channel={channel} />
      <div className="d-thread__body">
        <div className="d-thread__head">
          <Chip tone={typeTone} size="sm">
            {typeLabel}
          </Chip>
          <span className="d-thread__title">{title}</span>
        </div>
        {snippet ? <p className="d-thread__snip">{snippet}</p> : null}
      </div>
      {age ? <span className="d-thread__age">{age}</span> : null}
    </article>
  );
}
