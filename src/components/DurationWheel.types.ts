export type DurationWheelProps = {
  value: number; maximum: number; rowHeight: number; label: string; hint: string;
  fontSize?: number;
  disabled?: boolean; autoFocus?: boolean; accessibilityLabel?: string;
  presentationRequest?: number; presentationActive?: boolean;
  onChange: (value: number) => void; onInteractionChange: (busy: boolean) => void;
};
