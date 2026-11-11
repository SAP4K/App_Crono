import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import type { DurationWheelProps } from '../components/DurationWheel.types';
import { createDurationWheel, type WheelRelease } from './durationWheel';
import { isAppActive, subscribeAppActivity } from './appActivity';
import { useMotionPreference } from '../context/MotionContext';
import { createWheelPresentation, type WheelPresentationDriver } from './wheelPresentation';

export function useDurationWheel(props: DurationWheelProps, align: (offset: number, cancelMotion?: boolean) => void,
  driver?: Pick<WheelPresentationDriver, 'read' | 'animate'>) {
  const policy = useMotionPreference();
  const latest = useRef({ props, align, driver });
  const previous = useRef(props);
  const instance = useRef<ReturnType<typeof createDurationWheel> | null>(null);
  const presentation = useRef<ReturnType<typeof createWheelPresentation> | null>(null);
  const takeover = useRef<number | undefined>(undefined);
  useLayoutEffect(() => { latest.current = { props, align, driver }; });
  useLayoutEffect(() => {
    const controller = createDurationWheel({
      configuration: () => latest.current.props, align: (offset, cancelMotion) => latest.current.align(offset, cancelMotion),
      select: (value) => latest.current.props.onChange(value), busy: (busy) => latest.current.props.onInteractionChange(busy),
      schedule: (callback, delay) => setTimeout(callback, delay), cancel: (handle) => clearTimeout(handle),
    });
    const visual = createWheelPresentation({
      read: () => latest.current.driver?.read() ?? latest.current.props.value * latest.current.props.rowHeight,
      align: (offset, cancelMotion) => latest.current.align(offset, cancelMotion),
      animate: (offset, finished) => latest.current.driver?.animate(offset, finished) ?? (() => {}),
      schedule: (callback, delay) => setTimeout(callback, delay), cancel: (handle) => clearTimeout(handle),
      warn: (code) => console.warn(`[motion] ${code}`),
    });
    presentation.current = visual;
    instance.current = controller; controller.synchronize();
    return () => { visual.dispose(); presentation.current = null; controller.dispose(); instance.current = null; };
  }, []);
  useLayoutEffect(() => {
    const before = previous.current; previous.current = props;
    const eligible = policy.active && props.presentationActive !== false && !props.disabled;
    const request = props.presentationRequest !== undefined && props.presentationRequest !== before.presentationRequest;
    if (request) {
      instance.current?.synchronize(false);
      presentation.current?.move(props.value * props.rowHeight, eligible && !policy.reduceMotion && !!driver);
    } else if (props.value !== before.value || props.rowHeight !== before.rowHeight || props.disabled !== before.disabled) {
      presentation.current?.settle(); instance.current?.synchronize();
    } else if (!eligible || policy.reduceMotion) presentation.current?.settle();
  }, [props, policy, driver]);
  useEffect(() => subscribeAppActivity(() => {
    if (!isAppActive()) { presentation.current?.settle(); instance.current?.synchronize(); }
  }), []);
  return useMemo(() => ({
    synchronize: () => { if (!presentation.current?.isMoving()) instance.current?.synchronize(); },
    beginDrag: () => {
      const offset = presentation.current?.interrupt(); takeover.current = offset; instance.current?.beginDrag();
      if (offset !== undefined) instance.current?.scroll(offset);
    },
    beginWheel: (waitForEnd = false) => {
      const offset = presentation.current?.interrupt(); takeover.current = offset; instance.current?.beginWheel(waitForEnd);
      if (offset !== undefined) instance.current?.scroll(offset);
    },
    beginMomentum: () => { if (!presentation.current?.isMoving()) instance.current?.beginMomentum(); },
    scroll: (offset: number) => {
      if (takeover.current !== undefined && Math.abs(offset - takeover.current) > latest.current.props.rowHeight / 2) takeover.current = undefined;
      instance.current?.scroll(offset);
    }, release: (options?: WheelRelease) => instance.current?.release(options),
    end: (offset: number) => {
      // Cancelling a programmatic scroll can queue its end before the new wheel delta.
      // Let real displacement or the existing idle fallback settle that takeover.
      if (takeover.current === undefined && !presentation.current?.isMoving() && (!latest.current.driver || Math.abs(latest.current.driver.read() - offset) < 1)) instance.current?.end(offset);
    },
    choose: (value: number) => {
      // Explicit choices replace the accepted value; stop compositor motion before alignment.
      presentation.current?.settle(); takeover.current = undefined; instance.current?.choose(value);
    },
  }), []);
}
