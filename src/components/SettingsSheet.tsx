import { MotionPressable } from './MotionPressable';
import { useI18n } from '../hooks/useI18n';
import { useLayoutEffect, useRef, useState } from 'react';
import { Keyboard, Platform, StyleSheet, Text, View } from 'react-native';
import { useCrono } from '../context/CronoContext';
import { textSizes, fonts as f, Palette } from '../theme';
import { useTheme, useThemeStyles } from '../context/ThemeContext';
import { Icon } from './Icon';
import { Sheet } from './Sheet';
import { BackupSettings } from './BackupSettings';
import { SettingsSwitch } from './SettingsSwitch';
import { LANGUAGES } from '../core/language';
import { ALERT_DURATIONS, SOUND_CHOICES } from '../core/sounds';
import { BackgroundNotificationHelp } from './BackgroundNotificationHelp';
import { notificationStatus } from '../i18n/notificationStatus';
import { PanelTransition } from './PanelTransition';

type SettingsGroup = 'appearance' | 'language' | 'sounds' | 'notifications' | 'device' | 'data' | 'about';

export function SettingsSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { language, messages: m, setLanguage } = useI18n();
  const { colors: c } = useTheme();
  const styles = useThemeStyles(createStyles);
  const { data, update, feedback, alerts, notifications, hydrationStatus } = useCrono();
  const [section, setSection] = useState<SettingsGroup | null>(null);
  const groupButtons = useRef(new Map<SettingsGroup, View>()), returningTo = useRef<SettingsGroup | null>(null);
  const wasVisible = useRef(false);
  useLayoutEffect(() => {
    if (visible && !wasVisible.current) { setSection(null); returningTo.current = null; }
    wasVisible.current = visible;
  }, [visible]);
  const [blockedPreviewEventId, setBlockedPreviewEventId] = useState<string | null>(null);
  const { controller } = alerts;
  const capability = notifications.state.capability;
  const notificationAvailable = notifications.supported && capability.status !== 'unavailable' && capability.status !== 'unsupported';
  const canManageNotifications = hydrationStatus === 'loaded' && notificationAvailable;
  const previewing = alerts.state.request?.owner === 'preview' && alerts.state.status !== 'idle';
  const previewError = alerts.state.request?.owner === 'preview' && alerts.state.error ? m.soundUnavailable : null;
  const previewNotice = alerts.state.status !== 'idle' && alerts.state.request?.owner !== 'preview'
    && alerts.state.request?.eventId === blockedPreviewEventId ? m.alertAlreadyPlaying : null;
  useLayoutEffect(() => {
    if (!visible || section !== 'sounds') controller.cancelOwner('preview');
    return () => controller.cancelOwner('preview');
  }, [visible, section, controller]);
  const close = () => { controller.cancelOwner('preview'); Keyboard.dismiss(); setBlockedPreviewEventId(null); onClose(); };
  const back = () => { feedback(); controller.cancelOwner('preview'); returningTo.current = section; setSection(null); };
  const toggle = (key: 'haptics' | 'keepAwake' | 'timerSound', enabled: boolean) => {
    feedback();
    update((previous) => ({ ...previous, preferences: { ...previous.preferences, [key]: enabled } }));
  };
  const themeLabels = { system: m.systemMode, light: m.lightMode, dark: m.darkMode };
  const summaries: Record<SettingsGroup, string> = {
    appearance: themeLabels[data.preferences.theme],
    language: LANGUAGES.find((item) => item.id === language)!.label,
    sounds: data.preferences.timerSound ? `${m.sounds[data.preferences.alertSoundId]} · ${m.soundLength(data.preferences.alertDurationSeconds)}` : m.disabledSetting,
    notifications: notificationStatus(notifications.readiness, m),
    device: `${m.haptics}: ${data.preferences.haptics ? m.enabled : m.disabledSetting}`,
    data: m.backupSummary, about: 'CRONO 1.0',
  };
  return <Sheet visible={visible} title={section ? m.settingsGroups[section] : m.settingsTitle} onClose={close} onBack={section ? back : undefined}
    onAfterClose={() => { if (!visible) { setSection(null); returningTo.current = null; } }}>
    <PanelTransition identity={section ?? 'groups'} active={visible} onReady={() => {
      if (section === null && returningTo.current) {
        const button = groupButtons.current.get(returningTo.current);
        if (Platform.OS === 'web') (button as unknown as HTMLElement | undefined)?.focus({ preventScroll: true });
        else button?.focus();
        returningTo.current = null;
      }
    }}>
    {section === null && <Text style={styles.subtitle}>{m.settingsSubtitle}</Text>}
    {section === null && <View style={styles.groups}>{(Object.keys(m.settingsGroups) as SettingsGroup[]).map((group) =>
      <MotionPressable key={group} ref={(node) => { if (node) groupButtons.current.set(group, node); else groupButtons.current.delete(group); }}
        accessibilityRole="button" accessibilityLabel={m.settingsGroups[group]} onPress={() => { feedback(); setSection(group); }}
        style={[styles.group]}>
        <View style={styles.copy}><Text style={styles.label}>{m.settingsGroups[group]}</Text><Text style={styles.description}>{summaries[group]}</Text></View>
        <Icon name="chevron" size={18} />
      </MotionPressable>)}</View>}
    {section === 'language' && <>
    <View style={styles.soundOptions}>
      <Text style={styles.label}>{m.language}</Text>
      <Text style={styles.description}>{m.languageHelp}</Text>
      <View style={styles.choices}>{LANGUAGES.map((item) => <MotionPressable key={item.id} accessibilityRole="radio" accessibilityLabel={item.label}
        accessibilityState={{ checked: language === item.id }} aria-checked={language === item.id} onPress={() => setLanguage(item.id)}
        style={[styles.choice, language === item.id && styles.chosen]}><Text style={styles.choiceText}>{item.label}</Text></MotionPressable>)}</View>
    </View>
    </>}
    {section === 'appearance' && <>
    <View style={styles.soundOptions}>
      <Text style={styles.label}>{m.settingsGroups.appearance}</Text><Text style={styles.description}>{m.themeHelp}</Text>
      <View style={styles.choices}>{(['system', 'light', 'dark'] as const).map((theme) => <MotionPressable key={theme}
        accessibilityRole="radio" accessibilityLabel={themeLabels[theme]} disabled={hydrationStatus !== 'loaded'}
        accessibilityState={{ checked: data.preferences.theme === theme, disabled: hydrationStatus !== 'loaded' }} aria-checked={data.preferences.theme === theme}
        onPress={() => {
          if (hydrationStatus !== 'loaded') return;
          const result = update((previous) => previous.preferences.theme === theme ? previous
            : { ...previous, preferences: { ...previous.preferences, theme } });
          if (result.changed) feedback();
        }} style={[styles.choice, data.preferences.theme === theme && styles.chosen]}>
        <Text style={styles.choiceText}>{themeLabels[theme]}</Text>
      </MotionPressable>)}</View>
    </View>
    </>}
    {section === 'sounds' && <>
    <View style={styles.row}>
      <View style={styles.icon}><Icon name="sound" /></View>
      <View style={styles.copy}><Text style={styles.label}>{m.audioAlerts}</Text><Text style={styles.description}>{m.audioHelp}</Text></View>
      <SettingsSwitch accessibilityLabel={m.audioAlerts} value={data.preferences.timerSound} onValueChange={(value) => toggle('timerSound', value)} />
    </View>
    <View style={styles.soundOptions}>
      <Text style={styles.label}>{m.sound}</Text>
      <View style={styles.choices}>{SOUND_CHOICES.map((sound) => <MotionPressable key={sound.id} accessibilityRole="radio" accessibilityLabel={m.soundChoice(m.sounds[sound.id])} accessibilityState={{ checked: data.preferences.alertSoundId === sound.id }} aria-checked={data.preferences.alertSoundId === sound.id}
        onPress={() => { feedback(); setBlockedPreviewEventId(null); update((previous) => previous.preferences.alertSoundId === sound.id ? previous : { ...previous, preferences: { ...previous.preferences, alertSoundId: sound.id } }); }}
        style={[styles.choice, data.preferences.alertSoundId === sound.id && styles.chosen]}><Text style={styles.choiceText}>{m.sounds[sound.id]}</Text></MotionPressable>)}</View>
      <Text style={styles.label}>{m.soundDuration}</Text>
      <Text style={styles.description}>{m.notificationSoundDurationHelp}</Text>
      <View style={styles.choices}>{ALERT_DURATIONS.map((duration) => <MotionPressable key={duration} accessibilityRole="radio" accessibilityLabel={m.soundLength(duration)} accessibilityState={{ checked: data.preferences.alertDurationSeconds === duration }} aria-checked={data.preferences.alertDurationSeconds === duration}
        onPress={() => { feedback(); setBlockedPreviewEventId(null); update((previous) => previous.preferences.alertDurationSeconds === duration ? previous : { ...previous, preferences: { ...previous.preferences, alertDurationSeconds: duration } }); }}
        style={[styles.choice, data.preferences.alertDurationSeconds === duration && styles.chosen]}><Text style={styles.choiceText}>{duration} s</Text></MotionPressable>)}</View>
      <MotionPressable accessibilityRole="button" accessibilityLabel={previewing ? m.stopPreview : m.preview} onPress={() => {
        feedback();
        if (previewing) { controller.cancelOwner('preview'); setBlockedPreviewEventId(null); }
        else setBlockedPreviewEventId(alerts.preview() ? null : controller.getState().request?.eventId ?? null);
      }} style={styles.preview}><Icon name="sound" size={17} /><Text style={styles.choiceText}>{previewing ? m.stopPreview : m.preview}</Text></MotionPressable>
      {(previewError || previewNotice) && <Text accessibilityLiveRegion="polite" style={styles.description}>{previewError || previewNotice}</Text>}
    </View>
    </>}
    {section === 'notifications' && <>
    <View style={styles.soundOptions}>
      <View style={styles.notificationRow}>
        <View style={styles.copy}><Text style={styles.label}>{m.systemNotifications}</Text><Text style={styles.description}>{m.notificationsHelp}</Text></View>
        <View style={styles.notificationSwitch}><SettingsSwitch accessibilityLabel={m.systemNotifications}
          disabled={!canManageNotifications} value={data.preferences.systemNotifications} onValueChange={(enabled) => {
            if (!canManageNotifications) return;
            const result = update((previous) => previous.preferences.systemNotifications === enabled ? previous
              : { ...previous, preferences: { ...previous.preferences, systemNotifications: enabled } });
            if (!result.changed) return;
            feedback();
            if (enabled) void notifications.controller.requestPermission(true);
          }} /></View>
      </View>
      <Text style={styles.description} accessibilityLiveRegion="polite">{notificationStatus(notifications.readiness, m)}</Text>
      {data.preferences.systemNotifications && notifications.state.delivery.extendedSound === true && <>
        {data.preferences.timerSound && notifications.readiness === 'registered' && <Text style={styles.description}>{m.notificationLongSoundReady}</Text>}
        <Text style={styles.description}>{m.notificationAlarmIndicator}</Text>
      </>}
      {canManageNotifications && <>
        <Text style={styles.description}>{m.notificationsSoundHelp}</Text>
        <View style={styles.choices}>
          {data.preferences.systemNotifications && capability.canAsk && <MotionPressable accessibilityRole="button"
            onPress={() => { feedback(); void notifications.controller.requestPermission(true); }} style={[styles.choice]}><Text style={styles.choiceText}>{m.notificationPermissionRequest}</Text></MotionPressable>}
          <MotionPressable accessibilityRole="button" onPress={() => { feedback(); notifications.openSettings(); }} style={[styles.choice]}><Text style={styles.choiceText}>{m.notificationOpenSettings}</Text></MotionPressable>
        </View>
        {notifications.exactAlarmSettings && data.preferences.systemNotifications && <>
          <MotionPressable accessibilityRole="button" onPress={() => { feedback(); notifications.openSettings(true); }} style={[styles.choice]}><Text style={styles.choiceText}>{m.notificationExactSettings}</Text></MotionPressable>
        </>}
        {data.preferences.systemNotifications && <BackgroundNotificationHelp />}
      </>}
    </View>
    </>}
    {section === 'device' && <>
    <View style={styles.row}>
      <View style={styles.icon}><Icon name="haptics" /></View>
      <View style={styles.copy}><Text style={styles.label}>{m.haptics}</Text><Text style={styles.description}>{m.hapticsHelp}</Text></View>
      <SettingsSwitch accessibilityLabel={m.haptics} value={data.preferences.haptics} onValueChange={(value) => toggle('haptics', value)} />
    </View>
    <View style={styles.row}>
      <View style={styles.icon}><Icon name="screen" /></View>
      <View style={styles.copy}><Text style={styles.label}>{m.keepAwake}</Text><Text style={styles.description}>{m.keepAwakeHelp}</Text></View>
      <SettingsSwitch accessibilityLabel={m.keepAwake} value={data.preferences.keepAwake} onValueChange={(value) => toggle('keepAwake', value)} />
    </View>
    {Platform.OS === 'web' && <Text style={styles.webNote}>{m.webNote}</Text>}
    </>}
    {section === 'about' && <>
    <View style={styles.about}><View style={styles.aboutMark}><Icon name="clock" size={28} color={c.onAccent} /></View><Text style={styles.brand}>CRONO <Text style={styles.version}>1.0</Text></Text><Text style={styles.tagline}>{m.tagline}</Text><View style={styles.divider} /><Text style={styles.privacy}>{m.privacy}</Text><Text style={styles.limit}>{m.historyLimit}</Text></View>    </>}
    {section === 'data' && <BackupSettings active={visible} />}
    </PanelTransition>
  </Sheet>;
}

