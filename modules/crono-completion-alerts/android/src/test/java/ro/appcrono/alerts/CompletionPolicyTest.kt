package ro.appcrono.alerts

import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test

class CompletionPolicyTest {
  @Test fun sharedPriorityCases() {
    val text = javaClass.classLoader!!.getResourceAsStream("completion-alert-cases.json")!!.bufferedReader().readText()
    val cases = JSONArray(text)
    for (index in 0 until cases.length()) {
      val item = cases.getJSONObject(index)
      assertEquals(item.getString("name"), item.getBoolean("wins"), CompletionAlertPolicy.wins(item.getJSONObject("current"), item.getJSONObject("incoming")))
    }
  }
  @Test fun minuteIsMonotonicAndBounded() {
    assertEquals(60000L, CompletionAlertPolicy.remaining(2000, 60, 2000))
    assertEquals(1L, CompletionAlertPolicy.remaining(2000, 60, 61999))
    assertEquals(0L, CompletionAlertPolicy.remaining(2000, 60, 62000))
    assertEquals(0L, CompletionAlertPolicy.remaining(2000, 60, 80000))
  }
  private fun record(index: Int = 0): JSONObject {
    val request = JSONObject("""{"owner":"timer","kind":"timer-complete","eventId":"timer:r$index","runId":"r$index","dueAt":1000,"soundId":"bell","durationSeconds":60}""")
    return JSONObject().put("identifier", "crono.notifications.v1.$index").put("token", "token$index")
      .put("title", "CRONO").put("body", "Done").put("channelId", "crono.alerts.bell.v1").put("request", request)
      .put("data", JSONObject(request.toString()).put("app", "crono").put("version", 1).put("fingerprint", "f"))
  }
  @Test fun ledgerSurvivesProcessReloadAndConsumesExactlyOnce() {
    var disk: String? = null
    val store = CompletionAlertLedger({ disk }, { disk = it }); val item = record()
    store.put(item)
    val restored = CompletionAlertLedger({ disk }, { disk = it })
    assertEquals(1, restored.pending().size)
    restored.consume(listOf(item), item)
    assertTrue(restored.pending().isEmpty()); assertEquals(1, restored.presented().size)
    assertTrue(CompletionAlertLedger({ disk }, {}).contains("timer:r0@1000"))
    restored.consume(listOf(item), item); assertEquals(1, restored.presented().size)
  }
  @Test fun interruptedWriteDoesNotPublishOrEraseOtherRecords() {
    var failWrite = false
    val store = CompletionAlertLedger({ null }, { if (failWrite) error("disk") })
    store.put(record(1)); failWrite = true
    try { store.put(record(2)); fail("Expected failure") } catch (_: IllegalStateException) { }
    assertEquals(1, store.pending().size)
  }
  @Test fun receiptsAreBoundedAndCancelDoesNotConsumeARearm() {
    val store = CompletionAlertLedger({ null }, {})
    for (index in 0..260) store.consume(listOf(record(index)))
    assertFalse(store.contains("timer:r0@1000")); assertTrue(store.contains("timer:r260@1000"))
    val item = record(300); store.put(item); store.cancel(item.getString("identifier")); store.put(item)
    assertFalse(store.contains("timer:r300@1000")); assertEquals(1, store.pending().size)
  }
  @Test fun rejectsMalformedOrOversizedAndKeepsValidRecords() {
    val item = record(); item.getJSONObject("request").put("durationSeconds", 61)
    assertFalse(CompletionAlertLedger.validRecord(item))
    val store = CompletionAlertLedger({ JSONObject().put("version", 1).put("pending", JSONArray(listOf(item, record(1)))).toString() }, {})
    assertEquals(1, store.pending().size)
  }
  @Test fun futureBoundAndUnsupportedVersionCannotOverwriteValidDisk() {
    val store = CompletionAlertLedger({ null }, {})
    for (index in 0..50) store.put(record(index))
    try { store.put(record(51)); fail("Expected bound") } catch (_: IllegalArgumentException) { }
    assertEquals(51, store.pending().size)
    var wrote = false
    try { CompletionAlertLedger({ "{\"version\":2}" }, { wrote = true }); fail("Expected version failure") }
    catch (_: IllegalArgumentException) { }
    assertFalse(wrote)
  }
  @Test fun receiverBatchesCrossedDeadlinesAndArmsTheNextWithoutJs() {
    val a = record(1); val b = record(2); b.getJSONObject("request").put("dueAt", 2000)
    val future = record(3); future.getJSONObject("request").put("dueAt", 3000)
    assertEquals(b, CompletionAlertPolicy.latest(listOf(a, b)))
    assertEquals(future, CompletionAlertPolicy.next(listOf(a, b, future), 2500))
    assertNull(CompletionAlertPolicy.next(listOf(a, b), 2500))
  }
  @Test fun nativeInputDoesNotCoerceBadSavedDurationsOrIdentifiers() {
    val request = record().getJSONObject("request")
    assertTrue(CompletionAlertPolicy.validRequest(request))
    request.put("durationSeconds", 60.5); assertFalse(CompletionAlertPolicy.validRequest(request))
    request.put("durationSeconds", 60).put("runId", 1).put("eventId", "timer:1")
    assertFalse(CompletionAlertPolicy.validRequest(request))
  }
  @Test fun preparationAndColdFailureCannotKeepObsoleteSoundPreferences() {
    val request = record().getJSONObject("request")
    val policy = JSONObject().put("soundId", "bell").put("durationSeconds", 60)
    assertTrue(CompletionAlertPolicy.soundMatches(policy, request))
    policy.put("durationSeconds", 15); assertFalse(CompletionAlertPolicy.soundMatches(policy, request))
    policy.put("durationSeconds", 60).put("soundId", "classic"); assertFalse(CompletionAlertPolicy.soundMatches(policy, request))
    request.put("owner", "preview").put("kind", "preview")
    assertFalse(CompletionAlertPolicy.soundMatches(policy, request))
    assertTrue(CompletionAlertPolicy.soundMatches(null, request))
  }
  @Test fun stopRequiresBothPhysicalIdentityAndCurrentGenerationToken() {
    val current = record(1)
    assertTrue(CompletionAlertPolicy.actionMatches(current, "crono.notifications.v1.1", "token1"))
    assertFalse(CompletionAlertPolicy.actionMatches(current, "crono.notifications.v1.0", "token1"))
    assertFalse(CompletionAlertPolicy.actionMatches(current, "crono.notifications.v1.1", "token0"))
  }
  @Test fun resetNullCannotMatchAStringNamedNullAndPausedRunsStayInvalid() {
    val request = record().getJSONObject("request").put("runId", "null").put("eventId", "timer:null")
    assertFalse(CompletionAlertPolicy.allowed(JSONObject().put("timerRunId", JSONObject.NULL), request))
    val policy = JSONObject().put("timerRunId", "null").put("timerPaused", false)
    assertTrue(CompletionAlertPolicy.allowed(policy, request))
    policy.put("timerPaused", true); assertFalse(CompletionAlertPolicy.allowed(policy, request))
  }
  @Test fun resumedDeadlineRejectsThePreviouslyArmedBoundary() {
    val request = record().getJSONObject("request")
    val policy = JSONObject().put("timerRunId", "r0").put("timerPaused", false)
      .put("events", JSONArray().put(JSONObject().put("eventId", "timer:r0").put("dueAt", 14000)))
    request.put("dueAt", 11000)
    assertFalse(CompletionAlertPolicy.allowed(policy, request))
    request.put("dueAt", 14000)
    assertTrue(CompletionAlertPolicy.allowed(policy, request))
  }
  private fun projectedPolicy(due: Long = 1000): JSONObject = JSONObject()
    .put("timerRunId", "r0").put("planningRunId", JSONObject.NULL)
    .put("timerPaused", false).put("planningPaused", false).put("timerCompleted", false).put("planningCompleted", false)
    .put("soundEnabled", true).put("backgroundEnabled", true).put("soundId", "bell").put("durationSeconds", 60)
    .put("events", JSONArray().put(JSONObject().put("eventId", "timer:r0").put("dueAt", due)))

