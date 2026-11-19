package ro.appcrono.durationwheel

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class DurationWheelReleaseTest {
  @Test
  fun coastStartsAtReleaseSpeedRisesThenTapersToTheSameTargetInEitherDirection() {
    for (direction in listOf(-1, 1)) {
      val distance = direction * 150
      val coast = durationWheelCoast(distance, 412.0 / 3, direction * -0.357f)!!
      fun position(fraction: Double) = distance * coast.progress(coast.durationMs * fraction)
      fun speed(from: Double, until: Double) =
        direction * (position(until) - position(from)) / ((until - from) * coast.durationMs)
      assertEquals(0.357, speed(0.0, 0.001), 0.001)
      assertTrue(speed(0.07, 0.12) > speed(0.01, 0.05))
      assertTrue(speed(0.16, 0.20) > speed(0.07, 0.12))
      assertTrue(speed(0.16, 0.20) > speed(0.40, 0.45))
      assertTrue(speed(0.40, 0.45) > speed(0.80, 0.85))
      assertTrue(speed(0.95, 0.99) < 0.01)
      assertEquals(0.0, position(0.0), 0.0)
      assertEquals(distance.toDouble(), position(1.0), 0.0)
      assertEquals(distance.toDouble(), position(1.1), 0.0)
    }
  }

  @Test
  fun coastLeavesShortOpposedAndImplausibleReleasesToNativeSettling() {
    for ((distance, fingerSpeed) in listOf(0 to -0.357f, 40 to -0.357f, 150 to 0.357f, 150 to -0.01f, 150 to -2f)) {
      assertNull(durationWheelCoast(distance, 412.0 / 3, fingerSpeed))
    }
  }

  @Test
  fun slowReleaseCannotBoostTheFingerSpeedInEitherDirection() {
    val rowHeight = 412.0 / 3
    val forward = durationWheelReleaseVelocity(150, 153, rowHeight, -0.35713568f, 1467f)
    val reverse = durationWheelReleaseVelocity(-151, 154, rowHeight, 0.35712928f, 1477f)
    assertTrue("Forward launch was ${forward} px/s", forward in 1..357)
    assertTrue("Reverse launch was ${reverse} px/s", reverse in -357..-1)
  }

  @Test
  fun briskReleaseRetainsAForwardGlide() {
    val velocity = durationWheelReleaseVelocity(1467, 1496, 412.0 / 3, -2.8526127f, 3122f)
    assertEquals(2852, velocity)
  }

  @Test
  fun nearRestOrMotionAwayFromTheTargetCallsForCentering() {
    for (fingerVelocity in listOf(0f, -0.0009f, 0.35713568f)) {
      assertEquals(0, durationWheelReleaseVelocity(150, 153, 412.0 / 3, fingerVelocity, 1467f))
    }
  }

  @Test
  fun impossibleCoastCallsForCentering() {
    assertEquals(0, durationWheelReleaseVelocity(150, 153, 412.0 / 3, -0.2f, 1467f))
  }
}