const createStyles = (c: Palette) => StyleSheet.create({
  groups: { paddingBottom: 14 },
  group: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16, borderBottomWidth: 1, borderColor: c.border },
  subtitle: { fontFamily: f.regular, color: c.muted, fontSize: textSizes.body, marginBottom: 27 },
  soundOptions: { gap: 12, paddingVertical: 18, borderBottomWidth: 1, borderColor: c.border },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  notificationRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  notificationSwitch: { minHeight: 44, justifyContent: 'center' },
  choice: { borderWidth: 1, borderColor: c.border, borderRadius: 12, paddingHorizontal: 13, minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  chosen: { backgroundColor: c.selected, borderColor: c.green },
  choiceText: { fontFamily: f.medium, color: c.ink, fontSize: textSizes.caption },
  preview: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', minHeight: 46, borderRadius: 12, backgroundColor: c.secondary },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 21, borderBottomWidth: 1, borderColor: c.border, gap: 12 },
  icon: { backgroundColor: c.iconSurface, width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, gap: 6 },
  label: { fontFamily: f.semibold, color: c.ink, fontSize: textSizes.body },
  description: { fontFamily: f.regular, color: c.muted, fontSize: textSizes.caption, lineHeight: 21 },
  webNote: { fontFamily: f.regular, color: c.muted, fontSize: textSizes.caption, lineHeight: 21, marginTop: 14 },
  about: { alignItems: 'center', paddingVertical: 32 },
  aboutMark: { backgroundColor: c.lime, width: 57, height: 57, borderRadius: 19, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  brand: { fontFamily: f.heavy, color: c.ink, fontSize: 20, letterSpacing: -0.5 },
  version: { fontFamily: f.medium, color: c.muted, fontSize: textSizes.small },
  tagline: { fontFamily: f.regular, color: c.muted, fontSize: textSizes.small, marginTop: 9, textAlign: 'center' },
  divider: { width: 25, height: 1, backgroundColor: c.border, marginVertical: 22 },
  privacy: { fontFamily: f.regular, color: c.muted, fontSize: textSizes.caption, lineHeight: 21, textAlign: 'center' },
  limit: { fontFamily: f.regular, color: c.muted, fontSize: textSizes.small, marginTop: 14 },
});
