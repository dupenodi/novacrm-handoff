"use client";

import { useState } from "react";
import { CallIcon, ChannelIcon, EmailIcon, ExpandIcon, ProjectIcon, QuoteIcon } from "@/components/ui/icons";
import { Badge, Spinner, cx, type Tone } from "@/components/ui/primitives";
import { Elapsed } from "@/components/ui/TimeAgo";
import { formatDay } from "@/lib/format";
import type {
  CallAttempt,
  CallOutput,
  CallProgress,
  ChannelOutput,
  CustomerEmailOutput,
  ProjectOutput,
  ReadEmailOutput,
  Staffing,
  TemplateSummary,
  TemplatesOutput,
  ToolName,
  ToolOutputs,
  WelcomeOutput,
} from "@/lib/step-outputs";
import { FIELD_LABEL, type CallOutcome, type DealField, type Step } from "@/lib/types";
import { SlackText } from "./SlackText";
import styles from "./deal.module.css";

/** A step that ran but came back with a result someone should notice, like a call nobody answered. */
export function isWarning(step: Step): boolean {
  if (step.status !== "done" || step.output == null) return false;
  if (step.tool === "call_ae_to_confirm_plan") {
    const call = step.output as CallOutput;
    return call.outcome !== "confirmed" || call.stillMissing.length > 0;
  }
  if (step.tool === "read_handoff_email") return (step.output as ReadEmailOutput).missing.length > 0;
  return false;
}

/** The readable result of a tool step. Raw inputs and outputs stay in the step's log. */
export function StepResult({ step }: { step: Step }) {
  const tool = step.tool as ToolName | null;

  if (step.status === "running") {
    if (tool !== "call_ae_to_confirm_plan") return null;
    const progress = step.output as CallProgress | null;
    if (progress?.phase === "retrying") return <CallRetrying earlier={progress.earlier} />;
    return <LiveCall since={step.startedAt} attempt={progress?.attempt ?? 1} />;
  }
  if (step.status !== "done" || step.output == null || !tool) return null;

  const output = step.output as ToolOutputs[ToolName];
  switch (tool) {
    case "read_handoff_email":
      return <Fields output={output as ReadEmailOutput} />;
    case "call_ae_to_confirm_plan":
      return <CallResult output={output as CallOutput} />;
    case "list_project_templates":
      return <Templates output={output as TemplatesOutput} />;
    case "create_rocketlane_project":
      return <Project output={output as ProjectOutput} />;
    case "email_customer":
      return <SentEmail output={output as CustomerEmailOutput} />;
    case "create_slack_channel":
      return <Channel output={output as ChannelOutput} />;
    case "post_welcome_message":
      return <Welcome output={output as WelcomeOutput} />;
    default:
      return null;
  }
}

// —— Email details ———————————————————————————————————————————————————————

const FIELD_ORDER: DealField[] = ["customerName", "contactName", "contactEmail", "aeName", "aeEmail", "aePhone", "opportunityUrl"];

