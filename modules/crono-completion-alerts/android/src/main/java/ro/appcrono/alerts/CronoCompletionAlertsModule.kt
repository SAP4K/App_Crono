package ro.appcrono.alerts

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.exception.Exceptions
import org.json.JSONObject
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleOwner

class CronoCompletionAlertsModule : Module() {
  private val observer: (String, Map<String, Any?>) -> Unit = { name, value -> sendEvent(name, value) }
  private var application: android.content.Context? = null
  private fun context(): android.content.Context {
    appContext.reactContext?.applicationContext?.let { application = it }
    return application ?: throw Exceptions.ReactContextLost()
  }
  // A sheet/dialog takes window focus without backgrounding its activity.
  private fun resumed() = (appContext.currentActivity as? LifecycleOwner)?.lifecycle?.currentState?.isAtLeast(Lifecycle.State.RESUMED) == true
  private fun onMain(action: () -> Unit) {
    val guarded = { try { action() } catch (_: Exception) { CompletionRuntime.warn("lifecycle") } }
    if (android.os.Looper.myLooper() == android.os.Looper.getMainLooper()) guarded()
    else android.os.Handler(android.os.Looper.getMainLooper()).post { guarded() }
  }
  override fun definition() = ModuleDefinition {
    Name("CronoCompletionAlerts")
    Constant("protocolVersion") { 1 }
    Events("playback", "received", "response")
    AsyncFunction("capableAsync") { CompletionAlarmScheduler.capable(context()) }.runOnQueue(Queues.MAIN)
    AsyncFunction("upsertAsync") { identifier: String, descriptor: Map<String, Any?> ->
      CompletionRuntime.upsert(context(), identifier, JSONObject(descriptor))
    }.runOnQueue(Queues.MAIN)
    AsyncFunction("pendingAsync") { CompletionAlertStore.get(context()).pending().map { CompletionRuntime.notification(it) } }.runOnQueue(Queues.MAIN)
    AsyncFunction("presentedAsync") { CompletionAlertStore.get(context()).presented().map { CompletionRuntime.notification(it) } }.runOnQueue(Queues.MAIN)
    AsyncFunction("cancelAsync") { identifier: String -> CompletionRuntime.cancel(context(), identifier) }.runOnQueue(Queues.MAIN)
    AsyncFunction("dismissAsync") { identifier: String -> CompletionNotifications.dismiss(context(), identifier) }.runOnQueue(Queues.MAIN)
    AsyncFunction("lastResponseAsync") {
      CompletionRuntime.captureOpen(context(), appContext.currentActivity?.intent)
      CompletionAlertStore.get(context()).response()?.bridgeMap()
    }.runOnQueue(Queues.MAIN)
    AsyncFunction("clearResponseAsync") { identifier: String? ->
      val store = CompletionAlertStore.get(context())
      if (identifier == null || store.response()?.optString("identifier") == identifier) store.setResponse(null)
    }.runOnQueue(Queues.MAIN)
    AsyncFunction("requestPlaybackAsync") { request: Map<String, Any?> ->
      CompletionPlaybackBroker.activity(context(), resumed(), appContext.currentActivity as? LifecycleOwner)
      CompletionPlaybackBroker.requestForeground(context(), JSONObject(request))
    }.runOnQueue(Queues.MAIN)
    AsyncFunction("snapshotAsync") { CompletionPlaybackBroker.snapshot(context()) }.runOnQueue(Queues.MAIN)
    AsyncFunction("stopPlaybackAsync") { owner: String?, key: String?, generation: Double? ->
      CompletionPlaybackBroker.stopScoped(owner, key, generation?.toLong())
    }.runOnQueue(Queues.MAIN)
    AsyncFunction("setPolicyAsync") { policy: Map<String, Any?> -> CompletionPlaybackBroker.applyPolicy(context(), JSONObject(policy)) }.runOnQueue(Queues.MAIN)
    OnActivityEntersForeground { onMain {
      CompletionPlaybackBroker.activity(context(), true, appContext.currentActivity as? LifecycleOwner)
      CompletionRuntime.captureOpen(context(), appContext.currentActivity?.intent)
    } }
    OnActivityEntersBackground { onMain { CompletionPlaybackBroker.activity(context(), false) } }
    OnNewIntent { intent -> onMain { CompletionRuntime.captureOpen(context(), intent) } }
    OnStartObserving { onMain {
      CompletionRuntime.observer = observer
      CompletionPlaybackBroker.activity(context(), resumed(), appContext.currentActivity as? LifecycleOwner)
    } }
    OnStopObserving { onMain {
      if (CompletionRuntime.observer === observer) CompletionRuntime.observer = null
    } }
    OnDestroy { onMain {
      if (CompletionRuntime.observer === observer) CompletionRuntime.observer = null
    } }
  }
}
