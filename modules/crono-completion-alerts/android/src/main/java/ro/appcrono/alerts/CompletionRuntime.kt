package ro.appcrono.alerts

import android.content.Context
import android.content.Intent
import android.util.Log
import org.json.JSONObject
import java.util.UUID

// All calls run on the main thread: receiver, service and module APIs serialize here.
object CompletionRuntime {
  var observer: ((String, Map<String, Any?>) -> Unit)? = null
  private val warned = mutableSetOf<String>()
  fun warn(operation: String) { if (warned.add(operation)) Log.w("CronoAlerts", "$operation failed") }
  fun emit(name: String, value: Map<String, Any?>) {
    try { observer?.invoke(name, value) } catch (_: Exception) { warn("observer") }
  }
  fun notification(record: JSONObject) = mapOf("identifier" to record.getString("identifier"), "data" to record.getJSONObject("data").bridgeMap())
  fun allowed(store: CompletionAlertLedger, request: JSONObject): Boolean {
    return CompletionAlertPolicy.allowed(store.policy(), request)
  }
  fun upsert(context: Context, identifier: String, descriptor: JSONObject): String? {
    check(CompletionAlarmScheduler.capable(context)) { "Exact completion alarms unavailable" }
    val store = CompletionAlertStore.get(context); val event = descriptor.getJSONObject("event")
    val completion = descriptor.getJSONObject("completion")
    val request = JSONObject(event.toString()).put("soundId", completion.getString("soundId")).put("durationSeconds", completion.get("durationSeconds"))
    require(CompletionAlertPolicy.validRequest(request) && request.getString("owner") != "preview")
    if (request.getLong("dueAt") <= System.currentTimeMillis() || store.contains(CompletionAlertPolicy.key(request)) || !allowed(store, request)) return null
    if (store.policy()?.optBoolean("backgroundEnabled", true) == false) return null
    val data = JSONObject(event.toString()).put("app", "crono").put("version", 1).put("fingerprint", descriptor.getString("fingerprint"))
    val record = JSONObject().put("identifier", identifier).put("data", data).put("request", request).put("token", UUID.randomUUID().toString())
      .put("title", descriptor.getString("title")).put("body", descriptor.getString("body"))
      .put("channelId", descriptor.getString("channelId")).put("soundEnabled", descriptor.opt("sound") != false)
      .put("stopLabel", completion.getString("stopLabel").take(200)).put("openLabel", completion.getString("openLabel").take(200))
    store.put(record)
    try { CompletionAlarmScheduler.rearm(context, store) }
    catch (error: Exception) { store.cancel(identifier); throw error }
    return identifier
  }
  fun cancel(context: Context, identifier: String) {
    val store = CompletionAlertStore.get(context); store.cancel(identifier); CompletionAlarmScheduler.rearm(context, store)
  }
  fun deliver(context: Context, now: Long = System.currentTimeMillis()) {
    val store = CompletionAlertStore.get(context)
    val due = store.pending().filter { it.getJSONObject("request").getLong("dueAt") <= now }
    val eligible = due.filter { allowed(store, it.getJSONObject("request")) && !store.contains(CompletionAlertPolicy.key(it.getJSONObject("request"))) }
    val latest = CompletionAlertPolicy.latest(eligible)
    store.consume(due, latest)
    try { CompletionAlarmScheduler.rearm(context, store, now) } catch (_: Exception) { warn("rearm") }
    if (latest != null && store.policy()?.optBoolean("backgroundEnabled", true) != false) {
      emit("received", notification(latest)); CompletionPlaybackBroker.alarm(context, latest)
    }
  }
  fun captureOpen(context: Context, intent: Intent?) {
    val identifier = intent?.getStringExtra("crono.completion.id") ?: return
    val token = intent.getStringExtra("crono.completion.token")
    intent.removeExtra("crono.completion.id"); intent.removeExtra("crono.completion.token")
    val store = CompletionAlertStore.get(context)
    val record = (store.presented() + store.pending()).firstOrNull { it.getString("identifier") == identifier && it.getString("token") == token } ?: return
    val response = JSONObject().put("identifier", identifier).put("data", record.getJSONObject("data")).put("defaultAction", true)
    store.setResponse(response); emit("response", response.bridgeMap())
  }
}

fun JSONObject.bridgeMap(): Map<String, Any?> = keys().asSequence().associateWith { key -> bridgeValue(get(key)) }
private fun bridgeValue(value: Any?): Any? = when (value) {
  JSONObject.NULL -> null
  is JSONObject -> value.bridgeMap()
  is org.json.JSONArray -> (0 until value.length()).map { bridgeValue(value.get(it)) }
  else -> value
}
