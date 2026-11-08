package ro.appcrono.alerts

import org.json.JSONArray
import org.json.JSONObject

// Platform-free persistence policy; the Android store supplies atomic I/O.
class CompletionAlertLedger(private val read: () -> String?, private val write: (String) -> Unit) {
  private var root = read()?.let { JSONObject(it).also { value -> require(value.getInt("version") == 1) } }
    ?: JSONObject().put("version", 1)
  private fun records(name: String): List<JSONObject> {
    val items = root.optJSONArray(name) ?: return emptyList()
    return (0 until items.length()).mapNotNull { index -> items.optJSONObject(index)?.takeIf { validRecord(it) } }
  }
  fun pending() = records("pending")
  fun presented() = records("presented")
  fun policy(): JSONObject? = root.optJSONObject("policy")
  fun response(): JSONObject? = root.optJSONObject("response")
  fun failure(): JSONObject? = root.optJSONObject("failure")?.takeIf { validRecord(it) }
  private fun commit(next: JSONObject) { write(next.toString()); root = next }
  private fun copy() = JSONObject(root.toString())
  fun setPolicy(policy: JSONObject) { commit(copy().put("policy", policy)) }
  fun setResponse(response: JSONObject?) { commit(copy().put("response", response ?: JSONObject.NULL)) }
  fun setFailure(record: JSONObject?) { commit(copy().put("failure", record ?: JSONObject.NULL)) }
  fun contains(key: String): Boolean {
    val receipts = root.optJSONArray("consumed") ?: return false
    return (0 until receipts.length()).any { receipts.optString(it) == key }
  }
  fun put(record: JSONObject) {
    require(validRecord(record)) { "Invalid completion registration" }
    val other = pending().filter { it.getString("identifier") != record.getString("identifier") }
    require(other.size < 51) { "Completion registration bound exceeded" }
    commit(copy().put("pending", JSONArray(other + record)))
  }
  fun cancel(identifier: String) {
    commit(copy().put("pending", JSONArray(pending().filter { it.getString("identifier") != identifier })))
  }
  fun dismiss(identifier: String) {
    commit(copy().put("presented", JSONArray(presented().filter { it.getString("identifier") != identifier })))
  }
  fun consume(records: List<JSONObject>, present: JSONObject? = null) {
    val keys = records.map { CompletionAlertPolicy.key(it.getJSONObject("request")) }.toSet()
    val consumed = root.optJSONArray("consumed") ?: JSONArray()
    val receipts = (0 until consumed.length()).map { consumed.getString(it) }.filterNot { it in keys } + keys
    val next = copy().put("consumed", JSONArray(receipts.takeLast(256)))
      .put("pending", JSONArray(pending().filterNot { CompletionAlertPolicy.key(it.getJSONObject("request")) in keys }))
    if (present != null) next.put("presented", JSONArray((presented().filterNot { it.getString("identifier") == present.getString("identifier") } + present).takeLast(256)))
    commit(next)
  }
  companion object {
    fun validRecord(r: JSONObject): Boolean = try {
      val data = r.getJSONObject("data"); val request = r.getJSONObject("request")
      r.getString("identifier").startsWith("crono.notifications.v1.") && r.getString("identifier").length <= 200
        && r.getString("token").length in 1..100 && r.getString("title").length <= 4000 && r.getString("body").length <= 4000
        && r.getString("channelId") in listOf("classic", "bell", "digital", "gong", "silent").map { "crono.alerts.$it.v1" }
        && data.getString("app") == "crono" && data.getInt("version") == 1 && data.getString("fingerprint").length <= 4000
        && data.getString("eventId") == request.getString("eventId") && data.getLong("dueAt") == request.getLong("dueAt")
        && data.getString("runId") == request.getString("runId") && data.getString("owner") == request.getString("owner")
        && data.getString("kind") == request.getString("kind") && CompletionAlertPolicy.validRequest(request)
    } catch (_: Exception) { false }
  }
}
