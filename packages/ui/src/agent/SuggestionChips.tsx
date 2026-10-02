import { Button } from "../theme";
import { cx } from "../theme/utils";

export type SuggestionChipsProps = {
  suggestions: string[];
  onSelect?: (suggestion: string) => void;
  className?: string;
};

export function SuggestionChips({
  suggestions,
  onSelect,
  className,
}: SuggestionChipsProps) {
  if (suggestions.length === 0) return null;

  return (
    <div className={cx("a-suggestions", className)}>
      {suggestions.map((s) => (
        <Button key={s} variant="secondary" onClick={() => onSelect?.(s)}>
          {s}
        </Button>
      ))}
    </div>
  );
}
