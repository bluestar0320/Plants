package expo.modules.statsexport

import android.content.Context

/** Shared storage for the watering summary counts, read by both StatsProvider and the home screen widget. */
object StatsPrefs {
  const val PREFS_NAME = "stats_export_prefs"
  const val KEY_TOTAL = "total"
  const val KEY_OVERDUE = "overdue"
  const val KEY_DUE_TODAY = "due_today"
  const val KEY_UPDATED_AT = "updated_at"

  data class Snapshot(val total: Int, val overdue: Int, val dueToday: Int, val updatedAt: Long)

  fun write(context: Context, total: Int, overdue: Int, dueToday: Int) {
    context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit()
      .putInt(KEY_TOTAL, total)
      .putInt(KEY_OVERDUE, overdue)
      .putInt(KEY_DUE_TODAY, dueToday)
      .putLong(KEY_UPDATED_AT, System.currentTimeMillis())
      .apply()
  }

  fun read(context: Context): Snapshot {
    val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    return Snapshot(
      total = prefs.getInt(KEY_TOTAL, 0),
      overdue = prefs.getInt(KEY_OVERDUE, 0),
      dueToday = prefs.getInt(KEY_DUE_TODAY, 0),
      updatedAt = prefs.getLong(KEY_UPDATED_AT, 0L),
    )
  }
}
