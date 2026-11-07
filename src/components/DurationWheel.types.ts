export type DurationWheelProps = {
  value: number; maximum: number; rowHeight: number; label: string; hint: string;
  disabled?: boolean; autoFocus?: boolean; accessibilityLabel?: string;
  onChange: (value: number) => void; onInteractionChange: (busy: boolean) => void;
};
