package ro.appcrono.alerts

import org.junit.Assert.*
import org.junit.Test

class CompletionDeadlineTest {
  private class Fixture {
    var now = 0L; var sequence = 0
    val jobs = mutableMapOf<Int, Pair<Long, () -> Unit>>()
    val ended = mutableListOf<Long>(); val failed = mutableListOf<Long>()
    val deadline = CompletionPlaybackDeadline<Int>({ now }, { delay, callback -> (++sequence).also { jobs[it] = Pair(now + delay, callback) } },
      { jobs.remove(it) }, { failed.add(it) }, { ended.add(it) })
    fun advance(time: Long) {
      while (jobs.values.any { it.first <= time }) {
        val next = jobs.minBy { it.value.first }; now = next.value.first; jobs.remove(next.key); next.value.second()
      }
      now = time
    }
  }
  @Test fun fullMinuteStartsAfterPreparationAndDoesNotRestart() {
    val f = Fixture(); f.deadline.begin(1); f.advance(2000)
    assertTrue(f.deadline.playing(1, 60)); f.advance(22000)
    assertEquals(40000L, f.deadline.remaining()); assertFalse(f.deadline.playing(1, 60))
    f.advance(61999); assertTrue(f.ended.isEmpty()); f.advance(62000); assertEquals(listOf(1L), f.ended)
    assertTrue(f.failed.isEmpty())
  }
  @Test fun cancellationRejectsEvenAlreadyDequeuedCallbacks() {
    val f = Fixture(); f.deadline.begin(1); val staleStartup = f.jobs.values.single().second
    f.deadline.clear(); staleStartup(); assertTrue(f.failed.isEmpty()); assertFalse(f.deadline.playing(1, 60))
    f.deadline.begin(2); f.deadline.playing(2, 60); val staleEnding = f.jobs.values.single().second
    f.deadline.begin(3); staleEnding(); assertTrue(f.ended.isEmpty())
    f.deadline.playing(3, 5); f.advance(5000); assertEquals(listOf(3L), f.ended)
  }
  @Test fun hungPreparationFailsOnceAndCannotExpireANewerRequest() {
    val f = Fixture(); f.deadline.begin(1); f.advance(3999); assertTrue(f.failed.isEmpty())
    f.advance(4000); assertEquals(listOf(1L), f.failed)
    f.deadline.begin(2); f.deadline.playing(2, 15); f.advance(19000)
    assertEquals(listOf(2L), f.ended); assertEquals(listOf(1L), f.failed)
  }
}
