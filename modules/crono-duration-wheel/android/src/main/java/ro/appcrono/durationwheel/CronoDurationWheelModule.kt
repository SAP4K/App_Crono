package ro.appcrono.durationwheel

import android.os.Looper
import android.os.SystemClock
import android.util.Log
import android.view.ViewGroup
import android.widget.OverScroller
import androidx.core.os.HandlerCompat
import com.facebook.react.uimanager.PixelUtil
import com.facebook.react.views.scroll.ReactScrollView
import com.facebook.react.views.scroll.ReactScrollViewHelper
import com.facebook.react.views.scroll.ScrollEventType
import expo.modules.kotlin.Promise
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.WeakHashMap
import kotlin.math.abs
import kotlin.math.roundToInt
import kotlin.math.sqrt

private const val RELEASE_LOG_TAG = "CronoWheelRelease"
private const val WHEEL_ID = "crono-duration-wheel-"
private const val COAST_ID = "${WHEEL_ID}coast-"

class CronoDurationWheelModule : Module() {
  private class Release(val time: Long, val position: Int, val fingerVelocity: Float) {
    var coast: Coast? = null
  }

  private class Coast(val owner: Runnable) {
    lateinit var frame: Runnable
    var stopObserver: Promise? = null
  }

  private val mainHandler = HandlerCompat.createAsync(Looper.getMainLooper())
  private val releases = WeakHashMap<ReactScrollView, Release>()
  // React Native does not expose its Android fling state. Only inspect this known view
  // implementation, and use its normal momentum event if either field is unavailable.
  private val scrollerField = scrollField("mScroller")
  private val pendingField = scrollField("mPostTouchRunnable")
  private val listener = object : ReactScrollViewHelper.ScrollListener {
    override fun onLayout(scrollView: ViewGroup?) = Unit

    override fun onScroll(scrollView: ViewGroup?, type: ScrollEventType?, xVelocity: Float, yVelocity: Float) {
      if (scrollView !is ReactScrollView) return
      when (type) {
        ScrollEventType.END_DRAG -> {
          if (nativeId(scrollView)?.startsWith(WHEEL_ID) != true) return
          cancelCoast(scrollView)
          val release = Release(SystemClock.uptimeMillis(), scrollView.scrollY, yVelocity)
          releases[scrollView] = release
          // RN chooses its row after END_DRAG, on the same touch stack.
          mainHandler.postAtFrontOfQueue { softenRelease(scrollView, release) }
        }
        ScrollEventType.BEGIN_DRAG, ScrollEventType.MOMENTUM_END -> {
          cancelCoast(scrollView)
          releases.remove(scrollView)
        }
        else -> Unit
      }
    }
  }

  override fun definition() = ModuleDefinition {
    Name("CronoDurationWheel")
    OnCreate { ReactScrollViewHelper.addScrollListener(listener) }
    OnDestroy {
      ReactScrollViewHelper.removeScrollListener(listener)
      mainHandler.post {
        releases.keys.toList().forEach { cancelCoast(it) }
        releases.clear()
      }
    }
    AsyncFunction("awaitStop") { tag: Int, timestamp: Double, promise: Promise ->
      val view = wheelView(tag)
      if (view == null) promise.resolve(null)
      else awaitStop(view, timestamp, promise)
    }.runOnQueue(Queues.MAIN)
    AsyncFunction("scrollWheel") { tag: Int, offset: Double, animated: Boolean ->
      val view = wheelView(tag)
      if (view == null) false
      else {
        cancelCoast(view)
        val y = PixelUtil.toPixelFromDIP(offset).roundToInt()
        view.abortAnimation()
        if (animated) view.reactSmoothScrollTo(view.scrollX, y) else view.scrollTo(view.scrollX, y)
        true
      }
    }.runOnQueue(Queues.MAIN)
    AsyncFunction("interruptCoast") { tag: Int, touchTime: Double ->
      val view = wheelView(tag)
      if (view != null && (releases[view]?.time ?: Long.MAX_VALUE) <= touchTime) cancelCoast(view)
    }.runOnQueue(Queues.MAIN)
  }

