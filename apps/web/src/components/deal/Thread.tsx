"use client";

import { useState } from "react";
import { AGENT_ICON, AttentionIcon, DoneIcon, ExpandIcon, FailedIcon, RetryIcon, SuccessIcon } from "@/components/ui/icons";
import { Button, Spinner, cx } from "@/components/ui/primitives";
import { TimeAgo } from "@/components/ui/TimeAgo";
import { formatDateTime, formatDuration, formatTime, initials, parseSender } from "@/lib/format";
import { AGENT_LABEL, type AgentName, type DealView, type Email, type Run, type Step } from "@/lib/types";
import { StepResult, isWarning } from "./StepResult";
import styles from "./deal.module.css";

type ThreadItem = { kind: "email"; email: Email; at: string } | { kind: "run"; run: Run; at: string };

/** The deal as a conversation: the AE's email, any replies, and each agent's turn. */
export function Thread({ view, onRetry, retrying }: { view: DealView; onRetry: () => void; retrying: boolean }) {
  const { deal, email, replies, runs, steps } = view;

  const items: ThreadItem[] = [
    ...replies.map((reply): ThreadItem => ({ kind: "email", email: reply, at: reply.receivedAt ?? reply.createdAt })),
    ...runs.map((run): ThreadItem => ({ kind: "run", run, at: run.startedAt })),
  ].sort((a, b) => a.at.localeCompare(b.at));

  const lastRun = runs.at(-1);
  const waitingToStart = deal.status === "new" && runs.length === 0;
  const handingOff =
    lastRun?.agent === "intake" && lastRun.status === "done" && !runs.some((run) => run.agent === "comms" && run.startedAt > lastRun.startedAt) && deal.status !== "attention" && deal.status !== "done";

  return (
    <div className={styles.thread}>
      {email ? <EmailMessage email={email} label="Deal handoff" /> : null}

      {items.map((item) =>
        item.kind === "email" ? (
          <EmailMessage
            key={item.email.id}
            email={item.email}
            label={item.email.verdict === "duplicate" ? "Another handoff" : "Reply"}
          />
        ) : (
          <AgentTurn
            key={item.run.id}
            run={item.run}
            steps={steps.filter((step) => step.runId === item.run.id)}
            canRetry={deal.status === "attention" && item.run.id === lastRun?.id}
            onRetry={onRetry}
            retrying={retrying}
          />
        ),
      )}

      {waitingToStart ? <Pending agent="intake" text="Starting the Intake agent…" /> : null}
      {handingOff ? <Pending agent="comms" text="Handing off to the Communication agent…" /> : null}
    </div>
  );
}

// —— Email ———————————————————————————————————————————————————————————————

const CLAMP_LINES = 14;

function EmailMessage({ email, label }: { email: Email; label: string }) {
  const sender = parseSender(email.sender);
  const body = email.body?.trim() || "(This email has no text.)";
  const long = body.split("\n").length > CLAMP_LINES || body.length > 1200;
  const [expanded, setExpanded] = useState(false);
  const at = email.receivedAt ?? email.createdAt;

  return (
    <article className={styles.email}>
      <div className={styles.emailHead}>
        <span className={styles.avatar} aria-hidden>
          {initials(sender.name)}
        </span>
        <div className={styles.emailFrom}>
          <span className={styles.emailName}>{sender.name}</span>
          {sender.address && sender.address !== sender.name ? (
            <span className={styles.emailAddress}>{sender.address}</span>
          ) : null}
        </div>
        <span className={styles.emailLabel}>{label}</span>
        <time className={styles.emailTime} dateTime={at} title={formatDateTime(at)}>
          {formatDateTime(at)}
        </time>
      </div>
      <div className={styles.emailContent}>
        {email.subject ? <h2 className={styles.emailSubject}>{email.subject}</h2> : null}
        <div className={cx(styles.emailBody, long && !expanded && styles.emailBodyClamped)}>{body}</div>
        {long ? (
          <button type="button" className={styles.textButton} onClick={() => setExpanded((v) => !v)}>
            {expanded ? "Show less" : "Show the full email"}
          </button>
        ) : null}
      </div>
    </article>
  );
}

// —— Agent turn ——————————————————————————————————————————————————————————

function AgentAvatar({ agent }: { agent: AgentName }) {
  const Icon = AGENT_ICON[agent];
  return (
    <span className={cx(styles.agentAvatar, styles[`agent_${agent}`])} aria-hidden>
      <Icon />
    </span>
  );
}

