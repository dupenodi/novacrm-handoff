import type { HTMLAttributes, ReactNode } from "react";
import { Avatar } from "../theme/Avatar";
import { ChannelGlyph } from "../theme/ChannelGlyph";
import { Chip, type ChipTone } from "../theme/Chip";
import { cx } from "../theme/utils";

export type PersonCardProps = {
  name: ReactNode;
  role: ReactNode;
  warmth: ReactNode;
  warmthTone?: ChipTone;
  path?: ReactNode;
  channels?: string[];
  last?: ReactNode;
  initials?: string;
} & HTMLAttributes<HTMLElement>;

export function PersonCard({
  name,
  role,
  warmth,
  warmthTone = "fresh",
  path,
  channels = [],
  last,
  initials,
  className,
  ...rest
}: PersonCardProps) {
  return (
    <article className={cx("d-person", className)} {...rest}>
      <div className="d-person__top">
        <Avatar size={32} initials={initials} />
        <div className="d-person__id">
          <span className="d-person__name">{name}</span>
          <span className="d-person__role">{role}</span>
        </div>
        <Chip tone={warmthTone} size="sm">
          {warmth}
        </Chip>
      </div>
      {path ? <p className="d-person__path">{path}</p> : null}
      <div className="d-person__foot">
        <div className="d-person__channels">
          {channels.map((ch) => (
            <ChannelGlyph key={ch} channel={ch} />
          ))}
        </div>
        {last ? <span className="d-person__last">{last}</span> : null}
      </div>
    </article>
  );
}
