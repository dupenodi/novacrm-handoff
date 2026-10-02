import { cx } from "../theme/utils";

export type SlashCommand = {
  cmd: string;
  what: string;
};

export type SlashMenuProps = {
  commands: SlashCommand[];
  onSelect?: (cmd: string) => void;
  className?: string;
};

export function SlashMenu({ commands, onSelect, className }: SlashMenuProps) {
  return (
    <div className={cx("a-slash", className)}>
      <div className="a-slash__head">slash commands</div>
      {commands.map((c) => (
        <button
          key={c.cmd}
          type="button"
          className="a-slash__row"
          onClick={() => onSelect?.(c.cmd)}
        >
          <span className="a-slash__cmd">{c.cmd}</span>
          <span className="a-slash__what">{c.what}</span>
        </button>
      ))}
    </div>
  );
}
