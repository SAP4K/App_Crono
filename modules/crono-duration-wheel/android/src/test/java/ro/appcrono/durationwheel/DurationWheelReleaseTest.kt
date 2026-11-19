package ro.appcrono.durationwheel

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class DurationWheelReleaseTest {
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
