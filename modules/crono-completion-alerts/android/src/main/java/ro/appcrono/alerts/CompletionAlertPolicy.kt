package ro.appcrono.alerts

import org.json.JSONObject

object CompletionAlertPolicy {
  val durations = setOf(5, 15, 30, 60)
  private val ranks = mapOf("preview" to 0, "schedule-step" to 1, "schedule-complete" to 2, "timer-complete" to 3)
  fun soundMatches(policy: JSONObject?, request: JSONObject): Boolean = policy == null
    || (policy.optString("soundId") == request.getString("soundId") && policy.optInt("durationSeconds") == request.getInt("durationSeconds"))
  fun allowed(policy: JSONObject?, request: JSONObject): Boolean {
    if (request.optString("owner") == "preview" || policy == null) return true
    val owner = request.getString("owner")
    val saved = policy.opt("${owner}RunId") as? String ?: return false
    if (saved != request.getString("runId") || policy.optBoolean("${owner}Paused")) return false
    // Earlier native ledgers have no boundary projection. Keep their trusted
    // registrations until successful hydration supplies the extended policy.
    if (!policy.has("events")) return true
    val events = policy.optJSONArray("events") ?: return false
    return (0 until events.length()).any { index ->
      val event = events.optJSONObject(index) ?: return@any false
      event.opt("eventId") == request.getString("eventId") && event.opt("dueAt") is Number
        && event.getDouble("dueAt") == request.getLong("dueAt").toDouble()
    }
  }
  fun resolvePolicy(previous: JSONObject?, incoming: JSONObject): JSONObject {
    val next = JSONObject(incoming.toString())
    val events = next.optJSONArray("events") ?: return next
    if (previous == null || !validPolicy(previous)) return next
    val prior = previous.optJSONArray("events") ?: return next
    for (owner in listOf("timer", "planning")) {
      val run = next.opt("${owner}RunId") as? String ?: continue
      val prefix = "$owner:$run" + if (owner == "planning") ":" else ""
      fun owned(event: JSONObject) = if (owner == "timer") event.getString("eventId") == prefix else event.getString("eventId").startsWith(prefix)
      if (!next.optBoolean("${owner}Completed") || previous.opt("${owner}RunId") != run || previous.optBoolean("${owner}Paused")) continue
      if ((0 until events.length()).any { owned(events.getJSONObject(it)) }) continue
      for (index in 0 until prior.length()) if (owned(prior.getJSONObject(index))) events.put(JSONObject(prior.getJSONObject(index).toString()))
    }
    return next
  }
  fun validRequest(d: JSONObject): Boolean {
    val run = d.opt("runId") as? String ?: return false
    val due = d.opt("dueAt") as? Number ?: return false
    val seconds = d.opt("durationSeconds") as? Number ?: return false
    if (run.isEmpty() || run.length > 100 || run.trim() != run || !due.toDouble().isFinite() || due.toDouble() != due.toLong().toDouble() || due.toLong() < 0
      || due.toDouble() > 9007199254740991.0 || seconds.toDouble() != seconds.toInt().toDouble()
      || seconds.toInt() !in durations || d.optString("soundId") !in setOf("classic", "bell", "digital", "gong")) return false
    val event = d.opt("eventId") as? String ?: return false
    return when (d.optString("owner")) {
      "timer" -> d.optString("kind") == "timer-complete" && event == "timer:$run"
      "planning" -> d.optString("kind") in setOf("schedule-step", "schedule-complete")
        && event.startsWith("planning:$run:") && Regex("^(?:[0-9]|[1-4][0-9])$").matches(event.removePrefix("planning:$run:"))
      "preview" -> d.optString("kind") == "preview" && event == "preview:$run"
      else -> false
    }
  }
  fun wins(current: JSONObject, incoming: JSONObject): Boolean {
    val nextKind = incoming.optString("kind"); val previousKind = current.optString("kind")
    if (nextKind == "preview") return previousKind == "preview"
    return previousKind == "preview" || incoming.optLong("dueAt") > current.optLong("dueAt")
      || (incoming.optLong("dueAt") == current.optLong("dueAt") && (ranks[nextKind] ?: -1) >= (ranks[previousKind] ?: -1))
  }
  fun key(request: JSONObject) = "${request.getString("eventId")}@${request.getLong("dueAt")}"
  fun actionMatches(record: JSONObject, identifier: String, token: String) =
    record.optString("identifier") == identifier && record.optString("token") == token
  fun validPolicy(policy: JSONObject): Boolean {
    if (listOf("soundEnabled", "backgroundEnabled", "timerPaused", "planningPaused").any { policy.opt(it) !is Boolean }) return false
    val duration = policy.opt("durationSeconds") as? Number ?: return false
    if (duration.toDouble() != duration.toInt().toDouble() || duration.toInt() !in durations
      || policy.optString("soundId") !in setOf("classic", "bell", "digital", "gong")) return false
    if (!listOf("timerRunId", "planningRunId").all {
      policy.has(it) && (policy.isNull(it) || (policy.opt(it) is String && policy.getString(it).isNotEmpty()
        && policy.getString(it).length <= 100 && policy.getString(it).trim() == policy.getString(it)))
    }) return false
    if (!policy.has("events")) return true
    if (listOf("timerCompleted", "planningCompleted").any { policy.opt(it) !is Boolean }) return false
    val events = policy.optJSONArray("events") ?: return false
    if (events.length() > 51) return false
    val identities = mutableSetOf<String>()
    return (0 until events.length()).all { index ->
      val event = events.optJSONObject(index) ?: return@all false
      val id = event.opt("eventId") as? String ?: return@all false
      val due = event.opt("dueAt") as? Number ?: return@all false
      val timer = policy.opt("timerRunId") as? String
      val planning = policy.opt("planningRunId") as? String
      val prefix = "planning:$planning:"
      due.toDouble().isFinite() && due.toDouble() == due.toLong().toDouble() && due.toLong() in 0..9007199254740991L
        && identities.add(id) && ((timer != null && id == "timer:$timer") || (planning != null && id.startsWith(prefix)
        && Regex("^(?:[0-9]|[1-4][0-9])$").matches(id.removePrefix(prefix))))
    }
  }
  fun remaining(started: Long, seconds: Int, now: Long) = (seconds * 1000L - (now - started).coerceAtLeast(0)).coerceAtLeast(0)
  fun next(records: List<JSONObject>, now: Long): JSONObject? = records.filter { it.getJSONObject("request").getLong("dueAt") > now }
    .minByOrNull { it.getJSONObject("request").getLong("dueAt") }
  fun latest(records: List<JSONObject>): JSONObject? = records.reduceOrNull { current, incoming ->
    if (wins(current.getJSONObject("request"), incoming.getJSONObject("request"))) incoming else current
  }
}
