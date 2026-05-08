package com.giblets.uhrtest

import android.app.Activity
import android.graphics.ImageFormat
import android.hardware.camera2.CameraCharacteristics
import android.hardware.camera2.CameraManager
import android.os.Bundle
import android.widget.ScrollView
import android.widget.TextView

class MainActivity : Activity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val tv = TextView(this).apply {
            setBackgroundColor(0xFF000000.toInt())
            setTextColor(0xFF00FF00.toInt())
            textSize = 10f
            typeface = android.graphics.Typeface.MONOSPACE
            setPadding(16, 16, 16, 16)
        }
        val scroll = ScrollView(this)
        scroll.addView(tv)
        setContentView(scroll)
        tv.text = buildReport()
    }

    private fun buildReport(): String {
        val sb = StringBuilder()
        val cm = getSystemService(CAMERA_SERVICE) as CameraManager

        for (id in cm.cameraIdList) {
            sb.appendLine("== CAMERA $id ==========================")
            val c = cm.getCameraCharacteristics(id)

            val pa = c.get(CameraCharacteristics.SENSOR_INFO_PIXEL_ARRAY_SIZE)
            val mp = if (pa != null) pa.width.toLong() * pa.height / 1_000_000.0 else 0.0
            sb.appendLine("Pixel array:  ${pa?.width} x ${pa?.height}  (${"%.1f".format(mp)}MP)")

            val aa = c.get(CameraCharacteristics.SENSOR_INFO_ACTIVE_ARRAY_SIZE)
            sb.appendLine("Active array: ${aa?.width()} x ${aa?.height()}")

            val ps = c.get(CameraCharacteristics.SENSOR_INFO_PHYSICAL_SIZE)
            sb.appendLine("Sensor size:  ${ps?.width}mm x ${ps?.height}mm")

            val caps = c.get(CameraCharacteristics.REQUEST_AVAILABLE_CAPABILITIES)
            val capNames = mapOf(
                1 to "MANUAL_SENSOR", 3 to "RAW", 6 to "BURST",
                8 to "DEPTH", 11 to "LOGICAL_MULTI_CAM",
                16 to "ULTRA_HIGH_RES", 17 to "REMOSAIC",
                18 to "UHR(18)", 19 to "10BIT", 20 to "STREAM_USE_CASE"
            )
            sb.appendLine("Caps: ${caps?.joinToString { capNames[it] ?: it.toString() }}")

            val map = c.get(CameraCharacteristics.SCALER_STREAM_CONFIGURATION_MAP)
            val jpeg = map?.getOutputSizes(ImageFormat.JPEG)
                ?.maxByOrNull { it.width.toLong() * it.height }
            val jpegMp = if (jpeg != null) jpeg.width.toLong() * jpeg.height / 1_000_000.0 else 0.0
            sb.appendLine("Max JPEG:     ${jpeg?.width} x ${jpeg?.height}  (${"%.1f".format(jpegMp)}MP)")

            val raw = map?.getOutputSizes(ImageFormat.RAW_SENSOR)
                ?.maxByOrNull { it.width.toLong() * it.height }
            val rawMp = if (raw != null) raw.width.toLong() * raw.height / 1_000_000.0 else 0.0
            sb.appendLine("Max RAW:      ${raw?.width} x ${raw?.height}  (${"%.1f".format(rawMp)}MP)")

            try {
                val uhrMap = c.get(CameraCharacteristics.SCALER_STREAM_CONFIGURATION_MAP_MAXIMUM_RESOLUTION)
                val uhrJpeg = uhrMap?.getOutputSizes(ImageFormat.JPEG)
                    ?.maxByOrNull { it.width.toLong() * it.height }
                val uhrRaw = uhrMap?.getOutputSizes(ImageFormat.RAW_SENSOR)
                    ?.maxByOrNull { it.width.toLong() * it.height }
                val uhrJpegMp = if (uhrJpeg != null) uhrJpeg.width.toLong() * uhrJpeg.height / 1_000_000.0 else 0.0
                val uhrRawMp = if (uhrRaw != null) uhrRaw.width.toLong() * uhrRaw.height / 1_000_000.0 else 0.0
                sb.appendLine("UHR JPEG: ★  ${uhrJpeg?.width} x ${uhrJpeg?.height}  (${"%.1f".format(uhrJpegMp)}MP)")
                sb.appendLine("UHR RAW:  ★  ${uhrRaw?.width} x ${uhrRaw?.height}  (${"%.1f".format(uhrRawMp)}MP)")
                val uhrPA = c.get(CameraCharacteristics.SENSOR_INFO_PIXEL_ARRAY_SIZE_MAXIMUM_RESOLUTION)
                val uhrPAmp = if (uhrPA != null) uhrPA.width.toLong() * uhrPA.height / 1_000_000.0 else 0.0
                sb.appendLine("UHR Pixel:   ${uhrPA?.width} x ${uhrPA?.height}  (${"%.1f".format(uhrPAmp)}MP)")
                val uhrAA = c.get(CameraCharacteristics.SENSOR_INFO_ACTIVE_ARRAY_SIZE_MAXIMUM_RESOLUTION)
                sb.appendLine("UHR Active:  ${uhrAA?.width()} x ${uhrAA?.height()}")
            } catch (e: Exception) {
                sb.appendLine("UHR error: ${e.message}")
            }

            val fl = c.get(CameraCharacteristics.LENS_INFO_AVAILABLE_FOCAL_LENGTHS)
            sb.appendLine("Focal: ${fl?.joinToString { "%.2fmm".format(it) }}")

            val mfd = c.get(CameraCharacteristics.LENS_INFO_MINIMUM_FOCUS_DISTANCE)
            if (mfd != null && mfd > 0)
                sb.appendLine("Min focus: ${"%.1f".format(100.0 / mfd)}cm")

            val zr = c.get(CameraCharacteristics.CONTROL_ZOOM_RATIO_RANGE)
            sb.appendLine("Zoom range: ${zr?.lower}x - ${zr?.upper}x")

            val iso = c.get(CameraCharacteristics.SENSOR_INFO_SENSITIVITY_RANGE)
            sb.appendLine("ISO: ${iso?.lower} - ${iso?.upper}")

            val physIds = c.physicalCameraIds
            if (physIds.isNotEmpty())
                sb.appendLine("Physical IDs: ${physIds.joinToString()}")

            sb.appendLine()
        }

        // ── Physical cameras under logical IDs ───────────────
        sb.appendLine("== PHYSICAL CAMERAS ===================")
        for (id in cm.cameraIdList) {
            val phys = cm.getCameraCharacteristics(id).physicalCameraIds
            for (pid in phys) {
                try {
                    val pc = cm.getCameraCharacteristics(pid)
                    val pa = pc.get(CameraCharacteristics.SENSOR_INFO_PIXEL_ARRAY_SIZE)
                    val mp = if (pa != null) pa.width.toLong() * pa.height / 1_000_000.0 else 0.0
                    val fl = pc.get(CameraCharacteristics.LENS_INFO_AVAILABLE_FOCAL_LENGTHS)
                    val ps = pc.get(CameraCharacteristics.SENSOR_INFO_PHYSICAL_SIZE)
                    sb.appendLine("Phys $pid (under $id): ${pa?.width}x${pa?.height} (${"%.1f".format(mp)}MP) ${fl?.joinToString { "%.2fmm".format(it) }}")
                    sb.appendLine("  Sensor: ${ps?.width}mm x ${ps?.height}mm")
                    val uhrPA = pc.get(CameraCharacteristics.SENSOR_INFO_PIXEL_ARRAY_SIZE_MAXIMUM_RESOLUTION)
                    if (uhrPA != null) {
                        val umg = uhrPA.width.toLong() * uhrPA.height / 1_000_000.0
                        sb.appendLine("  ★ UHR pixel array: ${uhrPA.width}x${uhrPA.height} (${"%.1f".format(umg)}MP)")
                    } else {
                        sb.appendLine("  UHR pixel array: null")
                    }
                    val uhrMap = pc.get(CameraCharacteristics.SCALER_STREAM_CONFIGURATION_MAP_MAXIMUM_RESOLUTION)
                    val uhrJpeg = uhrMap?.getOutputSizes(ImageFormat.JPEG)
                        ?.maxByOrNull { it.width.toLong() * it.height }
                    if (uhrJpeg != null) {
                        val umg = uhrJpeg.width.toLong() * uhrJpeg.height / 1_000_000.0
                        sb.appendLine("  ★ UHR JPEG: ${uhrJpeg.width}x${uhrJpeg.height} (${"%.1f".format(umg)}MP)")
                    }
                    val caps = pc.get(CameraCharacteristics.REQUEST_AVAILABLE_CAPABILITIES)
                    val capNames = mapOf(
                        1 to "MANUAL", 3 to "RAW", 6 to "BURST",
                        16 to "UHR", 17 to "REMOSAIC", 18 to "UHR(18)", 19 to "10BIT"
                    )
                    sb.appendLine("  Caps: ${caps?.joinToString { capNames[it] ?: it.toString() }}")
                } catch (e: Exception) {
                    sb.appendLine("Phys $pid: ${e.message}")
                }
            }
        }

        return sb.toString()
    }
}
