package com.giblets.camerahal

import android.Manifest
import android.content.pm.PackageManager
import android.graphics.ImageFormat
import android.hardware.camera2.*
import android.os.Bundle
import android.widget.ScrollView
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat

class MainActivity : android.app.Activity() {

    private lateinit var tv: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Build UI in code - no layout file needed
        val scroll = ScrollView(this)
        tv = TextView(this).apply {
            setPadding(24, 24, 24, 24)
            textSize = 11f
            typeface = android.graphics.Typeface.MONOSPACE
            setTextColor(0xFF00FF00.toInt()) // Green on black
            setBackgroundColor(0xFF000000.toInt())
        }
        scroll.addView(tv)
        setContentView(scroll)

        if (checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.CAMERA), 1)
        } else {
            runDiagnostic()
        }
    }

    override fun onRequestPermissionsResult(req: Int, perms: Array<String>, results: IntArray) {
        super.onRequestPermissionsResult(req, perms, results)
        if (results.isNotEmpty() && results[0] == PackageManager.PERMISSION_GRANTED) {
            runDiagnostic()
        } else {
            log("CAMERA PERMISSION DENIED")
        }
    }

    private fun runDiagnostic() {
        val manager = getSystemService(CAMERA_SERVICE) as CameraManager
        val sb = StringBuilder()

        sb.appendLine("╔══════════════════════════════════════╗")
        sb.appendLine("║   GIBLETS CAMERA HAL DIAGNOSTIC      ║")
        sb.appendLine("║   S24 Ultra - 200MP HP2 Hunter       ║")
        sb.appendLine("╚══════════════════════════════════════╝\n")

        val logicalIds = manager.cameraIdList
        sb.appendLine("LOGICAL CAMERAS: ${logicalIds.joinToString(", ")}\n")

        for (id in logicalIds) {
            val chars = manager.getCameraCharacteristics(id)

            val facing = when (chars.get(CameraCharacteristics.LENS_FACING)) {
                CameraCharacteristics.LENS_FACING_BACK -> "BACK"
                CameraCharacteristics.LENS_FACING_FRONT -> "FRONT"
                else -> "EXTERNAL"
            }

            val activeArray = chars.get(CameraCharacteristics.SENSOR_INFO_ACTIVE_ARRAY_SIZE)
            val pw = activeArray?.width() ?: 0
            val ph = activeArray?.height() ?: 0
            val mp = (pw.toLong() * ph.toLong()) / 1_000_000L

            val physSize = chars.get(CameraCharacteristics.SENSOR_INFO_PHYSICAL_SIZE)
            val caps = chars.get(CameraCharacteristics.REQUEST_AVAILABLE_CAPABILITIES) ?: intArrayOf()

            val hasRaw = CameraCharacteristics.REQUEST_AVAILABLE_CAPABILITIES_RAW in caps
            val hasManual = CameraCharacteristics.REQUEST_AVAILABLE_CAPABILITIES_MANUAL_SENSOR in caps
            val isLogical = CameraCharacteristics.REQUEST_AVAILABLE_CAPABILITIES_LOGICAL_MULTI_CAMERA in caps

            val focalLengths = chars.get(CameraCharacteristics.LENS_INFO_AVAILABLE_FOCAL_LENGTHS)

            sb.appendLine("┌─ CAMERA ID: $id ($facing) ─────────────")
            sb.appendLine("│ Active Array : ${pw}×${ph} (~${mp}MP)")
            sb.appendLine("│ Physical Size: ${physSize?.width}×${physSize?.height}mm")
            sb.appendLine("│ Focal Lengths: ${focalLengths?.joinToString(", ") { "%.1fmm".format(it) }}")
            sb.appendLine("│ RAW Support  : $hasRaw")
            sb.appendLine("│ Manual Sensor: $hasManual")
            sb.appendLine("│ Logical Cam  : $isLogical")

            if (mp >= 150) {
                sb.appendLine("│ ⚡⚡ 200MP SENSOR FOUND HERE! ⚡⚡")
            }

            // ── THE KEY PART: Physical sub-camera IDs ──────────────────────
            val physicalIds = chars.physicalCameraIds
            if (physicalIds.isEmpty()) {
                sb.appendLine("│ Physical IDs : NONE (Samsung HAL blocking)")
            } else {
                sb.appendLine("│ Physical IDs : ${physicalIds.joinToString(", ")}")
                sb.appendLine("│ ⚡ PHYSICAL CAMERAS ACCESSIBLE!")

                for (physId in physicalIds) {
                    try {
                        val pc = manager.getCameraCharacteristics(physId)
                        val pa = pc.get(CameraCharacteristics.SENSOR_INFO_ACTIVE_ARRAY_SIZE)
                        val ppw = pa?.width() ?: 0
                        val pph = pa?.height() ?: 0
                        val pmp = (ppw.toLong() * pph.toLong()) / 1_000_000L
                        val pfl = pc.get(CameraCharacteristics.LENS_INFO_AVAILABLE_FOCAL_LENGTHS)
                        val pRaw = CameraCharacteristics.REQUEST_AVAILABLE_CAPABILITIES_RAW in
                                (pc.get(CameraCharacteristics.REQUEST_AVAILABLE_CAPABILITIES) ?: intArrayOf())

                        sb.appendLine("│   ├─ Physical[$physId]: ${ppw}×${pph} (~${pmp}MP)")
                        sb.appendLine("│   │  Focal: ${pfl?.joinToString(", ") { "%.1fmm".format(it) }}")
                        sb.appendLine("│   │  RAW: $pRaw")

                        if (pmp >= 150) {
                            sb.appendLine("│   │  ⚡⚡⚡ THIS IS THE 200MP HP2! ID=$physId ⚡⚡⚡")
                            sb.appendLine("│   │  Use setPhysicalCameraId(\"$physId\") in CaptureRequest")
                        }
                    } catch (e: Exception) {
                        sb.appendLine("│   ├─ Physical[$physId]: BLOCKED - ${e.message}")
                    }
                }
            }

            // Max JPEG size
            val streamMap = chars.get(CameraCharacteristics.SCALER_STREAM_CONFIGURATION_MAP)
            val maxJpeg = streamMap?.getOutputSizes(ImageFormat.JPEG)
                ?.maxByOrNull { it.width.toLong() * it.height.toLong() }
            sb.appendLine("│ Max JPEG     : ${maxJpeg?.width}×${maxJpeg?.height}")

            // RAW sizes
            if (hasRaw) {
                val maxRaw = streamMap?.getOutputSizes(ImageFormat.RAW_SENSOR)
                    ?.maxByOrNull { it.width.toLong() * it.height.toLong() }
                sb.appendLine("│ Max RAW      : ${maxRaw?.width}×${maxRaw?.height}")
            }

            sb.appendLine("└────────────────────────────────────────\n")
        }

        sb.appendLine("═══════════════════════════════════════")
        sb.appendLine("VERDICT:")
        sb.appendLine("Look for ⚡ markers above.")
        sb.appendLine("If Physical IDs found → 200MP accessible")
        sb.appendLine("If all NONE → Samsung HAL fully blocking")
        sb.appendLine("═══════════════════════════════════════")

        log(sb.toString())
    }

    private fun log(text: String) {
        runOnUiThread { tv.text = text }
    }
}
