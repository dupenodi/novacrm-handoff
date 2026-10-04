import { AttentionIcon, CallIcon, ChannelIcon, DoneIcon, HandoffIcon, ProjectIcon } from "@/components/ui/icons";
import { Spinner, cx } from "@/components/ui/primitives";
import type { DealView } from "@/lib/types";
import styles from "./deal.module.css";

type MilestoneState = "done" | "active" | "blocked" | "pending";

/** The four things that have to happen for a customer, and where this deal is. */
export function Progress({ view }: { view: DealView }) {
  const { deal } = view;
  const milestones = [
    { label: "Handoff received", icon: HandoffIcon, detail: "From the AE's email", done: true },
    {
      label: "Plan confirmed",
      icon: CallIcon,
      detail: deal.planName ? `${deal.planName}, on a call` : "By phone with the AE",
      done: Boolean(deal.planConfirmedAt),
    },
    {
      label: "Project created",
      icon: ProjectIcon,
      detail: deal.rocketlaneTemplateName ?? (deal.rocketlaneProjectId ? "In Rocketlane" : "From the plan's template"),
      done: Boolean(deal.rocketlaneProjectId),
    },
    {
      label: "Customer welcomed",
      icon: ChannelIcon,
      detail: deal.slackChannelName ? `#${deal.slackChannelName}` : "Slack channel and email",
      done: Boolean(deal.slackWelcomeAt && deal.customerEmailedAt),
    },
  ];
  const current = milestones.findIndex((m) => !m.done);

  const stateOf = (index: number): MilestoneState => {
    if (milestones[index]?.done) return "done";
    if (index !== current) return "pending";
    return deal.status === "attention" ? "blocked" : "active";
  };

  return (
    <ol className={styles.progress} aria-label="Onboarding progress">
      {milestones.map((milestone, index) => {
        const state = stateOf(index);
        return (
          <li key={milestone.label} className={cx(styles.milestone, styles[`milestone_${state}`])}>
            <span className={styles.milestoneIcon} aria-hidden>
              {state === "done" ? (
                <DoneIcon strokeWidth={2.5} />
              ) : state === "active" ? (
                <Spinner size={13} />
              ) : state === "blocked" ? (
                <AttentionIcon />
              ) : (
                <milestone.icon />
              )}
            </span>
            <span className={styles.milestoneText}>
              <span className={styles.milestoneLabel}>{milestone.label}</span>
              <span className={styles.milestoneDetail}>
                {state === "blocked" ? "Waiting on a person" : milestone.detail}
              </span>
            </span>
            <span className="sr-only">{state}</span>
          </li>
        );
      })}
    </ol>
  );
}
