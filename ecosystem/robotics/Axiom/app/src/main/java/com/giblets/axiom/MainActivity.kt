package com.giblets.axiom

import android.Manifest
import android.app.Activity
import android.content.pm.PackageManager
import android.graphics.Color
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.AudioTrack
import android.media.MediaRecorder
import android.os.Bundle
import android.os.Environment
import android.os.Handler
import android.os.Looper
import android.text.Spannable
import android.text.SpannableStringBuilder
import android.text.style.ForegroundColorSpan
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import kotlin.math.*
import java.io.File
import java.io.FileOutputStream
import java.io.OutputStreamWriter
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.text.SimpleDateFormat
import java.util.*

class MainActivity : Activity(), SensorEventListener {

    private lateinit var sm: SensorManager
    private lateinit var tv: TextView
    private val handler = Handler(Looper.getMainLooper())

    // Colours
    private val cGreen  = Color.rgb(0, 255, 70)
    private val cDim    = Color.rgb(0, 160, 40)
    private val cFaint  = Color.rgb(0, 80, 20)
    private val cCyan   = Color.rgb(0, 220, 255)
    private val cAmber  = Color.rgb(255, 180, 0)
    private val cRed    = Color.rgb(255, 60, 60)
    private val cWhite  = Color.rgb(200, 255, 210)

    // Sensors
    private var magX = 0f; private var magY = 0f; private var magZ = 0f
    private var magnitude = 0f; private var baseMag = 0f; private var baseSet = false
    private var peakMag = 0f; private var minMag = Float.MAX_VALUE
    private var emfSpikeCount = 0
    private var pressure = 0f; private var basePressure = 0f
    private var pressureSet = false; private var peakPressureDelta = 0f
    private val pressureHistory = ArrayDeque<Float>()
    private val PRESSURE_WINDOW = 60
    private var lastLoggedPressureDelta = 0f
    private var lightRaw = 0f; private var lightFront = 0f
    private var baseLight = 0f; private var lightSet = false
    private var peakLight = 0f; private var minLight = Float.MAX_VALUE
    private var accelMag = 0f; private var peakAccel = 0f

    // Alert
    private var alertLevel = 0
    private var alertReason = "INITIALISING"
    private val sessionEvents = mutableListOf<String>()
    private val sdf = SimpleDateFormat("HH:mm:ss", Locale.UK)
    private var sessionStart = System.currentTimeMillis()

    // EVP Recording
    private var isRecording = false
    private var lastEvpTime = 0L
    private val EVP_COOLDOWN = 30000L // 30s between auto recordings
    private var evpCount = 0
    private var evpStatus = ""

