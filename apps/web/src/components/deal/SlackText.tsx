import type { ReactNode } from "react";
import styles from "./deal.module.css";

/**
 * Renders the Slack markdown subset agents write: *bold*, _italic_, `code`, <url|label> links
 * and "•" / "-" bullet lines. Everything else is plain text, so nothing is injected as HTML.
 */
export function SlackText({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let bullets: string[] = [];

  const flushBullets = () => {
    if (bullets.length === 0) return;
    blocks.push(
      <ul key={`ul-${blocks.length}`} className={styles.slackList}>
        {bullets.map((item, index) => (
          <li key={index}>{inline(item)}</li>
        ))}
      </ul>,
    );
    bullets = [];
  };

  for (const line of text.replace(/\r\n/g, "\n").split("\n")) {
    const bullet = line.match(/^\s*(?:[•\-*]|\d+\.)\s+(.*)$/);
    if (bullet && !/^\s*\*[^*]+\*\s*$/.test(line)) {
      bullets.push(bullet[1] ?? "");
      continue;
    }
    flushBullets();
    blocks.push(
      line.trim() ? (
        <p key={`p-${blocks.length}`} className={styles.slackLine}>
          {inline(line)}
        </p>
      ) : (
        <div key={`gap-${blocks.length}`} className={styles.slackGap} />
      ),
    );
  }
  flushBullets();

  return <div className={styles.slackText}>{blocks}</div>;
}

const TOKEN = /(\*[^*\n]+\*|_[^_\n]+_|`[^`\n]+`|<https?:\/\/[^>|]+(?:\|[^>]+)?>)/g;

function inline(text: string): ReactNode[] {
  return text.split(TOKEN).map((part, index) => {
    if (!part) return null;
    if (/^\*[^*]+\*$/.test(part)) return <strong key={index}>{part.slice(1, -1)}</strong>;
    if (/^_[^_]+_$/.test(part)) return <em key={index}>{part.slice(1, -1)}</em>;
    if (/^`[^`]+`$/.test(part)) return <code key={index}>{part.slice(1, -1)}</code>;
    const link = part.match(/^<(https?:\/\/[^>|]+)(?:\|([^>]+))?>$/);
    if (link) {
      return (
        <a key={index} href={link[1]} target="_blank" rel="noreferrer">
          {link[2] ?? link[1]}
        </a>
      );
    }
    return part;
  });
}
