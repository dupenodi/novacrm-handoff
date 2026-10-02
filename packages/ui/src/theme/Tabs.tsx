"use client";

import type { ReactNode } from "react";
import { cx } from "./utils";

export type TabDescriptor = {
  id: string;
  content: ReactNode;
  panelID?: string;
  accessibilityLabel?: string;
};

export type TabsProps = {
  tabs: TabDescriptor[];
  selected: number;
  onSelect: (index: number) => void;
  children?: ReactNode;
};

export function Tabs({ tabs, selected, onSelect, children }: TabsProps) {
  return (
    <div className="t-tabs">
      <div className="t-tabs__list" role="tablist">
        {tabs.map((tab, index) => {
          const isSelected = index === selected;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={tab.id}
              aria-selected={isSelected}
              aria-controls={tab.panelID}
              aria-label={
                typeof tab.accessibilityLabel === "string"
                  ? tab.accessibilityLabel
                  : undefined
              }
              className={cx(
                "t-tabs__tab",
                isSelected && "t-tabs__tab--selected",
              )}
              onClick={() => onSelect(index)}
            >
              {tab.content}
            </button>
          );
        })}
      </div>
      {children ? (
        <div
          className="t-tabs__panel"
          role="tabpanel"
          id={tabs[selected]?.panelID}
          aria-labelledby={tabs[selected]?.id}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
