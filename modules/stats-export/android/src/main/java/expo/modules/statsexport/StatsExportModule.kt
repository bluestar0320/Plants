package expo.modules.statsexport

import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class StatsExportModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ExpoStatsExport")

    Function("writeStats") { total: Int, overdue: Int, dueToday: Int ->
      val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()
      StatsPrefs.write(context, total, overdue, dueToday)
      WateringWidgetProvider.updateAll(context)
    }
  }
}
