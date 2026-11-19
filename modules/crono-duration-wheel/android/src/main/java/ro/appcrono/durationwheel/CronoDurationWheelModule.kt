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

class CronoDurationWheelModule : Module() {
  private data class Release(val time: Long, val position: Int, val fingerVelocity: Float)

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
          val release = Release(SystemClock.uptimeMillis(), scrollView.scrollY, yVelocity)
          releases[scrollView] = release
          val nativeId = scrollView.getTag(com.facebook.react.R.id.view_tag_native_id) as? String
          if (nativeId?.startsWith("crono-duration-wheel-") == true) {
            // RN chooses its row after END_DRAG on the same touch stack. Retune that
            // scroller only before its first visible movement, with original physics as fallback.
            mainHandler.postAtFrontOfQueue { softenRelease(scrollView, release) }
          }
        }
        ScrollEventType.BEGIN_DRAG, ScrollEventType.MOMENTUM_END -> releases.remove(scrollView)
        else -> Unit
      }
    }
  }

  override fun definition() = ModuleDefinition {
    Name("CronoDurationWheel")
    OnCreate { ReactScrollViewHelper.addScrollListener(listener) }
    OnDestroy { ReactScrollViewHelper.removeScrollListener(listener) }
    AsyncFunction("awaitStop") { tag: Int, timestamp: Double, promise: Promise ->
      val view = runCatching { appContext.findView<ReactScrollView>(tag) }.getOrNull()
      if (view == null) promise.resolve(null)
      else awaitStop(view, timestamp, promise)
    }.runOnQueue(Queues.MAIN)
  }

  private fun awaitStop(view: ReactScrollView, timestamp: Double, promise: Promise) {
    val release = releases[view]
    // The listener runs immediately before RN creates the timestamped drag-end event.
    if (release == null || timestamp - release.time !in 0.0..8.0) {
      promise.resolve(null)
      return
    }
    val scroller = scroller(view)
    val owner = pendingScroll(view)
    if (scroller == null || owner == null || !view.isAttachedToWindow) {
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
          now - release.time > 3000
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
    if (!view.isAttachedToWindow || releases[view] !== release || pendingScroll(view) == null ||
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

  private fun pendingScroll(view: ReactScrollView) = runCatching { pendingField?.get(view) }.getOrNull()

  private fun scrollField(name: String) =
    runCatching { ReactScrollView::class.java.getDeclaredField(name).apply { isAccessible = true } }.getOrNull()
}