function Fields({ output }: { output: ReadEmailOutput }) {
  const missing = new Set(output.missing);
  return (
    <dl className={styles.fields}>
      {FIELD_ORDER.map((field) => {
        const value = output.fields[field];
        const isMissing = missing.has(field);
        return (
          <div key={field} className={styles.field}>
            <dt>{FIELD_LABEL[field]}</dt>
            <dd className={cx(isMissing && styles.fieldMissing, !value && !isMissing && styles.fieldEmpty)}>
              {value ? <span className={styles.fieldValue}>{value}</span> : null}
              {isMissing ? <span className={styles.missingTag}>{value ? "Not usable" : "Missing"}</span> : null}
              {!value && !isMissing ? "Not given" : null}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

function SentEmail({ output }: { output: CustomerEmailOutput }) {
  const { cc } = output;
  return (
    <div className={styles.card}>
      <div className={styles.cardMeta}>
        <span className={styles.cardTitleIcon}>
          <EmailIcon aria-hidden />
          <span>
            To <strong>{output.to}</strong>
            {cc.length ? <span className={styles.cardMetaSub}> · cc {cc.join(", ")}</span> : null}
          </span>
        </span>
        <span className={styles.cardMetaSub}>{output.subject}</span>
      </div>
      <div className={styles.cardBodyText}>{output.body}</div>
    </div>
  );
}

// —— Call ————————————————————————————————————————————————————————————————

const OUTCOME: Record<CallOutcome, { label: string; tone: Tone }> = {
  confirmed: { label: "Plan confirmed", tone: "green" },
  ambiguous: { label: "Unclear answer", tone: "amber" },
  callback_requested: { label: "Call back requested", tone: "amber" },
  wrong_person: { label: "Wrong person", tone: "amber" },
  deal_not_closed: { label: "Deal not closed", tone: "red" },
  declined: { label: "Declined", tone: "red" },
  no_answer: { label: "No answer", tone: "amber" },
  cut_off: { label: "Call cut short", tone: "amber" },
  busy: { label: "Line busy", tone: "amber" },
  failed: { label: "Call failed", tone: "red" },
};

function LiveCall({ since, attempt }: { since: string; attempt: number }) {
  return (
    <div className={cx(styles.card, styles.liveCall)}>
      <span className={styles.liveCallIcon} aria-hidden>
        <CallIcon />
      </span>
      <div>
        <p className={styles.liveCallTitle}>{attempt > 1 ? `On the phone · call ${attempt}` : "On the phone"}</p>
        <p className={styles.liveCallText}>
          Nova, the voice agent, is asking which plan the customer signed. <Elapsed since={since} />
        </p>
      </div>
    </div>
  );
}

/** The last call didn't reach anyone; the tool is about to dial again. */
function CallRetrying({ earlier }: { earlier: CallAttempt[] }) {
  const last = earlier.at(-1);
  return (
    <div className={cx(styles.card, styles.liveCall, styles.liveCallEnded)}>
      <span className={styles.liveCallIcon} aria-hidden>
        <CallIcon />
      </span>
      <div>
        <p className={styles.liveCallTitle}>Calling again shortly</p>
        <p className={styles.liveCallText}>
          {last ? `Call ${last.attempt}: ${OUTCOME[last.outcome].label.toLowerCase()}. ` : ""}Nova will try once more in a few seconds.
        </p>
      </div>
      <Spinner size={14} className={styles.liveCallSpinner} />
    </div>
  );
}

function EarlierCalls({ calls }: { calls: CallAttempt[] }) {
  if (!calls.length) return null;
  return (
    <ul className={styles.earlierCalls}>
      {calls.map((call) => (
        <li key={call.attempt}>
          <span className={styles.cardMetaSub}>Call {call.attempt}</span>
          <Badge tone={OUTCOME[call.outcome].tone}>{OUTCOME[call.outcome].label}</Badge>
          {call.notes ? <span className={styles.earlierNote}>{call.notes}</span> : null}
        </li>
      ))}
    </ul>
  );
}

function CallResult({ output }: { output: CallOutput }) {
  const [showTranscript, setShowTranscript] = useState(false);
  const outcome = OUTCOME[output.outcome];

  return (
    <div className={styles.card}>
      <div className={styles.cardRow}>
        <Badge tone={outcome.tone}>{outcome.label}</Badge>
        {output.plan ? <Badge tone="accent">{output.plan}</Badge> : null}
        <span className={styles.cardMetaSub}>
          <CallIcon className={styles.inlineIcon} aria-hidden />
          {output.phone} · call {output.attempt}
        </span>
      </div>

      <EarlierCalls calls={output.earlier} />

      <dl className={styles.kv}>
        <div>
          <dt>Offered</dt>
          <dd>{output.options.join(" · ")}</dd>
        </div>
        {Object.entries(output.collected).map(([field, value]) => (
          <div key={field}>
            <dt>{FIELD_LABEL[field as DealField]}</dt>
            <dd>
              {value} <span className={styles.cardMetaSub}>from the call</span>
            </dd>
          </div>
        ))}
        {output.stillMissing.length ? (
          <div>
            <dt>Still missing</dt>
            <dd className={styles.fieldMissing}>{output.stillMissing.map((field) => FIELD_LABEL[field]).join(", ")}</dd>
          </div>
        ) : null}
      </dl>

      {output.quote ? (
        <blockquote className={styles.quote}>
          <QuoteIcon className={styles.quoteIcon} aria-hidden />
          {output.quote}
        </blockquote>
      ) : null}

      {output.callbackTime || output.notes || output.failureReason ? (
        <dl className={styles.kv}>
          {output.callbackTime ? (
            <div>
              <dt>Call back</dt>
              <dd>{output.callbackTime}</dd>
            </div>
          ) : null}
          {output.notes ? (
            <div>
              <dt>Notes</dt>
              <dd>{output.notes}</dd>
            </div>
          ) : null}
          {output.failureReason ? (
            <div>
              <dt>Reason</dt>
              <dd>{output.failureReason}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}

      {output.transcript.length > 0 ? (
        <>
          <button
            type="button"
            className={styles.textButton}
            aria-expanded={showTranscript}
            onClick={() => setShowTranscript((v) => !v)}
          >
            <ExpandIcon className={cx(styles.rawChevron, showTranscript && styles.rawChevronOpen)} aria-hidden />
            {showTranscript ? "Hide transcript" : `Transcript · ${output.transcript.length} turns`}
          </button>
          {showTranscript ? (
            <ol className={styles.transcript}>
              {output.transcript.map((turn, index) => (
                <li key={index} className={cx(styles.turnLine, turn.speaker === "nova" && styles.turnLineNova)}>
                  <span className={styles.turnSpeaker}>{turn.speaker === "nova" ? "Nova" : turn.speaker === "ae" ? "AE" : "Other"}</span>
                  <span className={styles.turnText}>{turn.text}</span>
                </li>
              ))}
            </ol>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

// —— Rocketlane ——————————————————————————————————————————————————————————

function Project({ output }: { output: ProjectOutput }) {
  const { template } = output;
  return (
    <div className={styles.card}>
      <div className={styles.cardTitleRow}>
        <span className={styles.cardTitleIcon}>
          <ProjectIcon aria-hidden />
          {output.projectName}
        </span>
        <Badge tone="green">New</Badge>
      </div>
      <dl className={styles.kv}>
        <div>
          <dt>Template</dt>
          <dd>{template.name}</dd>
        </div>
        <div>
          <dt>Timeline</dt>
          <dd>
            {formatDay(output.startDate)} → {formatDay(output.dueDate)} · {template.workingDays} working days
          </dd>
        </div>
        <div>
          <dt>CSM</dt>
          <dd>{staffingLabel(template.staffing)}</dd>
        </div>
        <div>
          <dt>Plan</dt>
          <dd>
            {template.phases.length} phases · {template.taskCount} tasks
          </dd>
        </div>
      </dl>
      <Phases template={template} />
    </div>
  );
}

function Phases({ template }: { template: TemplateSummary }) {
  return (
    <ol className={styles.phases}>
      {template.phases.map((phase, index) => (
        <li key={`${index}-${phase.name}`}>
          <span className={styles.phaseNumber}>{index + 1}</span>
          {phase.name}
          <span className={styles.phaseCount}>{phase.taskCount}</span>
        </li>
      ))}
    </ol>
  );
}

function staffingLabel(staffing: Staffing): string {
  return staffing.model === "dedicated" ? `Dedicated CSM · ${staffing.csm}` : "Pooled CSM team";
}

/** The templates the agent chose from, as Rocketlane describes them. */
function Templates({ output }: { output: TemplatesOutput }) {
  return (
    <ul className={styles.templateList}>
      {output.templates.map((template) => (
        <li key={template.templateId} className={styles.card}>
          <div className={styles.cardTitleRow}>
            <span className={styles.cardTitleIcon}>
              <ProjectIcon aria-hidden />
              {template.name}
            </span>
            <span className={styles.cardMetaSub}>
              {template.workingDays} working days · {template.phases.length} phases · {template.taskCount} tasks ·{" "}
              {staffingLabel(template.staffing)}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

// —— Slack ———————————————————————————————————————————————————————————————

function Channel({ output }: { output: ChannelOutput }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardTitleRow}>
        <span className={styles.cardTitleIcon}>
          <ChannelIcon aria-hidden />
          {output.name}
        </span>
        {output.simulated ? <Badge tone="neutral">Simulated</Badge> : null}
      </div>
      <p className={styles.channelTopic}>{output.topic}</p>
    </div>
  );
}

function Welcome({ output }: { output: WelcomeOutput }) {
  return (
    <div className={cx(styles.card, styles.slackMessage)}>
      <span className={styles.slackAvatar} aria-hidden>
        N
      </span>
      <div className={styles.slackBody}>
        <div className={styles.slackHead}>
          <span className={styles.slackName}>NovaCRM Onboarding</span>
          <span className={styles.slackApp}>APP</span>
          <span className={styles.cardMetaSub}>in #{output.channelName}</span>
          {output.simulated ? <Badge tone="neutral">Simulated</Badge> : null}
        </div>
        <SlackText text={output.text} />
      </div>
    </div>
  );
}
