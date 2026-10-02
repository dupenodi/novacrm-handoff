import type { HTMLAttributes, ReactNode } from "react";
import { Chip, type ChipTone } from "../theme/Chip";
import { Label } from "../theme/Label";
import { cx } from "../theme/utils";

export type ActivityItem = {
  tone?: ChipTone;
  label: ReactNode;
  text: ReactNode;
  meta?: ReactNode;
};

export type ActivityGroup = {
  when: ReactNode;
  items: ActivityItem[];
};

export type ActivityFeedProps = {
  groups: ActivityGroup[];
  title?: ReactNode;
} & HTMLAttributes<HTMLElement>;

export function ActivityFeed({
  groups,
  title,
  className,
  ...rest
}: ActivityFeedProps) {
  return (
    <section className={cx("d-feed", className)} {...rest}>
      {title ? (
        <header className="d-feed__head">
          <Label>{title}</Label>
        </header>
      ) : null}
      {groups.map((g, i) => (
        <div key={i} className="d-feed__group">
          <span className="d-feed__when">{g.when}</span>
          <div className="d-feed__items">
            {g.items.map((item, j) => (
              <div key={j} className="d-feed__item">
                <Chip tone={item.tone ?? "neutral"} size="sm">
                  {item.label}
                </Chip>
                <div className="d-feed__copy">
                  <span className="d-feed__text">{item.text}</span>
                  {item.meta ? (
                    <span className="d-feed__meta">{item.meta}</span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
