package ro.appcrono.alerts

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class CompletionAlarmReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    try { CompletionRuntime.deliver(context.applicationContext) }
    catch (_: Exception) { CompletionRuntime.warn("alarm-delivery") }
  }
}
