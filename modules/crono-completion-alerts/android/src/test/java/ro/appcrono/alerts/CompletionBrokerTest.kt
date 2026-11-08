package ro.appcrono.alerts

import android.content.ContextWrapper
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test

class CompletionBrokerTest {
  private fun field(type: Class<*>, name: String) = type.getDeclaredField(name).apply { isAccessible = true }

  @Test fun storageFailureCannotEscapeNaturalCompletionCleanup() {
    val broker = CompletionPlaybackBroker::class.java
    val store = field(CompletionAlertStore::class.java, "ledger")
    val previousStore = store.get(null)
    val names = listOf("application", "record", "status", "serviceRequested", "generation", "revision", "started", "error")
    val previous = names.associateWith { field(broker, it).get(null) }
    val observer = CompletionRuntime.observer
    val states = mutableListOf<Map<String, Any?>>()
    try {
      store.set(null, CompletionAlertLedger({ null }, { error("injected-storage-write-failure") }))
      field(broker, "application").set(null, ContextWrapper(null))
      field(broker, "record").set(null, JSONObject())
      field(broker, "status").set(null, "playing")
      field(broker, "serviceRequested").set(null, true)
      field(broker, "generation").set(null, 0L)
      CompletionRuntime.observer = { name, state -> if (name == "playback") states.add(state) }
      val deadline = field(broker, "deadline").get(null)
      @Suppress("UNCHECKED_CAST")
      val ending = field(deadline.javaClass, "ended").get(deadline) as (Long) -> Unit
      ending(0L)
      assertNull(CompletionPlaybackBroker.record)
      assertEquals("idle", states.last()["status"])
      assertFalse(field(broker, "serviceRequested").getBoolean(null))
    } finally {
      store.set(null, previousStore)
      previous.forEach { (name, value) -> field(broker, name).set(null, value) }
      CompletionRuntime.observer = observer
    }
  }
}