    // Audio (Geiger)
    private var audioTrack: AudioTrack? = null
    private val audioHandler = Handler(Looper.getMainLooper())
    private val rng = Random()
    private val SAMPLE_RATE = 44100

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Color.rgb(2, 8, 2))
        }

        val btnRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            setBackgroundColor(Color.rgb(0, 15, 5))
            setPadding(8, 6, 8, 6)
        }

        fun makeBtn(label: String, color: Int, action: () -> Unit) = Button(this).apply {
            text = label
            textSize = 10f
            typeface = android.graphics.Typeface.MONOSPACE
            setBackgroundColor(Color.rgb(0, 25, 8))
            setTextColor(color)
            setPadding(4, 4, 4, 4)
            setOnClickListener { action() }
        }

        btnRow.addView(makeBtn("[ RESET ]", cGreen) { resetBaseline() },
            LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f))
        btnRow.addView(makeBtn("[ SNAPSHOT ]", cCyan) { takeSnapshot() },
            LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f))
        btnRow.addView(makeBtn("[ REC EVP ]", cRed) { recordEvp("MANUAL") },
            LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f))
        btnRow.addView(makeBtn("[ CLEAR ]", cAmber) {
            sessionEvents.clear(); emfSpikeCount = 0
            peakMag = magnitude; peakAccel = accelMag; peakPressureDelta = 0f
        }, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f))

        root.addView(btnRow)

        val scroll = ScrollView(this)
        tv = TextView(this).apply {
            textSize = 11.5f
            typeface = android.graphics.Typeface.MONOSPACE
            setTextColor(cGreen)
            setBackgroundColor(Color.rgb(2, 8, 2))
            setPadding(14, 10, 14, 10)
            text = "Initialising PhantomScope..."
        }
        scroll.addView(tv)
        root.addView(scroll, LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT, 0, 1f))

        setContentView(root)

        // Request audio permission
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) !=
            PackageManager.PERMISSION_GRANTED) {
            requestPermissions(arrayOf(Manifest.permission.RECORD_AUDIO), 1)
        }

        sm = getSystemService(SENSOR_SERVICE) as SensorManager
        sm.getDefaultSensor(Sensor.TYPE_MAGNETIC_FIELD)?.let {
            sm.registerListener(this, it, SensorManager.SENSOR_DELAY_FASTEST) }
        sm.getDefaultSensor(Sensor.TYPE_PRESSURE)?.let {
            sm.registerListener(this, it, SensorManager.SENSOR_DELAY_NORMAL) }
        sm.getDefaultSensor(Sensor.TYPE_LIGHT)?.let {
            sm.registerListener(this, it, SensorManager.SENSOR_DELAY_NORMAL) }
        sm.getDefaultSensor(65578)?.let {
            sm.registerListener(this, it, SensorManager.SENSOR_DELAY_NORMAL) }
        sm.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)?.let {
            sm.registerListener(this, it, SensorManager.SENSOR_DELAY_GAME) }

        initAudio()
        scheduleClick()

        handler.post(object : Runnable {
            override fun run() {
                updateDisplay()
                handler.postDelayed(this, 250)
            }
        })
    }

    // ── EVP Recording ─────────────────────────────────────────

    private fun recordEvp(trigger: String) {
        if (isRecording) return
        val now = System.currentTimeMillis()
        if (trigger != "MANUAL" && now - lastEvpTime < EVP_COOLDOWN) return
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) !=
            PackageManager.PERMISSION_GRANTED) {
            logEvent("EVP FAILED: No mic permission")
            return
        }
        lastEvpTime = now
        isRecording = true
        evpCount++
        val ts = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.UK).format(Date())
        val filename = "EVP_${ts}_${trigger}.wav"
        evpStatus = "REC $filename"
        logEvent("EVP START: $filename ($trigger)")

        Thread {
            try {
                val dir = File(Environment.getExternalStoragePublicDirectory(
                    Environment.DIRECTORY_DOWNLOADS), "PhantomScope")
                dir.mkdirs()
                val file = File(dir, filename)
                val recSampleRate = 44100
                val channelConfig = android.media.AudioFormat.CHANNEL_IN_MONO
                val audioFormat = android.media.AudioFormat.ENCODING_PCM_16BIT
                val bufSize = AudioRecord.getMinBufferSize(recSampleRate, channelConfig, audioFormat)
                val recorder = AudioRecord(
                    MediaRecorder.AudioSource.MIC,
                    recSampleRate, channelConfig, audioFormat, bufSize * 4)

                val durationSecs = 10
                val totalSamples = recSampleRate * durationSecs
                val audioData = ShortArray(totalSamples)

                recorder.startRecording()
                var samplesRead = 0
                while (samplesRead < totalSamples) {
                    val read = recorder.read(audioData, samplesRead,
                        minOf(bufSize, totalSamples - samplesRead))
                    if (read > 0) samplesRead += read else break
                }
                recorder.stop()
                recorder.release()

                // Write WAV file
                writeWav(file, audioData, samplesRead, recSampleRate)

                handler.post {
                    evpStatus = "SAVED: $filename"
                    logEvent("EVP SAVED: $filename (${samplesRead/recSampleRate}s)")
                    isRecording = false
                }
            } catch (e: Exception) {
                handler.post {
                    evpStatus = "EVP ERROR: ${e.message}"
                    logEvent("EVP FAILED: ${e.message}")
                    isRecording = false
                }
            }
        }.start()
    }

    private fun writeWav(file: File, data: ShortArray, samples: Int, sampleRate: Int) {
        val byteRate = sampleRate * 2
        val dataSize = samples * 2
        val fos = FileOutputStream(file)
        val buf = ByteBuffer.allocate(44 + dataSize).order(ByteOrder.LITTLE_ENDIAN)
        buf.put("RIFF".toByteArray())
        buf.putInt(36 + dataSize)
        buf.put("WAVE".toByteArray())
        buf.put("fmt ".toByteArray())
        buf.putInt(16)
        buf.putShort(1)  // PCM
        buf.putShort(1)  // mono
        buf.putInt(sampleRate)
        buf.putInt(byteRate)
        buf.putShort(2)  // block align
        buf.putShort(16) // bits per sample
        buf.put("data".toByteArray())
        buf.putInt(dataSize)
        for (i in 0 until samples) buf.putShort(data[i])
        fos.write(buf.array())
        fos.close()
    }

    // ── Audio (Geiger) ────────────────────────────────────────

    private fun initAudio() {
        try {
            val bufSize = AudioTrack.getMinBufferSize(SAMPLE_RATE,
                AudioFormat.CHANNEL_OUT_MONO, AudioFormat.ENCODING_PCM_16BIT)
            audioTrack = AudioTrack.Builder()
                .setAudioAttributes(AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_MEDIA)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build())
                .setAudioFormat(AudioFormat.Builder()
                    .setSampleRate(SAMPLE_RATE)
                    .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                    .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                    .build())
                .setBufferSizeInBytes(bufSize * 4)
                .setTransferMode(AudioTrack.MODE_STREAM)
                .build()
            audioTrack?.play()
        } catch (e: Exception) { audioTrack = null }
    }

    private fun playClick(intensity: Float) {
        val track = audioTrack ?: return
        Thread {
            try {
                val samples = SAMPLE_RATE * 8 / 1000
                val buf = ShortArray(samples)
                val vol = (intensity * 26000f).toInt().coerceIn(1000, 26000)
                for (i in 0 until samples) {
                    val envelope = exp(-i.toFloat() / SAMPLE_RATE * 400f)
                    buf[i] = ((rng.nextFloat() * 2f - 1f) * vol * envelope).toInt().toShort()
                }
                track.write(buf, 0, buf.size)
            } catch (e: Exception) {}
        }.start()
    }

    private fun scheduleClick() {
        val interval = when (alertLevel) {
            0 -> 3000L; 1 -> 700L; 2 -> 250L; else -> 80L
        }
        val intensity = when (alertLevel) {
            0 -> 0.15f; 1 -> 0.4f; 2 -> 0.7f; else -> 1.0f
        }
        playClick(intensity)
        audioHandler.postDelayed({ scheduleClick() }, interval)
    }

    // ── Sensors ───────────────────────────────────────────────

    override fun onSensorChanged(event: SensorEvent) {
        when (event.sensor.type) {
            Sensor.TYPE_MAGNETIC_FIELD -> {
                magX = event.values[0]; magY = event.values[1]; magZ = event.values[2]
                magnitude = sqrt(magX*magX + magY*magY + magZ*magZ)
                if (!baseSet) { baseMag = magnitude; baseSet = true; minMag = magnitude }
                if (magnitude > peakMag) peakMag = magnitude
                if (magnitude < minMag) minMag = magnitude
                if (abs(magnitude - baseMag) > 25f) {
                    emfSpikeCount++
                    logEvent("EMF SPIKE +${"%.1f".format(abs(magnitude-baseMag))}uT")
                    // Auto EVP on strong EMF spike
                    if (alertLevel >= 2) recordEvp("EMF${emfSpikeCount}")
                }
            }
            Sensor.TYPE_PRESSURE -> {
                pressure = event.values[0]
                pressureHistory.addLast(pressure)
                if (pressureHistory.size > PRESSURE_WINDOW) pressureHistory.removeFirst()
                if (!pressureSet) { basePressure = pressure; pressureSet = true }
                else if (pressureHistory.size >= PRESSURE_WINDOW)
                    basePressure = pressureHistory.average().toFloat()
                val delta = abs(pressure - basePressure)
                if (delta > peakPressureDelta) peakPressureDelta = delta
                if (delta > 0.5f && abs(delta - lastLoggedPressureDelta) > 0.1f) {
                    logEvent("PRESSURE D${"%.3f".format(delta)}hPa")
                    lastLoggedPressureDelta = delta
                }
            }
            Sensor.TYPE_LIGHT -> lightFront = event.values[0]
            65578 -> {
                lightRaw = event.values[0]
                if (!lightSet) { baseLight = lightRaw; lightSet = true; minLight = lightRaw }
                if (lightRaw > peakLight) peakLight = lightRaw
                if (lightRaw < minLight) minLight = lightRaw
            }
            Sensor.TYPE_ACCELEROMETER -> {
                val x = event.values[0]; val y = event.values[1]; val z = event.values[2]
                accelMag = sqrt(x*x + y*y + z*z)
                if (accelMag > peakAccel) peakAccel = accelMag
            }
        }
    }

    // ── Display ───────────────────────────────────────────────

    private fun updateDisplay() {
        val emfDelta = magnitude - baseMag
        val pressureDelta = if (pressureSet) pressure - basePressure else 0f
        val accelDelta = (accelMag - 9.8f).coerceAtLeast(0f)
        val lightRange = if (peakLight > minLight) peakLight - minLight else 1f

        alertLevel = 0; alertReason = "ALL CLEAR"
        if (abs(emfDelta) > 10) { alertLevel = 1; alertReason = "EMF FLUCTUATION" }
        if (abs(emfDelta) > 25) { alertLevel = 2; alertReason = "STRONG EMF ANOMALY" }
        if (abs(emfDelta) > 50) { alertLevel = 3; alertReason = "EXTREME EMF EVENT" }
        if (abs(pressureDelta) > 0.3f && alertLevel < 2) { alertLevel = 2; alertReason = "PRESSURE ANOMALY" }
        if (abs(pressureDelta) > 0.8f) { alertLevel = 3; alertReason = "PRESSURE BREACH" }
        if (accelDelta > 3f && alertLevel < 1) { alertLevel = 1; alertReason = "VIBRATION DETECTED" }

        // Auto EVP on sustained WARNING+
        if (alertLevel >= 2 && !isRecording) recordEvp("AUTO")

        val mainCol = when (alertLevel) {
            0 -> cGreen; 1 -> cCyan; 2 -> cAmber; 3 -> cRed; else -> cGreen
        }
        val elapsed = formatDuration(System.currentTimeMillis() - sessionStart)

        val sb = SpannableStringBuilder()

        fun line(text: String, color: Int = mainCol) {
            val start = sb.length
            sb.append(text).append("\n")
            sb.setSpan(ForegroundColorSpan(color), start, sb.length - 1,
                Spannable.SPAN_EXCLUSIVE_EXCLUSIVE)
        }
        fun dim(text: String)   = line(text, cDim)
        fun faint(text: String) = line(text, cFaint)
        fun white(text: String) = line(text, cWhite)

        line("┌─────────────────────────────────────┐")
        line("│       P H A N T O M S C O P E      │")
        line("│     PARANORMAL  FIELD  DETECTOR     │")
        line("└─────────────────────────────────────┘")
        faint("  Session: $elapsed")
        line("")

        val banner = when (alertLevel) {
            0 -> "  ●  ALL CLEAR"
            1 -> "  ◆  ANOMALY DETECTED"
            2 -> "  ▲  WARNING"
            3 -> "  ■  ENTITY DETECTED"
            else -> ""
        }
        line(banner)
        dim("  $alertReason")
        line("")

        // EVP status
        if (isRecording) {
            line("  ● REC  $evpStatus", cRed)
        } else if (evpStatus.isNotEmpty()) {
            dim("  EVP #$evpCount: $evpStatus")
        }
        if (isRecording || evpStatus.isNotEmpty()) line("")

        line("┄┄ EMF / MAGNETIC FIELD ┄┄┄┄┄┄┄┄┄┄┄┄", cDim)
        white("  Field     ${"%.2f".format(magnitude)} uT")
        dim(  "  Baseline  ${"%.2f".format(baseMag)} uT")
        line( "  Delta     ${"%.2f".format(emfDelta)} uT  ${tag(abs(emfDelta), 10f, 25f, 50f)}")
        dim(  "  Range     ${"%.1f".format(minMag)}-${"%.1f".format(peakMag)} uT   Spikes: $emfSpikeCount")
        line( "  [${bar(abs(emfDelta), 80f)}]")
        faint("  X:${"%.1f".format(magX)}  Y:${"%.1f".format(magY)}  Z:${"%.1f".format(magZ)}")
        line("")

        line("┄┄ ATMOSPHERIC PRESSURE ┄┄┄┄┄┄┄┄┄┄┄┄", cDim)
        if (pressureSet) {
            white("  Pressure  ${"%.3f".format(pressure)} hPa")
            line( "  Delta     ${"%.4f".format(pressureDelta)} hPa  ${tag(abs(pressureDelta), 0.1f, 0.3f, 0.8f)}")
            dim(  "  Peak D    ${"%.4f".format(peakPressureDelta)} hPa")
            faint("  Baseline: rolling (${pressureHistory.size}/$PRESSURE_WINDOW)")
            line( "  [${bar(abs(pressureDelta), 1f)}]")
        } else { dim("  Waiting...") }
        line("")

        line("┄┄ KINETIC / VIBRATION ┄┄┄┄┄┄┄┄┄┄┄┄┄", cDim)
        white("  Accel     ${"%.3f".format(accelMag)} m/s2")
        dim(  "  Above grav ${"%.3f".format(accelDelta)}   Peak: ${"%.2f".format(peakAccel)}")
        line( "  [${bar(accelDelta, 10f)}]")
        line("")

        line("┄┄ AMBIENT LIGHT ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄", cDim)
        white("  Raw       ${"%.0f".format(lightRaw)}")
        dim(  "  Front     ${"%.0f".format(lightFront)} lux")
        dim(  "  Range     ${"%.0f".format(minLight)}-${"%.0f".format(peakLight)}")
        line( "  [${bar(lightRaw - minLight, lightRange)}]")
        line("")

        if (sessionEvents.isNotEmpty()) {
            line("┄┄ SESSION LOG (${sessionEvents.size}) ┄┄┄┄┄┄┄┄┄┄┄┄┄┄", cDim)
            sessionEvents.takeLast(10).forEach { faint("  $it") }
            line("")
        }

        line("┄┄ FIELD NOTES ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄", cDim)
        faint("  Baseline: ${"%.1f".format(baseMag)} uT  (Earth avg ~50 uT)")
        faint("  EVP auto-records on WARNING+ (30s cooldown)")
        faint("  Anomaly D>10  Warning D>25  Extreme D>50")

        tv.text = sb
    }

    private fun bar(value: Float, max: Float, width: Int = 28): String {
        val filled = ((value / max) * width).toInt().coerceIn(0, width)
        return "█".repeat(filled) + "░".repeat(width - filled)
    }

    private fun tag(v: Float, low: Float, mid: Float, high: Float) = when {
        v >= high -> "!! EXTREME"
        v >= mid  -> "!  WARNING"
        v >= low  -> "*  ANOMALY"
        else      -> ""
    }

    private fun formatDuration(ms: Long): String {
        val s = ms/1000; val m = s/60; val h = m/60
        return "%02d:%02d:%02d".format(h, m%60, s%60)
    }

    private fun resetBaseline() {
        baseMag = magnitude; basePressure = pressure; baseLight = lightRaw
        pressureHistory.clear(); peakPressureDelta = 0f; lastLoggedPressureDelta = 0f
        peakMag = magnitude; minMag = magnitude
        peakAccel = accelMag; peakLight = lightRaw; minLight = lightRaw
        emfSpikeCount = 0; sessionStart = System.currentTimeMillis()
        evpStatus = ""; evpCount = 0
        logEvent("BASELINE RESET")
    }

    private fun takeSnapshot() {
        val ts = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.UK).format(Date())
        val sb = StringBuilder()
        sb.append("PHANTOMSCOPE SNAPSHOT\r\n")
        sb.append("Timestamp: $ts\r\n")
        sb.append("Duration:  ${formatDuration(System.currentTimeMillis() - sessionStart)}\r\n")
        sb.append("Alert:     $alertReason (level $alertLevel)\r\n")
        sb.append("EVP files: $evpCount\r\n\r\n")
        sb.append("EMF\r\n")
        sb.append("  Magnitude: ${"%.3f".format(magnitude)} uT\r\n")
        sb.append("  Baseline:  ${"%.3f".format(baseMag)} uT\r\n")
        sb.append("  Delta:     ${"%.3f".format(magnitude - baseMag)} uT\r\n")
        sb.append("  Range:     ${"%.1f".format(minMag)}-${"%.1f".format(peakMag)} uT\r\n")
        sb.append("  Spikes:    $emfSpikeCount\r\n")
        sb.append("  X:${"%.3f".format(magX)} Y:${"%.3f".format(magY)} Z:${"%.3f".format(magZ)}\r\n\r\n")
        sb.append("PRESSURE\r\n")
        sb.append("  Current:  ${"%.4f".format(pressure)} hPa\r\n")
        sb.append("  Delta:    ${"%.4f".format(pressure - basePressure)} hPa\r\n")
        sb.append("  Peak D:   ${"%.4f".format(peakPressureDelta)} hPa\r\n\r\n")
        sb.append("LIGHT\r\n")
        sb.append("  Raw:      ${"%.1f".format(lightRaw)}\r\n")
        sb.append("  Front:    ${"%.1f".format(lightFront)} lux\r\n\r\n")
        sb.append("KINETIC\r\n")
        sb.append("  Accel:    ${"%.3f".format(accelMag)} m/s2\r\n")
        sb.append("  Peak:     ${"%.3f".format(peakAccel)} m/s2\r\n\r\n")
        sb.append("SESSION LOG\r\n")
        sessionEvents.forEach { sb.append("  $it\r\n") }
        try {
            val dir = File(Environment.getExternalStoragePublicDirectory(
                Environment.DIRECTORY_DOWNLOADS), "PhantomScope")
            dir.mkdirs()
            val fn = "phantom_${SimpleDateFormat("yyyyMMdd_HHmmss", Locale.UK).format(Date())}.txt"
            val writer = OutputStreamWriter(File(dir, fn).outputStream(), Charsets.UTF_8)
            writer.write(sb.toString()); writer.flush(); writer.close()
            logEvent("SNAPSHOT: $fn")
        } catch (e: Exception) { logEvent("SNAP FAILED: ${e.message}") }
    }

    private fun logEvent(msg: String) {
        sessionEvents.add("[${sdf.format(Date())}] $msg")
        if (sessionEvents.size > 50) sessionEvents.removeAt(0)
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}

    override fun onDestroy() {
        super.onDestroy()
        handler.removeCallbacksAndMessages(null)
        audioHandler.removeCallbacksAndMessages(null)
        sm.unregisterListener(this)
        audioTrack?.stop()
        audioTrack?.release()
    }
}
