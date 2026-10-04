"use client";

import { Fragment } from "react";
import Link from "next/link";
import {
  AGENT_ICON,
  AttentionIcon,
  CheckInboxIcon,
  EmailIcon,
  ForwardIcon,
  HandoffIcon,
  InboxIcon,
  NextStageIcon,
  ReplyIcon,
} from "@/components/ui/icons";
import { useDesk } from "@/components/shell/DeskProvider";
import { Card, EmptyState, Page, PageHeader, Section } from "@/components/ui/Page";
import { Button, Skeleton } from "@/components/ui/primitives";
import { TimeAgo } from "@/components/ui/TimeAgo";
import { parseSender } from "@/lib/format";
import type { DealSummary, Email } from "@/lib/types";
import styles from "./home.module.css";

export function Overview() {
  const { deals, inbox, checking, checkInbox } = useDesk();
  const attention = deals?.filter((deal) => deal.status === "attention") ?? [];
  const canCheck = Boolean(inbox?.watch.gmail.connected);

  return (
    <Page>
      <PageHeader
        title="Overview"
        description="When an account executive emails a closed deal to the CS inbox, two agents take it from there: Intake confirms the plan with the AE by phone and creates the Rocketlane project, then Communication opens the customer's Slack channel."
        actions={
          canCheck ? (
            <Button icon={<CheckInboxIcon />} loading={checking} onClick={() => void checkInbox()}>
              Check inbox
            </Button>
          ) : null
        }
      />

      <Pipeline deals={deals} />

      {attention.length > 0 ? (
        <Section title="Needs attention" description="These stopped and are waiting for someone on the CS team.">
          <div className={styles.attentionList}>
            {attention.map((deal) => (
              <Link key={deal.id} href={`/deals/${deal.id}`} className={styles.attentionItem}>
                <AttentionIcon className={styles.attentionIcon} aria-hidden />
                <span className={styles.attentionBody}>
                  <span className={styles.attentionName}>{deal.customerName ?? deal.subject ?? "New deal"}</span>
                  <span className={styles.attentionReason}>{deal.attention}</span>
                </span>
                <ForwardIcon className={styles.chevron} aria-hidden />
              </Link>
            ))}
          </div>
        </Section>
      ) : null}

      <Section
        title="Inbox activity"
        description="Deal handoffs and AE replies the watcher picked up. Other mail in the inbox is skipped and not shown."
      >
        <Card flush>
          {inbox === null ? (
            <ActivitySkeleton />
          ) : inbox.recent.length === 0 ? (
            <EmptyState icon={<InboxIcon />} title="No deal handoffs yet">
              {inbox.watch.gmail.connected ? (
                <>Send a closed-won email to {inbox.watch.gmail.account ?? "the CS inbox"} and it will show up here within 2 minutes.</>
              ) : (
                <>
                  <Link href="/settings" className={styles.inlineLink}>
                    Connect Gmail
                  </Link>{" "}
                  so the watcher can read the CS inbox.
                </>
              )}
            </EmptyState>
          ) : (
            <ul className={styles.activity}>
              {inbox.recent.map((email) => (
                <ActivityRow key={email.id} email={email} deals={deals ?? []} />
              ))}
            </ul>
          )}
        </Card>
      </Section>
    </Page>
  );
}

function Pipeline({ deals }: { deals: DealSummary[] | null }) {
  const count = (test: (deal: DealSummary) => boolean) => (deals ? deals.filter(test).length : null);
  const stages = [
    {
      icon: <InboxIcon />,
      title: "Inbox watcher",
      text: "Reads new mail and spots deal handoffs.",
      stat: count(() => true),
      statLabel: "handoffs",
    },
    {
      icon: <AGENT_ICON.intake />,
      title: "Intake agent",
      text: "Checks the details, calls the AE, creates the project.",
      stat: count((deal) => deal.status === "intake" || deal.status === "new"),
      statLabel: "in progress",
    },
    {
      icon: <AGENT_ICON.comms />,
      title: "Communication agent",
      text: "Opens the Slack channel and welcomes the customer.",
      stat: count((deal) => deal.status === "done"),
      statLabel: "onboarding",
    },
  ];

  return (
    <ol className={styles.pipeline}>
      {stages.map((stage, index) => (
        <Fragment key={stage.title}>
          <li className={styles.stage}>
            <div className={styles.stageHead}>
              <span className={styles.stageIcon}>{stage.icon}</span>
            </div>
            <p className={styles.stageTitle}>{stage.title}</p>
            <p className={styles.stageText}>{stage.text}</p>
            <p className={styles.stageStat}>
              {stage.stat === null ? <Skeleton width={56} height={12} /> : `${stage.stat} ${stage.statLabel}`}
            </p>
          </li>
          {index < stages.length - 1 ? (
            <li className={styles.stageArrowWrapper} aria-hidden>
              <NextStageIcon className={styles.stageArrow} />
            </li>
          ) : null}
        </Fragment>
      ))}
    </ol>
  );
}

function ActivityRow({ email, deals }: { email: Email; deals: DealSummary[] }) {
  const sender = parseSender(email.sender);
  const deal = email.dealId ? deals.find((d) => d.id === email.dealId) : undefined;
  const dealName = deal?.customerName ?? "this deal";

  const content = (
    <>
      <span className={styles.activityIcon} data-verdict={email.verdict}>
        {email.verdict === "deal" || email.verdict === "duplicate" ? (
          <HandoffIcon />
        ) : email.verdict === "reply" ? (
          <ReplyIcon />
        ) : (
          <EmailIcon />
        )}
      </span>
      <span className={styles.activityBody}>
        <span className={styles.activitySubject}>{email.subject || "(no subject)"}</span>
        <span className={styles.activityMeta}>
          {sender.name}
          {" · "}
          {email.verdict === "deal"
            ? `Deal handoff — started onboarding ${deal?.customerName ? `for ${deal.customerName}` : ""}`.trim()
            : email.verdict === "reply"
              ? `Reply on ${dealName}`
              : email.verdict === "duplicate"
                ? `Another handoff for ${dealName}, added to its onboarding`
                : email.reason || "Not a deal handoff"}
        </span>
      </span>
      <TimeAgo iso={email.receivedAt ?? email.createdAt} className={styles.activityTime} />
    </>
  );

  return (
    <li>
      {email.dealId ? (
        <Link href={`/deals/${email.dealId}`} className={styles.activityRow}>
          {content}
        </Link>
      ) : (
        <div className={styles.activityRow} data-muted>
          {content}
        </div>
      )}
    </li>
  );
}

function ActivitySkeleton() {
  return (
    <div className={styles.activity}>
      {[0, 1, 2].map((i) => (
        <div key={i} className={styles.activityRow}>
          <Skeleton width={28} height={28} />
          <span className={styles.activityBody}>
            <Skeleton width="55%" height={13} />
            <Skeleton width="35%" height={11} style={{ marginTop: 6 }} />
          </span>
        </div>
      ))}
    </div>
  );
}
