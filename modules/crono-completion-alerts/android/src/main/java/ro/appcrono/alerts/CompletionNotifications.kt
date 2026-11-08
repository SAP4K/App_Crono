package ro.appcrono.alerts

import android.app.Notification
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationCompat
import org.json.JSONObject

object CompletionNotifications {
  private fun action(context: Context, record: JSONObject) = PendingIntent.getBroadcast(context, record.getString("identifier").hashCode(),
    Intent(context, CompletionActionReceiver::class.java).setAction("ro.appcrono.STOP.${record.getString("identifier")}")
      .putExtra("identifier", record.getString("identifier")).putExtra("token", record.getString("token")),
    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
  fun build(context: Context, record: JSONObject, playing: Boolean): Notification {
    val builder = NotificationCompat.Builder(context, record.getString("channelId"))
      .setSmallIcon(android.R.drawable.ic_lock_idle_alarm).setContentTitle(record.getString("title"))
      .setContentText(record.getString("body")).setStyle(NotificationCompat.BigTextStyle().bigText(record.getString("body")))
      .setContentIntent(CompletionAlarmScheduler.open(context, record)).setDeleteIntent(action(context, record))
      .setCategory(NotificationCompat.CATEGORY_ALARM).setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
      .setPriority(NotificationCompat.PRIORITY_HIGH).setSilent(true).setOnlyAlertOnce(true).setOngoing(playing).setAutoCancel(!playing)
    if (playing) {
      builder.addAction(android.R.drawable.ic_media_pause, record.optString("stopLabel", "Stop"), action(context, record))
      builder.addAction(android.R.drawable.ic_menu_view, record.optString("openLabel", record.getString("title")), CompletionAlarmScheduler.open(context, record))
    }
    return builder.build()
  }
  fun show(context: Context, record: JSONObject) {
    if (CompletionPlaybackBroker.foreground(context)) return
    if (CompletionAlertStore.get(context).policy()?.optBoolean("backgroundEnabled", true) == false) return
    try { (context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager)
      .notify(record.getString("identifier"), 1, build(context, record, false)) }
    catch (_: Exception) { CompletionRuntime.warn("notification-post") }
  }
  fun dismiss(context: Context, identifier: String) {
    val active = CompletionPlaybackBroker.record
    if (active?.getString("identifier") == identifier) CompletionPlaybackBroker.stopScoped(null, null, token = active.getString("token"))
    CompletionAlertStore.get(context).dismiss(identifier)
    (context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).cancel(identifier, 1)
  }
}
