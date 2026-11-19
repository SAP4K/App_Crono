package ro.appcrono.durationwheel

import kotlin.math.abs

private const val RAMP_FRACTION = 0.18
private const val PEAK_RATIO = 1.45

internal class DurationWheelCoast(val durationMs: Double, private val initialSpeed: Double) {
  private val peak = PEAK_RATIO * initialSpeed

  fun progress(elapsedMs: Double): Double {
    val progress = elapsedMs / durationMs
    if (progress <= 0) return 0.0
    if (progress >= 1) return 1.0
    if (progress <= RAMP_FRACTION) {
      val phase = progress / RAMP_FRACTION
      return RAMP_FRACTION * (initialSpeed * phase + (peak - initialSpeed) * integral(phase))
    }
    val phase = (progress - RAMP_FRACTION) / (1 - RAMP_FRACTION)
    return RAMP_FRACTION * (initialSpeed + peak) / 2 + (1 - RAMP_FRACTION) * peak * (phase - integral(phase))
  }

  // Integral of smoothstep velocity. Both segments share the same speed at the peak.
  private fun integral(phase: Double) = phase * phase * phase * (1 - phase / 2)
}

internal fun durationWheelCoast(displacement: Int, rowHeight: Double, fingerVelocity: Float): DurationWheelCoast? {
  val distance = abs(displacement)
  val speed = fingerVelocity.toDouble() * if (displacement > 0) -1 else 1
  if (rowHeight <= 0 || distance < rowHeight / 2 || !speed.isFinite() || speed <= 0) return null
  val duration = 2 * distance / (speed * (PEAK_RATIO + RAMP_FRACTION))
  if (duration !in 210.0..1300.0) return null
  return DurationWheelCoast(duration, speed * duration / distance)
}

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
