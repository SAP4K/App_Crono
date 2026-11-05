import { useTheme } from '../context/ThemeContext';
import Svg, { Circle, Path, Polyline, Rect } from 'react-native-svg';

export type IconName = 'clock' | 'settings' | 'play' | 'pause' | 'flag' | 'reset' | 'history' | 'arrow' | 'save' | 'share' | 'trash' | 'close' | 'check' | 'chevron' | 'haptics' | 'screen' | 'moon' | 'timer' | 'sound';

export function Icon({ name, size = 22, color: suppliedColor, strokeWidth = 1.8 }: {
  name: IconName; size?: number; color?: string; strokeWidth?: number;
}) {
  const { colors } = useTheme();
  const color = suppliedColor ?? colors.ink;
  const content = {
    moon: <Path d="M20.8 13A9 9 0 0 1 11 3.2 9 9 0 1 0 20.8 13Z" />,
    timer: <><Circle cx="12" cy="13" r="8" /><Path d="M9 2h6M12 2v3M12 8v5l3 2M18 5l2-2" /></>,
    sound: <><Path d="m11 4-6 5H2v6h3l6 5ZM15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14" /></>,
    clock: <><Circle cx="12" cy="13" r="8" /><Path d="M12 9v4l2.5 1.5M9 2h6M12 2v3M18 5l2-2" /></>,
    settings: <><Path d="m9.5 3-.6 2.2-2 .9-2-.6-2.4 4 1.7 1.6v2l-1.7 1.6 2.4 4 2-.6 2 .9.6 2.1h5l.6-2.1 2-.9 2 .6 2.4-4-1.7-1.6v-2l1.7-1.6-2.4-4-2 .6-2-.9L14.5 3Z" /><Circle cx="12" cy="12" r="3" /></>,
    play: <Path d="m9 5 11 7-11 7Z" fill={color} strokeLinejoin="round" />,
    pause: <><Rect x="7" y="5" width="3" height="14" rx=".6" fill={color} /><Rect x="15" y="5" width="3" height="14" rx=".6" fill={color} /></>,
    flag: <><Path d="M5 21V3c5-4 9 5 14 1v10c-5 4-9-5-14-1" /></>,
    reset: <><Path d="M3 10a9 9 0 1 1 1.3 7M3 4v6h6" /></>,
    history: <><Path d="M3 10a9 9 0 1 1 1.3 7M3 4v6h6M12 7v5l3 2" /></>,
    arrow: <><Path d="M19 12H5m6-6-6 6 6 6" /></>,
    save: <><Path d="M5 3h12l3 3v15H4V3Zm3 0v6h8V3M8 21v-7h8v7" /></>,
    share: <><Circle cx="18" cy="5" r="3" /><Circle cx="6" cy="12" r="3" /><Circle cx="18" cy="19" r="3" /><Path d="m9 10.5 6-4m-6 7 6 4" /></>,
    trash: <><Path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7" /></>,
    close: <Path d="m6 6 12 12M6 18 18 6" />,
    check: <Polyline points="5,12 10,17 20,7" />,
    chevron: <Polyline points="9,5 16,12 9,19" />,
    haptics: <><Rect x="8" y="3" width="8" height="18" rx="2" /><Path d="m4 8-2 4 2 4m16-8 2 4-2 4M11 17h2" /></>,
    screen: <><Rect x="3" y="4" width="18" height="13" rx="2" /><Path d="M8 21h8m-4-4v4m-3-10 2 2 4-4" /></>,
  }[name];
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden>{content}</Svg>;
}
