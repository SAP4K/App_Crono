package ro.appcrono.alerts

import android.app.AlarmManager
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import org.json.JSONObject

object CompletionAlarmScheduler {
  private fun alarm(context: Context) = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
  fun capable(context: Context): Boolean = (Build.VERSION.SDK_INT < 31 || alarm(context).canScheduleExactAlarms())
    && (context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).areNotificationsEnabled()
  private fun operation(context: Context): PendingIntent = PendingIntent.getBroadcast(context, 9137,
    Intent(context, CompletionAlarmReceiver::class.java).setAction("ro.appcrono.COMPLETION_DEADLINE"),
    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
  fun open(context: Context, record: JSONObject): PendingIntent {
    val intent = context.packageManager.getLaunchIntentForPackage(context.packageName) ?: Intent().setPackage(context.packageName)
    intent.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP)
      .setAction("ro.appcrono.OPEN.${record.getString("identifier")}")
      .putExtra("crono.completion.id", record.getString("identifier"))
      .putExtra("crono.completion.token", record.getString("token"))
    return PendingIntent.getActivity(context, record.getString("identifier").hashCode(), intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
  }
  fun rearm(context: Context, store: CompletionAlertLedger, now: Long = System.currentTimeMillis()) {
    val manager = alarm(context); val operation = operation(context)
    manager.cancel(operation)
    val next = store.pending().minByOrNull { it.getJSONObject("request").getLong("dueAt") } ?: return
    if (!capable(context)) return
    manager.setAlarmClock(AlarmManager.AlarmClockInfo(maxOf(now + 1, next.getJSONObject("request").getLong("dueAt")), open(context, next)), operation)
  }
}
