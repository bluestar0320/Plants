package expo.modules.statsexport

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews

/** Home screen widget showing today's watering summary, refreshed whenever the app writes new stats. */
class WateringWidgetProvider : AppWidgetProvider() {
  override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
    for (id in appWidgetIds) updateWidget(context, appWidgetManager, id)
  }

  companion object {
    fun updateAll(context: Context) {
      val manager = AppWidgetManager.getInstance(context)
      val ids = manager.getAppWidgetIds(ComponentName(context, WateringWidgetProvider::class.java))
      for (id in ids) updateWidget(context, manager, id)
    }

    private fun updateWidget(context: Context, manager: AppWidgetManager, appWidgetId: Int) {
      val snapshot = StatsPrefs.read(context)
      val views = RemoteViews(context.packageName, R.layout.watering_widget)
      views.setTextViewText(R.id.widget_title, "🌱 내 식물 관리")
      views.setTextViewText(
        R.id.widget_summary,
        if (snapshot.overdue > 0) {
          "물 필요해요 ${snapshot.overdue}개 · 전체 ${snapshot.total}개"
        } else if (snapshot.dueToday > 0) {
          "오늘 급수 ${snapshot.dueToday}개 · 전체 ${snapshot.total}개"
        } else {
          "모두 건강해요 · 전체 ${snapshot.total}개"
        },
      )

      val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
      if (launchIntent != null) {
        launchIntent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        val pendingIntent = PendingIntent.getActivity(
          context,
          0,
          launchIntent,
          PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        views.setOnClickPendingIntent(R.id.widget_root, pendingIntent)
      }

      manager.updateAppWidget(appWidgetId, views)
    }
  }
}
