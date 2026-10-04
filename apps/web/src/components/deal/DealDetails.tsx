import type { ReactNode } from "react";
import { ExternalIcon } from "@/components/ui/icons";
import { Badge } from "@/components/ui/primitives";
import { formatDateTime, formatDay } from "@/lib/format";
import type { ReadEmailOutput } from "@/lib/step-outputs";
import type { DealField, DealView } from "@/lib/types";
import styles from "./deal.module.css";

/** Everything known about the deal, as it fills in. */
export function DealDetails({ view }: { view: DealView }) {
  const { deal, email } = view;
  const read = view.steps.findLast((step) => step.tool === "read_handoff_email" && step.status === "done");
  const missing = new Set<DealField>((read?.output as ReadEmailOutput | undefined)?.missing ?? []);
  const notRead = !read;

  const value = (field: DealField, content: ReactNode = deal[field]) => {
    if (deal[field]) return content;
    if (missing.has(field)) return <span className={styles.detailMissing}>Missing</span>;
    return <span className={styles.detailEmpty}>{notRead ? "Not read yet" : "Not given"}</span>;
  };

  return (
    <div className={styles.details}>
      <DetailGroup title="Customer">
        <Detail label="Company">{value("customerName")}</Detail>
        <Detail label="Contact">{value("contactName")}</Detail>
        <Detail label="Email">
          {value(
            "contactEmail",
            <a href={`mailto:${deal.contactEmail}`} className={styles.detailTruncate} title={deal.contactEmail ?? undefined}>
              {deal.contactEmail}
            </a>,
          )}
        </Detail>
      </DetailGroup>

      <DetailGroup title="Account executive">
        <Detail label="Name">{value("aeName")}</Detail>
        <Detail label="Email">
          {value(
            "aeEmail",
            <span className={styles.detailTruncate} title={deal.aeEmail ?? undefined}>
              {deal.aeEmail}
            </span>,
          )}
        </Detail>
        {deal.opportunityUrl ? (
          <Detail label="Opportunity">
            {/^https?:\/\//.test(deal.opportunityUrl) ? (
              <a href={deal.opportunityUrl} target="_blank" rel="noreferrer" className={styles.detailLink}>
                Salesforce <ExternalIcon aria-hidden />
              </a>
            ) : (
              deal.opportunityUrl
            )}
          </Detail>
        ) : null}
      </DetailGroup>

      <DetailGroup title="Plan">
        <Detail label="Plan">
          {deal.planName ? (
            <Badge tone="accent">{deal.planName}</Badge>
          ) : (
            <span className={styles.detailEmpty}>Confirmed by phone</span>
          )}
        </Detail>
        {deal.planQuote ? (
          <Detail label="AE said">
            <span className={styles.detailQuote}>“{deal.planQuote}”</span>
          </Detail>
        ) : null}
        {deal.planConfirmedAt ? <Detail label="Confirmed">{formatDateTime(deal.planConfirmedAt)}</Detail> : null}
      </DetailGroup>

      <DetailGroup title="Onboarding">
        <Detail label="Rocketlane">
          {deal.rocketlaneProjectName ? (
            view.rocketlaneUrl ? (
              <a href={view.rocketlaneUrl} target="_blank" rel="noreferrer" className={styles.detailLink}>
                {deal.rocketlaneProjectName} <ExternalIcon aria-hidden />
              </a>
            ) : (
              deal.rocketlaneProjectName
            )
          ) : (
            <span className={styles.detailEmpty}>Not created yet</span>
          )}
        </Detail>
        {deal.rocketlaneTemplateName ? <Detail label="Template">{deal.rocketlaneTemplateName}</Detail> : null}
        {deal.projectStartDate && deal.projectDueDate ? (
          <Detail label="Timeline">
            {formatDay(deal.projectStartDate)} → {formatDay(deal.projectDueDate)}
          </Detail>
        ) : null}
        <Detail label="Slack">
          {deal.slackChannelName ? (
            <span className={styles.detailInline}>
              <span className={styles.detailTruncate} title={`#${deal.slackChannelName}`}>
                #{deal.slackChannelName}
              </span>
              {deal.slackSimulated ? <Badge>Simulated</Badge> : null}
            </span>
          ) : (
            <span className={styles.detailEmpty}>Not created yet</span>
          )}
        </Detail>
        <Detail label="Customer">
          {deal.customerEmailedAt ? (
            `Emailed ${formatDateTime(deal.customerEmailedAt)}`
          ) : (
            <span className={styles.detailEmpty}>Not emailed yet</span>
          )}
        </Detail>
      </DetailGroup>

      {email ? (
        <DetailGroup title="Source">
          <Detail label="Received">{formatDateTime(email.receivedAt ?? email.createdAt)}</Detail>
          <Detail label="Deal id">
            <code className={styles.detailCode}>{deal.id}</code>
          </Detail>
        </DetailGroup>
      ) : null}
    </div>
  );
}

function DetailGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={styles.detailGroup}>
      <h3 className={styles.detailTitle}>{title}</h3>
      <dl className={styles.detailList}>{children}</dl>
    </section>
  );
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.detail}>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