function AgentTurn({
  run,
  steps,
  canRetry,
  onRetry,
  retrying,
}: {
  run: Run;
  steps: Step[];
  canRetry: boolean;
  onRetry: () => void;
  retrying: boolean;
}) {
  const running = run.status === "running";
  return (
    <section className={styles.turn} aria-label={AGENT_LABEL[run.agent]}>
      <AgentAvatar agent={run.agent} />
      <div className={styles.turnBody}>
        <div className={styles.turnHead}>
          <span className={styles.turnName}>{AGENT_LABEL[run.agent]}</span>
          <span className={styles.turnMeta}>
            {running ? (
              <>
                Working · started <TimeAgo iso={run.startedAt} />
              </>
            ) : run.finishedAt ? (
              <>
                {formatTime(run.startedAt)} · took {formatDuration(run.startedAt, run.finishedAt)}
              </>
            ) : (
              formatTime(run.startedAt)
            )}
          </span>
        </div>

        {steps.length > 0 ? (
          <ol className={styles.steps}>
            {steps.map((step) =>
              step.kind === "note" ? (
                <li key={step.id} className={styles.note}>
                  {step.title}
                </li>
              ) : (
                <StepRow key={step.id} step={step} />
              ),
            )}
          </ol>
        ) : null}

        {running && !steps.some((step) => step.status === "running") ? (
          <div className={styles.thinking}>
            <Spinner size={14} />
            <span>Thinking…</span>
          </div>
        ) : null}

        {run.status !== "running" && run.summary ? (
          <Outcome run={run} canRetry={canRetry} onRetry={onRetry} retrying={retrying} />
        ) : null}
      </div>
    </section>
  );
}

function Outcome({ run, canRetry, onRetry, retrying }: { run: Run; canRetry: boolean; onRetry: () => void; retrying: boolean }) {
  const done = run.status === "done";
  return (
    <div className={cx(styles.outcome, done ? styles.outcomeDone : styles.outcomeAttention)}>
      {done ? <SuccessIcon className={styles.outcomeIcon} aria-hidden /> : <AttentionIcon className={styles.outcomeIcon} aria-hidden />}
      <div className={styles.outcomeBody}>
        <p className={styles.outcomeTitle}>{done ? "Done" : "Needs your attention"}</p>
        <p className={styles.outcomeText}>{run.summary}</p>
        {canRetry ? (
          <div className={styles.outcomeActions}>
            <Button size="sm" variant="secondary" icon={<RetryIcon />} loading={retrying} onClick={onRetry}>
              Retry from here
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// —— Step ————————————————————————————————————————————————————————————————

function StepRow({ step }: { step: Step }) {
  const [open, setOpen] = useState(false);
  const hasDetails = step.input != null || step.output != null || step.error != null;
  const warning = isWarning(step);

  return (
    <li className={cx(styles.step, styles[`step_${warning ? "warning" : step.status}`])}>
      <span className={styles.stepIcon} aria-hidden>
        {step.status === "running" ? (
          <Spinner size={14} />
        ) : warning ? (
          <AttentionIcon />
        ) : step.status === "done" ? (
          <DoneIcon strokeWidth={2.5} />
        ) : (
          <FailedIcon strokeWidth={2.5} />
        )}
      </span>
      <div className={styles.stepMain}>
        <div className={styles.stepHead}>
          <span className={styles.stepTitle}>{step.title}</span>
          <span className={styles.stepTime}>
            {step.finishedAt ? formatDuration(step.startedAt, step.finishedAt) : null}
          </span>
        </div>
        {step.why ? <p className={styles.stepWhy}>{step.why}</p> : null}

        <StepResult step={step} />

        {step.status === "failed" && step.error ? <p className={styles.stepError}>{step.error}</p> : null}

        {hasDetails && step.status !== "running" ? (
          <div className={styles.raw}>
            <button
              type="button"
              className={styles.rawToggle}
              aria-expanded={open}
              onClick={() => setOpen((value) => !value)}
            >
              <ExpandIcon className={cx(styles.rawChevron, open && styles.rawChevronOpen)} aria-hidden />
              Log
            </button>
            {open ? (
              <div className={styles.rawBody}>
                <RawBlock label="Tool" value={step.tool} />
                <RawBlock label="Started" value={formatDateTime(step.startedAt)} />
                <RawBlock label="Input" value={step.input} />
                {step.output != null ? <RawBlock label="Output" value={step.output} /> : null}
                {step.error ? <RawBlock label="Error" value={step.error} /> : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </li>
  );
}

function RawBlock({ label, value }: { label: string; value: unknown }) {
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  return (
    <div className={styles.rawBlock}>
      <span className={styles.rawLabel}>{label}</span>
      <pre className={styles.rawPre}>{text}</pre>
    </div>
  );
}

function Pending({ agent, text }: { agent: AgentName; text: string }) {
  return (
    <section className={styles.turn}>
      <AgentAvatar agent={agent} />
      <div className={styles.turnBody}>
        <div className={styles.turnHead}>
          <span className={styles.turnName}>{AGENT_LABEL[agent]}</span>
        </div>
        <div className={styles.thinking}>
          <Spinner size={14} />
          <span>{text}</span>
        </div>
      </div>
    </section>
  );
}
