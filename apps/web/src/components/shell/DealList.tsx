"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Skeleton, StatusDot, cx } from "@/components/ui/primitives";
import { TimeAgo } from "@/components/ui/TimeAgo";
import { DEAL_STATUS } from "@/lib/deal-status";
import { useDesk } from "./DeskProvider";
import styles from "./shell.module.css";

export function DealList() {
  const { deals, dealsError } = useDesk();
  const pathname = usePathname();

  return (
    <section className={styles.deals} aria-label="Onboardings">
      <div className={styles.sectionLabel}>
        <span>Onboardings</span>
        {deals?.length ? <span className={styles.count}>{deals.length}</span> : null}
      </div>

      <div className={styles.dealScroll}>
        {deals === null ? (
          dealsError ? (
            <p className={styles.listNote}>Couldn&apos;t load onboardings. {dealsError}</p>
          ) : (
            <div className={styles.listSkeleton}>
              {[0, 1, 2].map((i) => (
                <div key={i} className={styles.dealSkeleton}>
                  <Skeleton width="60%" height={13} />
                  <Skeleton width="40%" height={11} style={{ marginTop: 7 }} />
                </div>
              ))}
            </div>
          )
        ) : deals.length === 0 ? (
          <p className={styles.listNote}>New deal handoffs will show up here.</p>
        ) : (
          <ul className={styles.dealList}>
            {deals.map((deal) => {
              const status = DEAL_STATUS[deal.status];
              const href = `/deals/${deal.id}`;
              const active = pathname === href;
              return (
                <li key={deal.id}>
                  <Link href={href} className={cx(styles.dealItem, active && styles.dealItemActive)} aria-current={active ? "page" : undefined}>
                    <span className={styles.dealRow}>
                      <span className={styles.dealName}>{deal.customerName ?? deal.subject ?? "New deal"}</span>
                      <TimeAgo iso={deal.createdAt} className={styles.dealTime} />
                    </span>
                    <span className={styles.dealRow}>
                      <span className={styles.dealStatus}>
                        <StatusDot tone={status.tone} pulse={status.live} />
                        {status.label}
                      </span>
                      {deal.planName ? <span className={styles.dealPlan}>{deal.planName}</span> : null}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