  private fun awaitStop(view: ReactScrollView, timestamp: Double, promise: Promise) {
    val release = releases[view]
    // The listener runs immediately before RN creates the timestamped drag-end event.
    if (release == null || timestamp - release.time !in 0.0..8.0 || !view.isAttachedToWindow) {
      promise.resolve(null)
      return
    }
    val coast = release.coast
    if (coast != null) {
      if (coast.stopObserver != null || pendingScroll(view) !== coast.owner) promise.resolve(null)
      else {
        coast.stopObserver = promise
        if (Log.isLoggable(RELEASE_LOG_TAG, Log.DEBUG)) {
          Log.d(RELEASE_LOG_TAG, "[FIX:wheel-latency] observing coast releaseMs=${release.time}")
        }
      }
      return
    }
    val scroller = scroller(view)
    val owner = pendingScroll(view)
    if (scroller == null || owner == null) {
      promise.resolve(null)
      return
    }

    val observer = object : Runnable {
      // ScrollView advances OverScroller while drawing. Run after that frame's traversal.
      private val afterFrame = Runnable { mainHandler.post(this) }

      fun schedule() = view.postOnAnimation(afterFrame)

      override fun run() {
        val now = SystemClock.uptimeMillis()
        if (!view.isAttachedToWindow || releases[view] !== release || pendingScroll(view) !== owner ||
          release.coast != null || now - release.time > 3000
        ) {
          promise.resolve(null)
          return
        }

        val y = view.scrollY
        if (scroller.isFinished && !view.getFlingAnimator().isRunning &&
          y != release.position && y == scroller.currY && y == scroller.finalY
        ) {
          promise.resolve(mapOf("offset" to PixelUtil.toDIPFromPixel(y.toFloat()).toDouble(), "timestamp" to now.toDouble()))
          return
        }
        schedule()
      }
    }
    observer.schedule()
  }

  private fun softenRelease(view: ReactScrollView, release: Release) {
    val owner = pendingScroll(view) ?: return
    if (!view.isAttachedToWindow || releases[view] !== release ||
      view.scrollY != release.position || view.getFlingAnimator().isRunning
    ) return

    val scroller = scroller(view) ?: return
    if (scroller.isFinished || scroller.startY != release.position || scroller.currY != release.position) return
    val target = scroller.finalY
    val displacement = target - release.position
    val distance = abs(displacement)
    val rowHeight = view.height / 3.0
    if (distance == 0 || rowHeight <= 0) return

    val debug = Log.isLoggable(RELEASE_LOG_TAG, Log.DEBUG)
    val stockVelocity = scroller.currVelocity
    if (debug) Log.d(RELEASE_LOG_TAG, "[FIX:wheel-release] deltaPx=$displacement fingerPxMs=${release.fingerVelocity} stockPxS=$stockVelocity")
    if (nativeId(view)?.startsWith(COAST_ID) == true) {
      val profile = durationWheelCoast(displacement, rowHeight, release.fingerVelocity)
      if (profile != null) {
        startCoast(view, release, scroller, owner, target, profile)
        return
      }
    }
    // A slight overprojection shortens the portion of the tail that rounds to one pixel.
    val freeDistance = distance + maxOf(2, (distance * 0.02).roundToInt())
    val velocity = durationWheelReleaseVelocity(displacement, freeDistance, rowHeight, release.fingerVelocity, stockVelocity)
    val friction = if (velocity != 0) fitFriction(OverScroller(view.context), abs(velocity), freeDistance) else null
    val x = view.scrollX
    if (friction != null) {
      val originalFriction = 1f - view.reactScrollViewScrollState.decelerationRate
      // Keep the current scroller and RN's post-touch owner. Clear the stock
      // velocity first so Android's flywheel cannot add it to the fitted release.
      scroller.forceFinished(true)
      scroller.setFriction(friction)
      try {
        scroller.fling(x, release.position, 0, velocity, x, x, target, target, 0, 0)
      } finally {
        scroller.setFriction(originalFriction)
      }
      if (debug) Log.d(RELEASE_LOG_TAG, "[FIX:wheel-release] coast launchPxS=$velocity targetPx=$target")
    } else {
      // Android's cubic centering curve starts from rest and uses the same target,
      // scroller and terminal observer, including when fitting was unavailable.
      if (!scroller.springBack(x, release.position, x, x, target, target)) {
        if (debug) Log.w(RELEASE_LOG_TAG, "[FIX:wheel-release] centering did not start deltaPx=$displacement")
        return
      }
      if (debug) Log.d(RELEASE_LOG_TAG, "[FIX:wheel-release] center targetPx=$target fitted=${velocity != 0}")
    }
    view.postInvalidateOnAnimation()
  }

