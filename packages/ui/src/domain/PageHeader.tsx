import type { ReactNode } from "react";
import { Chip } from "../theme";

export function PageHeader({
  title,
  badge,
  sub,
  actions,
}: {
  title: string;
  badge?: string;
  sub?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="page-header">
      <div className="page-header__text">
        <div className="page-header__title-row">
          <h1>{title}</h1>
          {badge ? <Chip tone="accent">{badge}</Chip> : null}
        </div>
        {sub ? <p className="page-header__sub">{sub}</p> : null}
      </div>
      {actions ? <div className="page-header__actions">{actions}</div> : null}
    </div>
  );
}
