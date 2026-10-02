import type { HTMLAttributes, ReactNode } from "react";
import { Chip, type ChipTone } from "../theme/Chip";
import { Mark } from "../theme/Mark";
import { ProgressBar } from "../theme/ProgressBar";
import { Sparkline } from "../theme/Sparkline";
import { cx } from "../theme/utils";

export type CompanyCardProps = {
  name: ReactNode;
  role: ReactNode;
  stage: ReactNode;
  stageTone?: ChipTone;
  sparkPoints?: number[];
  lastTouch?: ReactNode;
  fit?: number;
  fitLabel?: string;
  next?: ReactNode;
  people?: ReactNode;
  mark?: ReactNode;
} & HTMLAttributes<HTMLElement>;

export function CompanyCard({
  name,
  role,
  stage,
  stageTone = "info",
  sparkPoints,
  lastTouch,
  fit,
  fitLabel,
  next,
  people,
  mark,
  className,
  ...rest
}: CompanyCardProps) {
  return (
    <article className={cx("d-co-card", className)} {...rest}>
      <div className="d-co-card__top">
        <Mark size={30}>{mark}</Mark>
        <div className="d-co-card__id">
          <span className="d-co-card__name">{name}</span>
          <span className="d-co-card__role">{role}</span>
        </div>
        <Chip tone={stageTone} size="sm">
          {stage}
        </Chip>
      </div>
      <div className="d-co-card__mid">
        {sparkPoints ? <Sparkline points={sparkPoints} width={68} height={22} /> : null}
        {lastTouch ? <span className="d-co-card__touch">{lastTouch}</span> : null}
        {fit != null ? (
          <div className="d-co-card__fit">
            <ProgressBar value={fit} size="sm" label={fitLabel} />
          </div>
        ) : null}
      </div>
      {(next || people) && (
        <div className="d-co-card__foot">
          {next ? <span className="d-co-card__next">{next}</span> : <span />}
          {people ? <span className="d-co-card__people">{people}</span> : null}
        </div>
      )}
    </article>
  );
}
