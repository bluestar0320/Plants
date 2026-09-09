package expo.modules.statsexport

import android.content.ContentProvider
import android.content.ContentValues
import android.database.Cursor
import android.database.MatrixCursor
import android.net.Uri

/**
 * Read-only window into the app's watering summary counts, for another app on the
 * same device (e.g. "Total Care") to query. Only query() returns data; every
 * mutating method throws, so no external app can write through this provider —
 * the numbers are only ever set from inside this app via [StatsPrefs.write].
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
    val snapshot = StatsPrefs.read(context!!)
    val cursor = MatrixCursor(
      arrayOf(StatsPrefs.KEY_TOTAL, StatsPrefs.KEY_OVERDUE, StatsPrefs.KEY_DUE_TODAY, StatsPrefs.KEY_UPDATED_AT),
    )
    cursor.addRow(arrayOf(snapshot.total, snapshot.overdue, snapshot.dueToday, snapshot.updatedAt))
    return cursor
  }

  override fun getType(uri: Uri): String = "vnd.android.cursor.item/vnd.${context?.packageName}.stats"

  override fun insert(uri: Uri, values: ContentValues?): Uri =
    throw UnsupportedOperationException("StatsProvider is read-only.")

  override fun update(uri: Uri, values: ContentValues?, selection: String?, selectionArgs: Array<out String>?): Int =
    throw UnsupportedOperationException("StatsProvider is read-only.")

  override fun delete(uri: Uri, selection: String?, selectionArgs: Array<out String>?): Int =
    throw UnsupportedOperationException("StatsProvider is read-only.")
}
