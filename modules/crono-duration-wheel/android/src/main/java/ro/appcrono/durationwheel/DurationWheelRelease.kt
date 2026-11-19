package ro.appcrono.durationwheel

import kotlin.math.abs

private const val RAMP_FRACTION = 0.18
private const val PEAK_RATIO = 1.45
private const val APPROACH_SPEED_RATIO = 0.04
private const val REFERENCE_APPROACH_ROW_FRACTION = 0.20
private const val REFERENCE_APPROACH_MS = 500.0
private const val BASE_COAST_LIMIT_MS = 1300.0
private const val FAST_COAST_TIME_GAIN = 0.23
private const val FAST_APPROACH_ROW_FRACTION = 0.32
private const val FAST_APPROACH_LIMIT_MS = 780.0
private const val FAST_COAST_LIMIT_MS = 1450.0

internal class WheelVelocitySegment(val durationMs: Double, private val from: Double, private val to: Double) {
  val distancePx = durationMs * (from + to) / 2

  fun distanceAt(elapsedMs: Double): Double {
    val phase = (elapsedMs / durationMs).coerceIn(0.0, 1.0)
    // Integrate smoothstep velocity so the joins share speed and acceleration.
    val integral = phase * phase * phase * (1 - phase / 2)
    return durationMs * (from * phase + (to - from) * integral)
  }
}

internal class DurationWheelCoast(
  private val distancePx: Int,
  private val launch: WheelVelocitySegment,
  private val brake: WheelVelocitySegment,
  private val approach: WheelVelocitySegment? = null,
) {
  val approachDistancePx = approach?.distancePx ?: 0.0
  val peakAtMs = launch.durationMs
  val approachAtMs = peakAtMs + brake.durationMs
  val durationMs = approachAtMs + (approach?.durationMs ?: 0.0)

  fun progress(elapsedMs: Double): Double {
    if (elapsedMs <= 0) return 0.0
    if (elapsedMs >= durationMs) return 1.0
    return (launch.distanceAt(elapsedMs) + brake.distanceAt(elapsedMs - peakAtMs) +
      (approach?.distanceAt(elapsedMs - approachAtMs) ?: 0.0)) / distancePx
  }
}

internal fun durationWheelCoast(displacement: Int, rowHeight: Double, fingerVelocity: Float): DurationWheelCoast? {
  val distance = abs(displacement)
  val speed = fingerVelocity.toDouble() * if (displacement > 0) -1 else 1
  if (rowHeight <= 0 || distance < rowHeight / 2 || !speed.isFinite() || speed <= 0) return null
  val duration = 2 * distance / (speed * (PEAK_RATIO + RAMP_FRACTION))
  if (duration !in 210.0..BASE_COAST_LIMIT_MS) return null
  val peak = PEAK_RATIO * speed
  val launch = WheelVelocitySegment(duration * RAMP_FRACTION, speed, peak)
  if (speed * 1000 / rowHeight >= 8 && distance >= rowHeight) {
    val approachSpeed = APPROACH_SPEED_RATIO * speed
    val remaining = distance - launch.distancePx
    val brakeMsPerPixel = 2 / (peak + approachSpeed)
    val approachMsPerPixel = 2 / approachSpeed
    val baseDuration = launch.durationMs + remaining * brakeMsPerPixel
    val additionalMsPerPixel = approachMsPerPixel - brakeMsPerPixel
    val referenceDistance = minOf(
      rowHeight * REFERENCE_APPROACH_ROW_FRACTION,
      REFERENCE_APPROACH_MS / approachMsPerPixel,
      (BASE_COAST_LIMIT_MS - baseDuration) / additionalMsPerPixel,
    )
    if (referenceDistance >= 4) {
      // Moving distance from braking into the slower approach adds time without moving the target.
      val referenceDuration = baseDuration + referenceDistance * additionalMsPerPixel
      val approachDistance = minOf(
        referenceDistance + referenceDuration * FAST_COAST_TIME_GAIN / additionalMsPerPixel,
        rowHeight * FAST_APPROACH_ROW_FRACTION,
        FAST_APPROACH_LIMIT_MS / approachMsPerPixel,
        (FAST_COAST_LIMIT_MS - baseDuration) / additionalMsPerPixel,
      )
      val brake = WheelVelocitySegment((remaining - approachDistance) * brakeMsPerPixel, peak, approachSpeed)
      val approach = WheelVelocitySegment(approachDistance * approachMsPerPixel, approachSpeed, 0.0)
      return DurationWheelCoast(distance, launch, brake, approach)
    }
  }
  return DurationWheelCoast(distance, launch, WheelVelocitySegment(duration - launch.durationMs, peak, 0.0))
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
