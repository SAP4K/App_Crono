// SDK handlers normally run in the foreground, but activity can change before
// a queued handler executes. Native background presentation does not need JS.
export function notificationPresentation(active: boolean, sound: unknown) {
  return { shouldShowBanner: !active, shouldShowList: !active,
    shouldPlaySound: !active && (typeof sound === 'string' || sound === true),
    shouldSetBadge: false };
}
