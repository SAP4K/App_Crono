package ro.appcrono.alerts

import android.app.AlarmManager
import android.content.Context
import androidx.test.platform.app.InstrumentationRegistry
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Assume.assumeTrue
import org.junit.Test

class CompletionSchedulerInstrumentedTest {
  @Test fun actualAlarmManagerScheduleInventoryAndCancel() {
    val instrumentation = InstrumentationRegistry.getInstrumentation()
    val context = instrumentation.targetContext
    // This is a dedicated library test host, never the user's CRONO installation.
    assertNotEquals("ro.appcrono.mobile", context.packageName)
    assumeTrue("Test host requires notification/exact access", CompletionAlarmScheduler.capable(context))
    instrumentation.runOnMainSync {
      val event = JSONObject().put("owner", "timer").put("kind", "timer-complete").put("eventId", "timer:test")
        .put("runId", "test").put("dueAt", System.currentTimeMillis() + 120000)
      val descriptor = JSONObject().put("event", event).put("title", "CRONO test").put("body", "Native boundary")
        .put("sound", false).put("channelId", "crono.alerts.silent.v1").put("fingerprint", "instrumented")
        .put("completion", JSONObject().put("soundId", "bell").put("durationSeconds", 60).put("stopLabel", "Stop").put("openLabel", "Open"))
      val identifier = "crono.notifications.v1.instrumented"
      try {
        assertEquals(identifier, CompletionRuntime.upsert(context, identifier, descriptor))
        assertTrue(CompletionAlertStore.get(context).pending().any { it.getString("identifier") == identifier })
        assertNotNull((context.getSystemService(Context.ALARM_SERVICE) as AlarmManager).nextAlarmClock)
      } finally { CompletionRuntime.cancel(context, identifier) }
      assertTrue(CompletionAlertStore.get(context).pending().isEmpty())
    }
  }
}
