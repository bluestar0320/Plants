package expo.modules.statsexport

import android.content.ContentProvider
import android.content.ContentValues
import android.content.Context
import android.database.Cursor
import android.database.MatrixCursor
import android.net.Uri

private const val PREFS_NAME = "stats_export_prefs"
private const val KEY_TOTAL = "total"
private const val KEY_OVERDUE = "overdue"
private const val KEY_DUE_TODAY = "due_today"
private const val KEY_UPDATED_AT = "updated_at"

/**
 * Read-only window into the app's watering summary counts, for another app on the
 * same device (e.g. "Total Care") to query. Only query() returns data; every
 * mutating method throws, so no external app can write through this provider —
 * the numbers are only ever set from inside this app via [writeStats].
 */
class StatsProvider : ContentProvider() {
  override fun onCreate(): Boolean = true

  override fun query(
    uri: Uri,
    projection: Array<out String>?,
    selection: String?,
    selectionArgs: Array<out String>?,
    sortOrder: String?,
  ): Cursor {
    val prefs = context!!.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    val cursor = MatrixCursor(arrayOf(KEY_TOTAL, KEY_OVERDUE, KEY_DUE_TODAY, KEY_UPDATED_AT))
    cursor.addRow(
      arrayOf(
        prefs.getInt(KEY_TOTAL, 0),
        prefs.getInt(KEY_OVERDUE, 0),
        prefs.getInt(KEY_DUE_TODAY, 0),
        prefs.getLong(KEY_UPDATED_AT, 0L),
      ),
    )
    return cursor
  }

  override fun getType(uri: Uri): String = "vnd.android.cursor.item/vnd.${context?.packageName}.stats"

  override fun insert(uri: Uri, values: ContentValues?): Uri =
    throw UnsupportedOperationException("StatsProvider is read-only.")

  override fun update(uri: Uri, values: ContentValues?, selection: String?, selectionArgs: Array<out String>?): Int =
    throw UnsupportedOperationException("StatsProvider is read-only.")

  override fun delete(uri: Uri, selection: String?, selectionArgs: Array<out String>?): Int =
    throw UnsupportedOperationException("StatsProvider is read-only.")

  companion object {
    /** Called only from inside this app (via StatsExportModule) to publish the latest counts. */
    fun writeStats(context: Context, total: Int, overdue: Int, dueToday: Int) {
      context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit()
        .putInt(KEY_TOTAL, total)
        .putInt(KEY_OVERDUE, overdue)
        .putInt(KEY_DUE_TODAY, dueToday)
        .putLong(KEY_UPDATED_AT, System.currentTimeMillis())
        .apply()
    }
  }
}
