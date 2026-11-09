[← Background notifications](background-notifications.md) · [Back to README](../README.md)

# Backups and Import

Save a portable JSON copy of saved schedules, stopwatch history and preferences from **Settings → Data** (**Setări → Date** in Romanian). You can use the file to add copies on another device or restore saved records after reinstalling CRONO.

## Export

1. Open **Settings → Data**.
2. Choose **Export backup** (**Exportă copia**).
3. On Android/iOS, use the system share sheet to save or send the JSON file. On web, finish the browser download.
4. Keep your saved copy outside CRONO’s temporary cache. Uninstalling the app or clearing browser data removes its local data.

Export takes a snapshot when you press the button. “Backup prepared” means the file was prepared or handed to the system; it cannot confirm that another app finished saving it. The file contains readable user data, so choose its destination accordingly.

Existing standalone Android/iOS installs need a rebuilt app containing the SDK-compatible file modules. The web preview supports upload/download directly. No application account or CRONO cloud service is required.

## Import and Review

1. Choose **Import backup** (**Importă o copie**) and select one CRONO JSON file.
2. Review the schedule and session counts. Selecting a file does not apply it.
3. Optionally enable **Also apply preferences from this file**. It starts off for each new import.
4. Press **Add records** (**Adaugă înregistrările**) to confirm, or Cancel to leave saved data unchanged.

Import adds independent copies with fresh IDs. Existing records remain, names and calendar rules are retained, and imported history keeps its original dates and lap values. History is displayed newest first. Importing the same file again adds another set of copies.

Capacity is checked again when you confirm. If either collection would exceed its limit, the entire import is rejected, including optional preferences; nothing is silently dropped or replaced. Changes made while preview is open are preserved.

## Included Data and Limits

| Data | Portable scope |
|---|---|
| Schedules | Up to 20 saved schedules, each with 1–50 actions |
| Names | Existing limit of 80 trimmed characters |
| Action duration | `00:00:01`–`23:59:59` |
| History | Up to 50 saved stopwatch sessions, with at most 1,000 laps each |
| Preferences | Language, theme, haptics, wake lock, automatic sound, sound ID/duration and notification enablement |
| File | Format `crono-backup`, version `1`; at most 5 MiB of UTF-8 JSON |

The file excludes live stopwatch state, countdown state, running schedule snapshots, deadlines and native delivery records. Current clocks and the current run keep their latest state during import, including any natural completion while preview was open. Timer/Planning runs do not become stopwatch history entries.

Applying preferences is explicit and optional. It may change theme, language and sound settings using the same application owners as Settings. Notification enablement is a saved preference; Android/iOS authorization and phone settings stay under the operating system’s control. Import alone does not request permission.

## File Format

The portable envelope is separate from CRONO’s internal local-storage object:

```json
{
  "format": "crono-backup",
  "version": 1,
  "exportedAt": 1794225600000,
  "schedules": [],
  "sessions": [],
  "preferences": {
    "language": "ro",
    "theme": "light",
    "haptics": true,
    "keepAwake": true,
    "timerSound": true,
    "alertSoundId": "classic",
    "alertDurationSeconds": 60,
    "systemNotifications": true
  }
}
```

Prefer files exported by CRONO. Import validates every record and preference before showing the preview. Malformed JSON, unsupported versions, invalid calendar dates or laps, duplicate IDs within a collection/action list and invalid preference values reject the whole file. The permissive startup recovery reader is not used as an import parser.

## Troubleshooting

| Message | Action |
|---|---|
| File too large | Choose a backup no larger than 5 MiB; the limit uses bytes, including non-Latin text. |
| Unsupported version or invalid backup | Choose a valid version-1 CRONO export, or use a compatible newer app. Renaming another file to `.json` does not convert it. |
| Insufficient capacity | Remove unwanted saved records or choose a smaller backup; combined limits are 20 schedules and 50 sessions. |
| Independent copies could not be created | Retry the import; the rejected attempt changes nothing. |
| File transfer unavailable | Install a rebuilt native app containing the file modules. |
| Read/share failed | Retry the system picker or share operation. |
| Saved data not loaded | Reopen the app before transferring files; export/import stay disabled after failed hydration. |
| Storage warning after confirmation | The accepted records may be available only in the current app session. Resolve the device/browser storage problem and retain your backup file. |

Back or Close cancels pending transfer work and discards the preview. A late file read cannot apply records after that panel closes. Canceling or dismissing the system picker never imports automatically.

## Verification Limits

Core tests cover strict parsing, UTF-8 size boundaries, maximum saved collections, fresh-ID and capacity checks, live-state preservation and transfer cancellation. Browser tests use real JSON download/upload, including legacy data, explicit preferences, errors, storage failures and export cleanup. These checks do not prove native picker/share behavior. Physical Android/iOS file transfer, native large-text/accessibility and existing background audio/lock-screen acceptance remain pending.

## See Also

- [README](../README.md) — timing, Planning, Settings and build instructions.
- [Background notifications](background-notifications.md) — notification setup and platform limits.
- [Architecture](../.ai-factory/ARCHITECTURE.md) — persistence and timing ownership.
