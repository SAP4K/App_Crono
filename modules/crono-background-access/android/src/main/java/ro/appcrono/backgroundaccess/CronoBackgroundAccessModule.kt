package ro.appcrono.backgroundaccess

import android.app.AlarmManager
import android.content.Context
import android.os.Build
import android.os.PowerManager
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// Observations only. expo-notifications remains the sole alarm scheduler.
class CronoBackgroundAccessModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("CronoBackgroundAccess")

    AsyncFunction("getStatusAsync") {
      val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()
      val exactAlarm = if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
        "not-required"
      } else {
        val alarms = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        if (alarms.canScheduleExactAlarms()) "granted" else "denied"
      }
      val battery = if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
        "not-applicable"
      } else {
        val power = context.getSystemService(Context.POWER_SERVICE) as PowerManager
        if (power.isIgnoringBatteryOptimizations(context.packageName)) "unrestricted" else "optimized"
      }
      mapOf("exactAlarm" to exactAlarm, "battery" to battery)
    }
  }
}
