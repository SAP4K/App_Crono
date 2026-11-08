package ro.appcrono.alerts

import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import org.json.JSONObject

class CompletionAlertService : Service() {
  private var token: String? = null
  override fun onBind(intent: Intent?): IBinder? = null
  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    val current = CompletionPlaybackBroker.record
    val incoming = intent?.getStringExtra("token")
    if (current == null || incoming == null || current.getString("token") != incoming) {
      stopSelf(startId); return START_NOT_STICKY
    }
    instance = this; token = incoming
    try {
      val notification = CompletionNotifications.build(this, current, true)
      if (Build.VERSION.SDK_INT >= 29) startForeground(9138, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK)
      else startForeground(9138, notification)
      if (!CompletionPlaybackBroker.serviceReady(applicationContext, incoming)) finish(incoming)
    } catch (_: Exception) {
      CompletionPlaybackBroker.serviceFailed(incoming); finish(incoming)
    }
    return START_NOT_STICKY
  }
  private fun finish(expected: String) {
    if (token != expected) return
    stopForeground(STOP_FOREGROUND_REMOVE); stopSelf()
  }
  override fun onDestroy() {
    val previous = token
    if (instance === this) instance = null
    if (previous != null) CompletionPlaybackBroker.serviceDestroyed(previous)
    super.onDestroy()
  }
  companion object {
    private var instance: CompletionAlertService? = null
    fun finished(context: Context, record: JSONObject) {
      instance?.finish(record.getString("token"))
      // Notification inventory retains the completed event after audio stops.
      CompletionNotifications.show(context, record)
    }
  }
}
