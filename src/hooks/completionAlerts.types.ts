import type { CompletionPolicy, CompletionRequest } from '../core/completionAlerts';
import type { NativeNotification, NativeNotificationResponse, NotificationDescriptor } from './notificationTypes';

export type NativePlaybackSnapshot = {
  status: 'idle' | 'pending' | 'playing'; request: CompletionRequest | null; generation: number; revision: number;
  error: boolean; startedAt: number | null; remainingMs: number;
};
export type CompletionNative = {
  protocolVersion: number;
  capableAsync(): Promise<boolean>;
  upsertAsync(identifier: string, descriptor: NotificationDescriptor): Promise<string | null>;
  pendingAsync(): Promise<NativeNotification[]>;
  presentedAsync(): Promise<NativeNotification[]>;
  cancelAsync(identifier: string): Promise<void>;
  dismissAsync(identifier: string): Promise<void>;
  requestPlaybackAsync(request: CompletionRequest & { stopLabel?: string }): Promise<boolean>;
  stopPlaybackAsync(owner: string | null, eventId: string | null, generation: number | null): Promise<void>;
  setPolicyAsync(policy: CompletionPolicy): Promise<void>;
  snapshotAsync(): Promise<NativePlaybackSnapshot>;
  lastResponseAsync(): Promise<NativeNotificationResponse | null>;
  clearResponseAsync(identifier: string | null): Promise<void>;
  addListener<K extends keyof CompletionEvents>(event: K, listener: (value: CompletionEvents[K]) => void): { remove(): void };
};
type CompletionEvents = { playback: NativePlaybackSnapshot; received: NativeNotification; response: NativeNotificationResponse };
