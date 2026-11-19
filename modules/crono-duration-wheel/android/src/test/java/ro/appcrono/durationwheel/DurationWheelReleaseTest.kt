package ro.appcrono.durationwheel

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import kotlin.math.roundToInt

class DurationWheelReleaseTest {
  @Test
  fun quickFlickReachesFourPercentWhileStillSeveralPixelsFromTheTarget() {
    val rowHeight = 412.0 / 3
    val fingerSpeed = 2.8526f
    for (direction in listOf(-1, 1)) {
      val distance = direction * 1467
      val coast = durationWheelCoast(distance, rowHeight, direction * -fingerSpeed)!!
      fun position(time: Double) = distance * coast.progress(time)
      fun speed(time: Double) = direction * (position(time + 0.5) - position(time - 0.5))

      assertEquals(fingerSpeed.toDouble(), direction * position(0.1) / 0.1, 0.01)
      val approachAt = coast.approachAtMs
      assertEquals(0.04 * fingerSpeed, speed(approachAt), 0.001)
      assertEquals(coast.approachDistancePx, direction * (distance - position(approachAt)), 0.001)
      assertTrue(coast.durationMs in 850.0..1300.0)
      val peakAt = 0.18 * 2 * kotlin.math.abs(distance) / (fingerSpeed * (1.45 + 0.18))
      // The verified reference first rounded to this target at 823 ms for the same input.
      val firstCentered = (0..1300).first { position(it.toDouble()).roundToInt() == distance }
      val visibleExtension = (firstCentered - peakAt) / (823 - peakAt)
      assertTrue("Visible braking ratio was $visibleExtension", visibleExtension in 1.20..1.25)
      assertTrue(coast.approachDistancePx in 25.0..29.0)
      val brakingSamples = (0..100).map { speed(peakAt + (coast.durationMs - peakAt) * it / 100) }
      assertTrue(brakingSamples.zipWithNext().all { (before, after) -> after <= before && after >= 0 })
      assertEquals(distance.toDouble(), position(coast.durationMs), 0.0)
    }
  }

  @Test
  fun longerApproachStillFitsAReleaseCloseToTheCoastLimit() {
    val distance = 3000
    val coast = durationWheelCoast(distance, 412.0 / 3, -3f)!!
    assertTrue(coast.approachDistancePx in 4.0..15.0)
    assertTrue(coast.durationMs <= 1300.000001)
    assertEquals(1.0, coast.progress(coast.durationMs), 0.0)
  }

  @Test
  fun coastStartsAtReleaseSpeedRisesThenTapersToTheSameTargetInEitherDirection() {
    for (direction in listOf(-1, 1)) {
      val distance = direction * 150
      val coast = durationWheelCoast(distance, 412.0 / 3, direction * -0.357f)!!
      assertEquals(0.0, coast.approachDistancePx, 0.0)
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
