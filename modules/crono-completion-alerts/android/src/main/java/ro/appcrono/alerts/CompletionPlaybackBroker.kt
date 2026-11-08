package ro.appcrono.alerts

import android.app.KeyguardManager
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.media.MediaPlayer
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.PowerManager
import android.os.SystemClock
import org.json.JSONObject
import java.util.UUID
import java.lang.ref.WeakReference
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleOwner

object CompletionPlaybackBroker {
  private val handler = Handler(Looper.getMainLooper())
  private var application: Context? = null
  private var resumed = false
  private var activityOwner = WeakReference<LifecycleOwner>(null)
  private var player: MediaPlayer? = null
  private var wake: PowerManager.WakeLock? = null
  private var focus: AudioFocusRequest? = null
  private var legacyFocus: AudioManager.OnAudioFocusChangeListener? = null
  private var generation = 0L
  private var revision = 0L
  private var status = "idle"
  private var error = false
  private var started: Long? = null
  var record: JSONObject? = null
    private set
  private var serviceRequested = false
  private var servicePromoted = false
  private var preparedContinuation: (() -> Unit)? = null
  private val deadline = CompletionPlaybackDeadline<Runnable>(SystemClock::elapsedRealtime,
    { delay, callback -> Runnable { callback() }.also { handler.postDelayed(it, delay) } },
    { handler.removeCallbacks(it) }, { fail(it, "startup-timeout") }, { if (generation == it) stop() })
  private fun store(context: Context) = CompletionAlertStore.get(context)
  private fun audio(context: Context) = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
  fun foreground(context: Context): Boolean = resumed && activityOwner.get()?.lifecycle?.currentState?.isAtLeast(Lifecycle.State.RESUMED) == true
    && (context.getSystemService(Context.POWER_SERVICE) as PowerManager).isInteractive
    && !(context.getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager).isKeyguardLocked
  private fun serviceIntent(context: Context) = Intent().setClassName(context.packageName, "ro.appcrono.alerts.CompletionAlertService")
  fun snapshot(context: Context): Map<String, Any?> {
    val failure = if (record == null) store(context).failure() else null
    val current = record ?: failure
    return mapOf("status" to status, "request" to current?.getJSONObject("request")?.bridgeMap(), "generation" to generation, "revision" to revision,
      "error" to (error || failure != null), "startedAt" to started,
      "remainingMs" to (started?.let { CompletionAlertPolicy.remaining(it, current!!.getJSONObject("request").getInt("durationSeconds"), SystemClock.elapsedRealtime()) } ?: 0L))
  }
  private fun publish() { revision++; application?.let { CompletionRuntime.emit("playback", snapshot(it)) } }
  private inline fun cleanupStep(operation: String, action: () -> Unit) {
    try { action() } catch (_: Exception) { CompletionRuntime.warn("[FIX:completion-cleanup] $operation") }
  }
  private fun liveAllowed(context: Context, item: JSONObject): Boolean {
    val request = item.getJSONObject("request")
    if (!CompletionAlertPolicy.soundMatches(store(context).policy(), request)) return false
    if (request.getString("kind") == "preview") return foreground(context)
    return CompletionRuntime.allowed(store(context), request) && store(context).policy()?.optBoolean("soundEnabled", true) != false
  }
  private fun backgroundAllowed(context: Context, item: JSONObject): Boolean {
    if (item.getJSONObject("request").getString("kind") == "preview" || store(context).policy()?.optBoolean("backgroundEnabled", true) == false
      || !CompletionAlarmScheduler.capable(context)) return false
    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (Build.VERSION.SDK_INT >= 26) {
      val channel = manager.getNotificationChannel(item.getString("channelId")) ?: return false
      if (channel.importance < NotificationManager.IMPORTANCE_DEFAULT || channel.sound == null) return false
    }
    return manager.currentInterruptionFilter == NotificationManager.INTERRUPTION_FILTER_ALL && audio(context).ringerMode == AudioManager.RINGER_MODE_NORMAL
  }
  fun requestForeground(context: Context, request: JSONObject): Boolean {
    require(CompletionAlertPolicy.validRequest(request))
    if (!foreground(context)) return false
    val ledger = store(context); val preview = request.getString("kind") == "preview"
    val key = CompletionAlertPolicy.key(request)
    if (!preview && ledger.contains(key)) return false
    val existing = ledger.pending().firstOrNull { CompletionAlertPolicy.key(it.getJSONObject("request")) == key }
    val data = JSONObject(request.toString()).put("app", "crono").put("version", 1).put("fingerprint", "foreground-v1")
    if (request.getString("owner") == "planning") data.put("stepIndex", request.getString("eventId").substringAfterLast(':').toInt())
    val item = existing ?: JSONObject().put("identifier", "crono.notifications.v1.${UUID.randomUUID()}")
      .put("token", UUID.randomUUID().toString()).put("request", request).put("data", data)
      .put("title", "CRONO").put("body", "").put("stopLabel", request.optString("stopLabel", "Stop"))
      .put("channelId", "crono.alerts.${request.getString("soundId")}.v1").put("soundEnabled", true)
    if (!liveAllowed(context, item) || !canReplace(item)) return false
    if (!preview) { ledger.consume(listOf(item), item); CompletionAlarmScheduler.rearm(context, ledger) }
    return start(context, item, false)
  }
  private fun canReplace(item: JSONObject): Boolean {
    val current = record ?: return true
    if (status == "idle") return true
    val a = current.getJSONObject("request"); val b = item.getJSONObject("request")
    return CompletionAlertPolicy.key(a) != CompletionAlertPolicy.key(b) && CompletionAlertPolicy.wins(a, b)
  }
  fun alarm(context: Context, item: JSONObject) {
    application = context.applicationContext
    if (!item.optBoolean("soundEnabled", true) || !liveAllowed(context, item)) {
      CompletionNotifications.show(context, item); return
    }
    if (!canReplace(item)) { CompletionNotifications.show(context, item); return }
    if (!foreground(context) && !backgroundAllowed(context, item)) { CompletionNotifications.show(context, item); return }
    start(context, item, !foreground(context))
  }
  private fun start(context: Context, item: JSONObject, background: Boolean): Boolean {
    store(context).setFailure(null)
    val previous = record; val oldContext = application; val hadService = serviceRequested
    release(); generation++
    if (hadService && previous != null && oldContext != null) cleanupStep("service-finish") { CompletionAlertService.finished(oldContext, previous) }
    application = context.applicationContext
    record = JSONObject(item.toString()); status = "pending"; started = null; error = false; serviceRequested = background; servicePromoted = false
    val ticket = generation
    val power = context.getSystemService(Context.POWER_SERVICE) as PowerManager
    try { wake = power.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "crono:completion").apply { setReferenceCounted(false); acquire(65000) } }
    catch (_: Exception) { fail(ticket, "wake-acquire"); return false }
    publish()
    deadline.begin(ticket)
    if (background) ensureService(context, ticket) else prepare(context, ticket)
    return true
  }
  private fun ensureService(context: Context, ticket: Long) {
    val item = record ?: return
    try {
      check(backgroundAllowed(context, item)) { "Background sound restricted" }
      serviceRequested = true
      val intent = serviceIntent(context).putExtra("token", item.getString("token"))
      if (Build.VERSION.SDK_INT >= 26) context.startForegroundService(intent) else context.startService(intent)
    } catch (_: Exception) { fail(ticket, "service-start") }
  }
  // Called only after the service has posted/promoted its foreground notification.
  fun serviceReady(context: Context, token: String): Boolean {
    val current = record ?: return false
    if (current.getString("token") != token || !serviceRequested) return false
    servicePromoted = true
    if (player == null) prepare(context, generation)
    else preparedContinuation?.let { preparedContinuation = null; it() }
    return true
  }
  fun serviceFailed(token: String) {
    if (record?.getString("token") == token) fail(generation, "service-promotion")
  }
  fun serviceDestroyed(token: String) {
    if (serviceRequested && record?.getString("token") == token) fail(generation, "service-destroyed")
  }
  private fun prepare(context: Context, ticket: Long) {
    val item = record ?: return
    try {
      if (!liveAllowed(context, item) || (!foreground(context) && !serviceRequested)) { stop(); return }
      val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      if (audio(context).ringerMode != AudioManager.RINGER_MODE_NORMAL || manager.currentInterruptionFilter != NotificationManager.INTERRUPTION_FILTER_ALL) { stop(); return }
      val resource = if (item.getJSONObject("request").getString("soundId") == "classic") "notification_classic" else item.getJSONObject("request").getString("soundId")
      val uri = if (serviceRequested && Build.VERSION.SDK_INT >= 26) manager.getNotificationChannel(item.getString("channelId"))?.sound
        else Uri.parse("android.resource://${context.packageName}/raw/$resource")
      check(uri != null)
      val attributes = AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_NOTIFICATION).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build()
      val next = MediaPlayer(); player = next
      next.setAudioAttributes(attributes); next.setDataSource(context, uri); next.isLooping = true
      next.setOnErrorListener { _, _, _ -> fail(ticket, "player"); true }
      next.setOnPreparedListener {
        if (generation != ticket) return@setOnPreparedListener
        val begin: () -> Unit = begin@{
          if (generation != ticket) return@begin
          try {
          if (!liveAllowed(context, item) || (serviceRequested && !backgroundAllowed(context, item))
            || (!foreground(context) && !serviceRequested)) { stop(); return@begin }
          val listener = AudioManager.OnAudioFocusChangeListener { change -> if (change < 0 && generation == ticket) stop() }
          val granted = if (Build.VERSION.SDK_INT >= 26) {
            val request = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT).setAudioAttributes(attributes)
              .setOnAudioFocusChangeListener(listener, handler).build(); focus = request; audio(context).requestAudioFocus(request)
          } else { legacyFocus = listener; @Suppress("DEPRECATION") audio(context).requestAudioFocus(listener, AudioManager.STREAM_NOTIFICATION, AudioManager.AUDIOFOCUS_GAIN_TRANSIENT) }
          check(granted == AudioManager.AUDIOFOCUS_REQUEST_GRANTED)
          next.start()
          if (!deadline.playing(ticket, item.getJSONObject("request").getInt("durationSeconds"))) return@begin
          started = deadline.startedAt; status = "playing"
          publish()
          } catch (_: Exception) { fail(ticket, "player-start") }
        }
        if (!foreground(context) && !serviceRequested) {
          if (backgroundAllowed(context, item)) { preparedContinuation = begin; ensureService(context, ticket) } else stop()
        } else if (serviceRequested && !servicePromoted) preparedContinuation = begin else begin()
      }
      next.prepareAsync()
    } catch (_: Exception) { fail(ticket, "player-prepare") }
  }
  fun activity(context: Context, active: Boolean, owner: LifecycleOwner? = null) {
    if (owner != null) activityOwner = WeakReference(owner)
    resumed = active; application = context.applicationContext
    if (active || status == "idle") return
    val current = record ?: return
    try { if (backgroundAllowed(context, current)) ensureService(context, generation) else stop() }
    catch (_: Exception) { fail(generation, "activity-handoff") }
  }
  fun applyPolicy(context: Context, incoming: JSONObject) {
    require(CompletionAlertPolicy.validPolicy(incoming)) { "Invalid completion policy" }
    application = context.applicationContext
    val ledger = store(context); val previous = ledger.policy()
    val policy = CompletionAlertPolicy.resolvePolicy(previous, incoming)
    if (previous?.toString() != policy.toString()) ledger.setPolicy(policy)
    val failure = ledger.failure()
    if (failure != null && (!CompletionAlertPolicy.allowed(policy, failure.getJSONObject("request"))
      || !CompletionAlertPolicy.soundMatches(policy, failure.getJSONObject("request")) || !policy.optBoolean("soundEnabled"))) {
      ledger.setFailure(null)
      if (record == null) { error = false; publish() }
    }
    for (item in ledger.pending()) if (!policy.optBoolean("backgroundEnabled") || !CompletionRuntime.allowed(ledger, item.getJSONObject("request"))) ledger.cancel(item.getString("identifier"))
    val current = record
    if (current != null && (!liveAllowed(context, current) || (previous != null && (previous.optString("soundId") != policy.optString("soundId")
      || previous.optInt("durationSeconds") != policy.optInt("durationSeconds") || previous.optBoolean("soundEnabled") != policy.optBoolean("soundEnabled")))
      || (serviceRequested && !policy.optBoolean("backgroundEnabled")))) stop()
    CompletionAlarmScheduler.rearm(context, ledger)
  }
  fun stopScoped(owner: String?, key: String?, expectedGeneration: Long? = null, token: String? = null) {
    val current = record ?: run {
      val context = application ?: return
      val failure = store(context).failure() ?: return
      val request = failure.getJSONObject("request")
      if ((owner == null || request.getString("owner") == owner) && (key == null || CompletionAlertPolicy.key(request) == key)
        && (expectedGeneration == null || expectedGeneration == generation) && token == null) {
        store(context).setFailure(null); error = false; publish()
      }
      return
    }
    if (owner != null && current.getJSONObject("request").getString("owner") != owner) return
    if (key != null && CompletionAlertPolicy.key(current.getJSONObject("request")) != key) return
    if (expectedGeneration != null && generation != expectedGeneration) return
    if (token != null && current.getString("token") != token) return
    stop()
  }
  fun stop() {
    val previous = record; val context = application; val hadService = serviceRequested
    release(); generation++; record = null; status = "idle"; started = null; error = false; serviceRequested = false
    if (context != null) {
      cleanupStep("stop-record") { store(context).setFailure(null) }
      if (hadService && previous != null) cleanupStep("service-finish") { CompletionAlertService.finished(context, previous) }
    }
    cleanupStep("state-publication") { publish() }
  }
  private fun fail(ticket: Long, operation: String) {
    if (ticket != generation) return
    val previous = record; val context = application; val hadService = serviceRequested
    release(); generation++; status = "idle"; started = null; error = true; serviceRequested = false
    if (context != null) {
      cleanupStep("failure-record") { store(context).setFailure(previous) }
      if (hadService && previous != null) cleanupStep("service-finish") { CompletionAlertService.finished(context, previous) }
    }
    CompletionRuntime.warn(operation); cleanupStep("state-publication") { publish() }
  }
  private fun release() {
    preparedContinuation = null; servicePromoted = false
    deadline.clear()
    try { player?.setOnPreparedListener(null); player?.setOnErrorListener(null); player?.release() } catch (_: Exception) { CompletionRuntime.warn("player-release") }
    player = null
    try { application?.let { context ->
      if (Build.VERSION.SDK_INT >= 26) focus?.let { audio(context).abandonAudioFocusRequest(it) }
      @Suppress("DEPRECATION") legacyFocus?.let { audio(context).abandonAudioFocus(it) }
    } } catch (_: Exception) { CompletionRuntime.warn("focus-release") }
    focus = null; legacyFocus = null
    try { if (wake?.isHeld == true) wake?.release() } catch (_: Exception) { CompletionRuntime.warn("wake-release") }; wake = null
  }
}
