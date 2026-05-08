package com.giblets.roadwatch

import android.content.Context
import java.io.File
import java.text.SimpleDateFormat
import java.util.*

class CrashLogger(context: Context) : Thread.UncaughtExceptionHandler {
    private val dir = context.getExternalFilesDir(null)
    private val default = Thread.getDefaultUncaughtExceptionHandler()

    init { Thread.setDefaultUncaughtExceptionHandler(this) }

    override fun uncaughtException(t: Thread, e: Throwable) {
        try {
            val ts = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.UK).format(Date())
            val file = File(dir, "crash_$ts.txt")
            file.writeText("Thread: ${t.name}\n${e.stackTraceToString()}")
        } catch (_: Exception) {}
        default?.uncaughtException(t, e)
    }
}
