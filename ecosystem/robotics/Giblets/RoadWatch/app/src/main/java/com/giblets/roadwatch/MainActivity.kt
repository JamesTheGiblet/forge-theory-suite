package com.giblets.roadwatch

import android.Manifest
import android.app.Activity
import android.content.*
import android.content.pm.PackageManager
import android.graphics.*
import android.os.*
import android.widget.*

class MainActivity : Activity() {

    private var service: RoadService? = null
    private var bound = false
    private lateinit var db: RoadDatabase
    private lateinit var mapView: RoadMapView
    private lateinit var tvStatus: TextView
    private lateinit var tvSpeed: TextView
    private lateinit var tvG: TextView
    private lateinit var tvEvents: TextView
    private lateinit var tvLog: TextView
    private lateinit var btnStart: Button
    private lateinit var btnStop: Button
    private val handler = Handler(Looper.getMainLooper())
    private var isRecording = false
    private val recentEvents = mutableListOf<String>()

    private val cGreen = 0xFF00FF44.toInt()
    private val cDim   = 0xFF006622.toInt()
    private val cAmber = 0xFFFFAA00.toInt()
    private val cRed   = 0xFFFF3333.toInt()
    private val cBg    = 0xFF060F06.toInt()

    private val connection = object : ServiceConnection {
        override fun onServiceConnected(name: ComponentName, binder: IBinder) {
            service = (binder as RoadService.LocalBinder).getService()
            bound = true
            service?.onEvent = { event ->
                handler.post {
                    addEventToLog(event)
                    refreshMap()
                    updateStats()
                }
            }
            service?.onSpeedUpdate = { kmh ->
                handler.post { tvSpeed.text = "${"%.0f".format(kmh)} km/h" }
            }
            service?.onGUpdate = { g ->
                handler.post {
                    tvG.text = "${"%.2f".format(g)}G"
                    tvG.setTextColor(when {
                        g > 3f   -> cRed
                        g > 1.5f -> cAmber
                        else     -> cGreen
                    })
                }
            }
        }
        override fun onServiceDisconnected(name: ComponentName) {
            bound = false; service = null
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        CrashLogger(this)
        db = RoadDatabase(this)
        buildUI()
        checkPermissions()
        refreshMap()
        updateStats()
    }

    private fun buildUI() {
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(cBg)
        }

        val header = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(0xFF030D03.toInt())
            setPadding(20, 40, 20, 12)
        }

        fun mono(text: String, size: Float, color: Int) = TextView(this).apply {
            this.text = text
            textSize = size
            setTextColor(color)
            typeface = Typeface.MONOSPACE
        }

        header.addView(mono("▣ ROADWATCH", 20f, cGreen))
        header.addView(mono("Road Quality Mapper | Giblets Creations", 10f, cDim))

