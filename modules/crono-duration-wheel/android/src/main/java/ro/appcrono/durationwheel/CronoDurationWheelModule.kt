package ro.appcrono.durationwheel

import android.os.Looper
import android.os.SystemClock
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

class CronoDurationWheelModule : Module() {
  private data class Release(val time: Long, val position: Int)

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
        ScrollEventType.END_DRAG -> releases[scrollView] = Release(SystemClock.uptimeMillis(), scrollView.scrollY)
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
    val scroller = runCatching { scrollerField?.get(view) as? OverScroller }.getOrNull()
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

  private fun pendingScroll(view: ReactScrollView) = runCatching { pendingField?.get(view) }.getOrNull()

  private fun scrollField(name: String) =
    runCatching { ReactScrollView::class.java.getDeclaredField(name).apply { isAccessible = true } }.getOrNull()
}
