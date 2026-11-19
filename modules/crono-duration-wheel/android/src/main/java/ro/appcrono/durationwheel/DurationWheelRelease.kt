package ro.appcrono.durationwheel

import kotlin.math.abs

/** Returns the signed content speed, or zero when the wheel needs to center from rest. */
internal fun durationWheelReleaseVelocity(
  displacement: Int,
  freeDistance: Int,
  rowHeight: Double,
  fingerVelocity: Float,
  stockVelocity: Float,
): Int {
  if (abs(displacement) < 8 || rowHeight <= 0 || !fingerVelocity.isFinite() || !stockVelocity.isFinite()) return 0
  val rows = abs(displacement) / rowHeight
  val shortestSeconds = (90 + 25 * rows.coerceAtMost(8.0)) / 1000
  // RN reports finger motion in px/ms, opposite the content's motion in px/s.
  val towardTarget = fingerVelocity.toDouble() * if (displacement > 0) -1000 else 1000
  val speed = minOf(towardTarget, stockVelocity.toDouble(), freeDistance / (0.35 * shortestSeconds)).toInt()
  // An Android spline travels about 0.35 × initial speed × duration. Center
  // from rest if the available speed cannot reach the row in bounded time.
  if (speed < 1 || freeDistance > 0.35 * speed * 1.6) return 0
  return if (displacement > 0) speed else -speed
}
