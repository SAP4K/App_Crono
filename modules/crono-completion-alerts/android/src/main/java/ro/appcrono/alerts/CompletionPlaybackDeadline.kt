package ro.appcrono.alerts

// Platform-free deadline owner used by the real MediaPlayer broker.
class CompletionPlaybackDeadline<T>(private val now: () -> Long, private val schedule: (Long, () -> Unit) -> T,
  private val cancel: (T) -> Unit, private val startupFailed: (Long) -> Unit, private val ended: (Long) -> Unit) {
  private var ticket: Long? = null
  private var startup: T? = null
  private var ending: T? = null
  var startedAt: Long? = null
    private set
  private var seconds = 0
  fun begin(generation: Long) {
    clear(); ticket = generation
    startup = schedule(4000) { if (ticket == generation && startedAt == null) startupFailed(generation) }
  }
  fun playing(generation: Long, duration: Int): Boolean {
    require(duration in CompletionAlertPolicy.durations)
    if (ticket != generation || startedAt != null) return false
    startup?.let(cancel); startup = null; seconds = duration; startedAt = now()
    ending = schedule(duration * 1000L) { if (ticket == generation) ended(generation) }
    return true
  }
  fun remaining(): Long = startedAt?.let { CompletionAlertPolicy.remaining(it, seconds, now()) } ?: 0L
  fun clear() {
    ticket = null; startup?.let(cancel); ending?.let(cancel); startup = null; ending = null; startedAt = null
  }
}
