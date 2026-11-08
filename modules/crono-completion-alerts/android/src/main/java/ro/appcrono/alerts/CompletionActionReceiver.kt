package ro.appcrono.alerts

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class CompletionActionReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    try {
      val identifier = intent.getStringExtra("identifier") ?: return
      val token = intent.getStringExtra("token") ?: return
      val current = CompletionPlaybackBroker.record ?: return
      if (!CompletionAlertPolicy.actionMatches(current, identifier, token)) return
      CompletionPlaybackBroker.stopScoped(null, null, token = token)
    } catch (_: Exception) { CompletionRuntime.warn("notification-stop") }
  }
}