  private fun startCoast(view: ReactScrollView, release: Release, scroller: OverScroller,
    owner: Runnable, target: Int, profile: DurationWheelCoast,
  ) {
    val coast = Coast(owner)
    val width = view.width
    val height = view.height
    val contentHeight = view.getChildAt(0)?.height
    val start = SystemClock.uptimeMillis()
    var last = release.position
    scroller.forceFinished(true)
    // RN's idle callback can start a second snap during a rounded-pixel plateau.
    // Remove that callback and retain its identity to detect a new native gesture.
    view.removeCallbacks(owner)
    release.coast = coast
    if (Log.isLoggable(RELEASE_LOG_TAG, Log.DEBUG)) {
      Log.d(RELEASE_LOG_TAG, "coast start fromPx=$last targetPx=$target durationMs=${profile.durationMs} approachPx=${profile.approachDistancePx} approachAtMs=${profile.approachAtMs} peakAtMs=${profile.peakAtMs}")
    }
    coast.frame = object : Runnable {
      override fun run() {
        if (release.coast !== coast) return
        if (!view.isAttachedToWindow || pendingScroll(view) !== owner || view.scrollY != last ||
          view.width != width || view.height != height || view.getChildAt(0)?.height != contentHeight
        ) {
          cancelCoast(view)
          return
        }
        val elapsed = (SystemClock.uptimeMillis() - start).toDouble()
        val reducing = nativeId(view)?.startsWith(COAST_ID) != true
        val progress = if (reducing) 1.0 else profile.progress(elapsed)
        val offset = release.position + ((target - release.position) * progress).roundToInt()
        if (offset != last) view.scrollTo(view.scrollX, offset)
        if (view.scrollY != offset) {
          cancelCoast(view)
          return
        }
        last = offset
        // The monotone curve cannot move again once pixel rounding reaches the final row.
        if (offset == target) {
          release.coast = null
          clearOwner(view, owner)
          if (Log.isLoggable(RELEASE_LOG_TAG, Log.DEBUG)) Log.d(RELEASE_LOG_TAG, "coast end atPx=$last elapsedMs=$elapsed")
          // Publish the committed stop directly, ahead of the regular React Native momentum event.
          resolveCoastStop(coast, last)
          ReactScrollViewHelper.emitScrollMomentumEndEvent(view)
        } else view.postOnAnimation(this)
      }
    }
    view.postOnAnimation(coast.frame)
  }

  private fun cancelCoast(view: ReactScrollView) {
    val release = releases[view] ?: return
    val coast = release.coast ?: return
    release.coast = null
    view.removeCallbacks(coast.frame)
    clearOwner(view, coast.owner)
    resolveCoastStop(coast)
    if (Log.isLoggable(RELEASE_LOG_TAG, Log.DEBUG)) Log.d(RELEASE_LOG_TAG, "coast cancelled atPx=${view.scrollY}")
  }

  private fun resolveCoastStop(coast: Coast, offsetPx: Int? = null) {
    val observer = coast.stopObserver ?: return
    coast.stopObserver = null
    val timestamp = SystemClock.uptimeMillis().toDouble()
    val stop = offsetPx?.let {
      mapOf("offset" to PixelUtil.toDIPFromPixel(it.toFloat()).toDouble(), "timestamp" to timestamp)
    }
    if (Log.isLoggable(RELEASE_LOG_TAG, Log.DEBUG)) {
      Log.d(RELEASE_LOG_TAG, "[FIX:wheel-latency] coast observation resolved offsetPx=$offsetPx timestampMs=$timestamp")
    }
    observer.resolve(stop)
  }

  private fun clearOwner(view: ReactScrollView, owner: Runnable) {
    if (pendingScroll(view) === owner) pendingField?.set(view, null)
  }

  private fun nativeId(view: ReactScrollView) = view.getTag(com.facebook.react.R.id.view_tag_native_id) as? String

  private fun wheelView(tag: Int) = runCatching { appContext.findView<ReactScrollView>(tag) }.getOrNull()

  private fun fitFriction(probe: OverScroller, speed: Int, distance: Int): Float? {
    var lower = 0.0001f
    var upper = 0.5f
    // Each prediction starts fresh so Android does not carry over velocity from a previous trial.
    repeat(20) {
      val friction = sqrt(lower * upper)
      probe.forceFinished(true)
      probe.setFriction(friction)
      probe.fling(0, 0, 0, speed, 0, 0, 0, Int.MAX_VALUE)
      when {
        probe.finalY in distance..(distance + 1) -> return friction
        probe.finalY > distance -> lower = friction
        else -> upper = friction
      }
    }
    return null
  }

  private fun scroller(view: ReactScrollView) = runCatching { scrollerField?.get(view) as? OverScroller }.getOrNull()

  private fun pendingScroll(view: ReactScrollView) = runCatching { pendingField?.get(view) as? Runnable }.getOrNull()

  private fun scrollField(name: String) =
    runCatching { ReactScrollView::class.java.getDeclaredField(name).apply { isAccessible = true } }.getOrNull()
}