  @Test fun coldCompletedPolicyRetainsItsKnownBoundaryWithoutAcceptingAnotherRun() {
    val prior = projectedPolicy()
    val completed = projectedPolicy().put("timerCompleted", true).put("events", JSONArray())
    val resolved = CompletionAlertPolicy.resolvePolicy(prior, completed)
    assertTrue(CompletionAlertPolicy.allowed(resolved, record().getJSONObject("request")))
    assertEquals(0, completed.getJSONArray("events").length())
    val reset = JSONObject(completed.toString()).put("timerRunId", JSONObject.NULL).put("timerCompleted", false)
    assertFalse(CompletionAlertPolicy.allowed(CompletionAlertPolicy.resolvePolicy(prior, reset), record().getJSONObject("request")))
    val paused = JSONObject(prior.toString()).put("timerPaused", true)
    assertFalse(CompletionAlertPolicy.allowed(CompletionAlertPolicy.resolvePolicy(paused, completed), record().getJSONObject("request")))
  }
  @Test fun completedPlanningPolicyPreservesEarlierRingingStepsAndFinalBoundary() {
    val prior = projectedPolicy().put("planningRunId", "plan")
    prior.getJSONArray("events").put(JSONObject().put("eventId", "planning:plan:0").put("dueAt", 2000))
      .put(JSONObject().put("eventId", "planning:plan:1").put("dueAt", 4000))
    val completed = projectedPolicy().put("planningRunId", "plan").put("planningCompleted", true)
    val resolved = CompletionAlertPolicy.resolvePolicy(prior, completed)
    for (index in 0..1) {
      val request = record().getJSONObject("request").put("owner", "planning").put("runId", "plan")
        .put("eventId", "planning:plan:$index").put("dueAt", if (index == 0) 2000 else 4000)
      assertTrue(CompletionAlertPolicy.allowed(resolved, request))
    }
    assertTrue(CompletionAlertPolicy.validPolicy(resolved))
  }
  @Test fun boundaryProjectionRejectsMalformedDuplicatesAndOversizedInputs() {
    assertTrue(CompletionAlertPolicy.validPolicy(projectedPolicy()))
    val duplicate = projectedPolicy()
    duplicate.getJSONArray("events").put(JSONObject().put("eventId", "timer:r0").put("dueAt", 2000))
    assertFalse(CompletionAlertPolicy.validPolicy(duplicate))
    val wrongType = projectedPolicy(); wrongType.getJSONArray("events").getJSONObject(0).put("dueAt", "1000")
    assertFalse(CompletionAlertPolicy.validPolicy(wrongType))
    val foreign = projectedPolicy(); foreign.getJSONArray("events").getJSONObject(0).put("eventId", "timer:other")
    assertFalse(CompletionAlertPolicy.validPolicy(foreign))
    val oversized = projectedPolicy(); repeat(51) { oversized.getJSONArray("events").put(JSONObject()) }
    assertFalse(CompletionAlertPolicy.validPolicy(oversized))
  }
}