        val statsRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            setPadding(0, 12, 0, 0)
        }

        tvSpeed  = mono("0 km/h",    22f, cGreen)
        tvG      = mono("0.00G",     22f, cGreen)
        tvEvents = mono("0 events",  18f, cDim)

        fun statBox(tv: TextView, label: String) = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(0, 0, 24, 0)
            addView(tv)
            addView(mono(label, 9f, cDim))
        }

        statsRow.addView(statBox(tvSpeed,  "SPEED"),
            LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f))
        statsRow.addView(statBox(tvG,      "G-FORCE"),
            LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f))
        statsRow.addView(statBox(tvEvents, "LOGGED"),
            LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f))
        header.addView(statsRow)

        tvStatus = mono("IDLE — press START to begin recording", 10f, cDim)
        tvStatus.setPadding(0, 8, 0, 0)
        header.addView(tvStatus)
        root.addView(header)

        mapView = RoadMapView(this)
        root.addView(mapView, LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT, 0, 2.5f))

        val logScroll = ScrollView(this)
        tvLog = TextView(this).apply {
            setTextColor(cDim)
            textSize = 9.5f
            typeface = Typeface.MONOSPACE
            setPadding(16, 8, 16, 8)
            setBackgroundColor(0xFF030803.toInt())
        }
        logScroll.addView(tvLog)
        root.addView(logScroll, LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT, 0, 1f))

        val btnRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            setBackgroundColor(0xFF020802.toInt())
            setPadding(8, 8, 8, 8)
        }

        fun makeBtn(label: String, bg: Int, action: () -> Unit) = Button(this).apply {
            text = label
            setBackgroundColor(bg)
            setTextColor(0xFFFFFFFF.toInt())
            textSize = 11f
            typeface = Typeface.MONOSPACE
            layoutParams = LinearLayout.LayoutParams(
                0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f).apply { setMargins(4,0,4,0) }
            setOnClickListener { action() }
        }

        btnStart = makeBtn("▶ START",     0xFF1B5E20.toInt()) { startRecording() }
        btnStop  = makeBtn("■ STOP",      0xFF7F0000.toInt()) { stopRecording() }
        val btnKml    = makeBtn("KML",    0xFF0D47A1.toInt()) { exportKml() }
        val btnGpx    = makeBtn("GPX",    0xFF1A237E.toInt()) { exportGpx() }
        val btnReport = makeBtn("REPORT", 0xFF4A148C.toInt()) { exportReport() }
        val btnClear  = makeBtn("CLEAR",  0xFF3E2723.toInt()) { clearData() }

        btnStop.isEnabled = false
        btnStop.alpha = 0.4f

        listOf(btnStart, btnStop, btnKml, btnGpx, btnReport, btnClear).forEach {
            btnRow.addView(it)
        }
        root.addView(btnRow)
        setContentView(root)
    }

    private fun startRecording() {
        val intent = Intent(this, RoadService::class.java)
        startForegroundService(intent)
        bindService(intent, connection, Context.BIND_AUTO_CREATE)
        isRecording = true
        tvStatus.text = "● RECORDING — drive normally"
        tvStatus.setTextColor(cGreen)
        btnStart.isEnabled = false; btnStart.alpha = 0.4f
        btnStop.isEnabled  = true;  btnStop.alpha  = 1f
    }

    private fun stopRecording() {
        if (bound) { unbindService(connection); bound = false }
        stopService(Intent(this, RoadService::class.java))
        isRecording = false
        tvStatus.text = "■ STOPPED — ${db.getCount()} events saved"
        tvStatus.setTextColor(cAmber)
        btnStart.isEnabled = true;  btnStart.alpha = 1f
        btnStop.isEnabled  = false; btnStop.alpha  = 0.4f
        service = null
        refreshMap()
        updateStats()
    }

    private fun refreshMap() { mapView.setEvents(db.getAll()) }
    private fun updateStats() { tvEvents.text = "${db.getCount()} events" }

    private fun addEventToLog(e: RoadEvent) {
        val icon = when (e.type) {
            EventType.POTHOLE -> "⚠"
            EventType.BUMP    -> "◆"
            EventType.ROUGH   -> "~"
            EventType.SMOOTH  -> "✓"
        }
        val line = "$icon ${e.type.label.padEnd(10)} ${"%.2f".format(e.peakG)}G  S${e.severity}  ${e.speedKmh.toInt()}km/h"
        recentEvents.add(0, line)
        if (recentEvents.size > 30) recentEvents.removeLast()
        tvLog.text = recentEvents.joinToString("\n")
    }

    private fun exportKml() {
        val events = db.getAll()
        if (events.isEmpty()) { toast("No events to export"); return }
        val file = ExportManager.exportKml(this, events)
        if (file != null) { toast("KML saved: ${file.name}"); ExportManager.shareFile(this, file) }
        else toast("Export failed")
    }

    private fun exportGpx() {
        val events = db.getAll()
        if (events.isEmpty()) { toast("No events to export"); return }
        val file = ExportManager.exportGpx(this, events)
        if (file != null) { toast("GPX saved: ${file.name}"); ExportManager.shareFile(this, file) }
        else toast("Export failed")
    }

    private fun exportReport() {
        val events = db.getAll()
        if (events.isEmpty()) { toast("No events to export"); return }
        val file = ExportManager.exportCouncilReport(this, events)
        if (file != null) { toast("Report saved: ${file.name}"); ExportManager.shareFile(this, file) }
        else toast("Export failed")
    }

    private fun clearData() {
        db.clear(); recentEvents.clear(); tvLog.text = ""
        refreshMap(); updateStats(); toast("Data cleared")
    }

    private fun checkPermissions() {
        val needed = listOf(
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION
        ).filter { checkSelfPermission(it) != PackageManager.PERMISSION_GRANTED }
        if (needed.isNotEmpty()) requestPermissions(needed.toTypedArray(), 1001)
    }

    private fun toast(msg: String) = Toast.makeText(this, msg, Toast.LENGTH_SHORT).show()

    override fun onDestroy() {
        super.onDestroy()
        if (bound) { unbindService(connection); bound = false }
    }
}
