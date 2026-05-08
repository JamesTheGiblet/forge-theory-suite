package com.giblets.uhrtest

import android.Manifest
import android.content.ContentValues
import android.content.pm.PackageManager
import android.graphics.ImageFormat
import android.hardware.camera2.*
import android.hardware.camera2.params.OutputConfiguration
import android.hardware.camera2.params.SessionConfiguration
import android.media.ImageReader
import android.os.*
import android.provider.MediaStore
import android.util.Log
import android.util.Size
import android.widget.*
import android.app.Activity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import java.io.IOException
import java.text.SimpleDateFormat
import java.util.*
import java.util.concurrent.Executors

class MainActivity : Activity() {

    companion object {
        const val TAG = "UHRTest"
        const val CAM_ID = "0"   // ← change to "2" to test telephoto
        const val REQ_PERM = 1001
    }

    private lateinit var tv: TextView
    private lateinit var btnNormal: Button
    private lateinit var btnUHR: Button
    private lateinit var btnInfo: Button

    private val cameraManager by lazy { getSystemService(CAMERA_SERVICE) as CameraManager }
    private var cameraDevice: CameraDevice? = null
    private var captureSession: CameraCaptureSession? = null
    private var imageReader: ImageReader? = null
    private val executor = Executors.newSingleThreadExecutor()
    private val handler = Handler(Looper.getMainLooper())

    // ── UI ────────────────────────────────────────────────────────────────────
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(0xFF0A0A0A.toInt())
            setPadding(24, 48, 24, 24)
        }

        tv = TextView(this).apply {
            setTextColor(0xFF00FF00.toInt())
            textSize = 10.5f
            typeface = android.graphics.Typeface.MONOSPACE
            text = "UHR Test  |  Camera ID:$CAM_ID\nReady.\n"
        }

        val scroll = ScrollView(this).apply {
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, 0, 1f)
        }
        scroll.addView(tv)

        fun makeBtn(label: String, colour: Int, action: () -> Unit): Button {
            return Button(this).apply {
                text = label
                setBackgroundColor(colour)
                setTextColor(0xFFFFFFFF.toInt())
                layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT).apply { setMargins(0,8,0,0) }
                setOnClickListener { action() }
            }
        }

        btnInfo    = makeBtn("📋  DUMP CAMERA INFO",    0xFF1565C0.toInt()) { dumpInfo() }
        btnNormal  = makeBtn("📷  CAPTURE NORMAL (12MP)", 0xFF2E7D32.toInt()) { captureNormal() }
        btnUHR     = makeBtn("🔬  CAPTURE UHR (200MP?)", 0xFF6A1B9A.toInt()) { captureUHR() }

        root.addView(scroll)
        root.addView(btnInfo)
        root.addView(btnNormal)
        root.addView(btnUHR)
        setContentView(root)

        checkPermissions()
    }

    // ── Logging ───────────────────────────────────────────────────────────────
    private fun log(msg: String) {
        Log.d(TAG, msg)
        handler.post {
            tv.append("$msg\n")
        }
    }

    private fun logSection(title: String) {
        log("\n── $title ──────────────────────────")
    }

    // ── Permissions ───────────────────────────────────────────────────────────
    private fun checkPermissions() {
        val perms = arrayOf(Manifest.permission.CAMERA)
        val missing = perms.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }
        if (missing.isNotEmpty()) {
            ActivityCompat.requestPermissions(this, missing.toTypedArray(), REQ_PERM)
        } else {
            log("Permissions OK")
        }
    }

    override fun onRequestPermissionsResult(req: Int, perms: Array<String>, results: IntArray) {
        super.onRequestPermissionsResult(req, perms, results)
        if (results.all { it == PackageManager.PERMISSION_GRANTED }) {
            log("Permissions granted")
        } else {
            log("ERROR: Camera permission denied")
        }
    }

    // ── Camera Info Dump ──────────────────────────────────────────────────────
    private fun dumpInfo() {
        logSection("CAMERA ID:$CAM_ID FULL INFO")
        try {
            val c = cameraManager.getCameraCharacteristics(CAM_ID)

            // Physical sensor size
            val ps = c.get(CameraCharacteristics.SENSOR_INFO_PHYSICAL_SIZE)
            log("Physical sensor:  ${ps?.width}mm × ${ps?.height}mm")

            // Pixel array
            val pa = c.get(CameraCharacteristics.SENSOR_INFO_PIXEL_ARRAY_SIZE)
            if (pa != null) {
                val mp = pa.width.toLong() * pa.height / 1_000_000.0
                log("Pixel array:      ${pa.width} × ${pa.height}  (%.1fMP)".format(mp))
            }

            // Active array
            val aa = c.get(CameraCharacteristics.SENSOR_INFO_ACTIVE_ARRAY_SIZE)
            if (aa != null) {
                val mp = aa.width().toLong() * aa.height() / 1_000_000.0
                log("Active array:     ${aa.width()} × ${aa.height()}  (%.1fMP)".format(mp))
            }

            // Pre-correction array (sometimes shows full res)
            val pca = c.get(CameraCharacteristics.SENSOR_INFO_PRE_CORRECTION_ACTIVE_ARRAY_SIZE)
            if (pca != null) {
                val mp = pca.width().toLong() * pca.height() / 1_000_000.0
                log("Pre-correction:   ${pca.width()} × ${pca.height()}  (%.1fMP)".format(mp))
            }

            // Capabilities
            val caps = c.get(CameraCharacteristics.REQUEST_AVAILABLE_CAPABILITIES)
            val capMap = mapOf(
                0 to "BACKWARD_COMPATIBLE", 1 to "MANUAL_SENSOR",
                2 to "MANUAL_POST_PROCESSING", 3 to "RAW",
                6 to "BURST_CAPTURE", 8 to "DEPTH_OUTPUT",
                11 to "LOGICAL_MULTI_CAMERA", 16 to "ULTRA_HIGH_RESOLUTION_SENSOR",
                17 to "REMOSAIC_REPROCESSING", 18 to "ULTRA_HIGH_RESOLUTION_SENSOR(18?)",
                19 to "DYNAMIC_RANGE_TEN_BIT", 20 to "STREAM_USE_CASE"
            )
            log("Capabilities:")
            caps?.forEach { cap ->
                log("  [$cap] ${capMap[cap] ?: "UNKNOWN_$cap"}")
            }

            // ── NORMAL mode sizes ─────────────────────────────────────────────
            logSection("NORMAL MODE JPEG SIZES")
            val map = c.get(CameraCharacteristics.SCALER_STREAM_CONFIGURATION_MAP)
            val jpegSizes = map?.getOutputSizes(ImageFormat.JPEG)
            jpegSizes?.sortedByDescending { it.width.toLong() * it.height }
                ?.take(8)
                ?.forEach { sz ->
                    val mp = sz.width.toLong() * sz.height / 1_000_000.0
                    log("  ${sz.width} × ${sz.height}  (%.1fMP)".format(mp))
                }

            // RAW sizes
            val rawSizes = map?.getOutputSizes(ImageFormat.RAW_SENSOR)
            if (!rawSizes.isNullOrEmpty()) {
                logSection("NORMAL MODE RAW_SENSOR SIZES")
                rawSizes.sortedByDescending { it.width.toLong() * it.height }
                    .take(5)
                    .forEach { sz ->
                        val mp = sz.width.toLong() * sz.height / 1_000_000.0
                        log("  ${sz.width} × ${sz.height}  (%.1fMP)".format(mp))
                    }
            } else {
                log("RAW_SENSOR: NOT available in normal mode")
            }

            // ── UHR mode sizes ────────────────────────────────────────────────
            logSection("UHR MODE SIZES (SCALER_STREAM_CONFIGURATION_MAP_MAXIMUM_RESOLUTION)")
            try {
                val uhrMap = c.get(CameraCharacteristics.SCALER_STREAM_CONFIGURATION_MAP_MAXIMUM_RESOLUTION)
                if (uhrMap != null) {
                    val uhrJpeg = uhrMap.getOutputSizes(ImageFormat.JPEG)
                    if (!uhrJpeg.isNullOrEmpty()) {
                        log("UHR JPEG sizes:")
                        uhrJpeg.sortedByDescending { it.width.toLong() * it.height }
                            .take(8)
                            .forEach { sz ->
                                val mp = sz.width.toLong() * sz.height / 1_000_000.0
                                log("  ★ ${sz.width} × ${sz.height}  (%.1fMP)".format(mp))
                            }
                    }
                    val uhrRaw = uhrMap.getOutputSizes(ImageFormat.RAW_SENSOR)
                    if (!uhrRaw.isNullOrEmpty()) {
                        log("UHR RAW_SENSOR sizes:")
                        uhrRaw.sortedByDescending { it.width.toLong() * it.height }
                            .take(5)
                            .forEach { sz ->
                                val mp = sz.width.toLong() * sz.height / 1_000_000.0
                                log("  ★ ${sz.width} × ${sz.height}  (%.1fMP)".format(mp))
                            }
                    }

                    // UHR active array
                    val uhrAA = c.get(CameraCharacteristics.SENSOR_INFO_ACTIVE_ARRAY_SIZE_MAXIMUM_RESOLUTION)
                    if (uhrAA != null) {
                        val mp = uhrAA.width().toLong() * uhrAA.height() / 1_000_000.0
                        log("UHR Active array: ${uhrAA.width()} × ${uhrAA.height()}  (%.1fMP)".format(mp))
                    }
                    val uhrPA = c.get(CameraCharacteristics.SENSOR_INFO_PIXEL_ARRAY_SIZE_MAXIMUM_RESOLUTION)
                    if (uhrPA != null) {
                        val mp = uhrPA.width.toLong() * uhrPA.height / 1_000_000.0
                        log("UHR Pixel array:  ${uhrPA.width} × ${uhrPA.height}  (%.1fMP)".format(mp))
                    }
                } else {
                    log("UHR map is NULL — cap 18 present but UHR map not exposed")
                }
            } catch (e: Exception) {
                log("UHR map error: ${e.message}")
            }

            // Focal length + zoom
            val fl = c.get(CameraCharacteristics.LENS_INFO_AVAILABLE_FOCAL_LENGTHS)
            log("Focal lengths: ${fl?.joinToString { "%.2fmm".format(it) }}")
            val zr = c.get(CameraCharacteristics.CONTROL_ZOOM_RATIO_RANGE)
            log("Zoom range:    ${zr?.lower}x – ${zr?.upper}x")
            val mfd = c.get(CameraCharacteristics.LENS_INFO_MINIMUM_FOCUS_DISTANCE)
            if (mfd != null && mfd > 0)
                log("Min focus:     $mfd diopters  (%.1fcm)".format(100.0 / mfd))
            val iso = c.get(CameraCharacteristics.SENSOR_INFO_SENSITIVITY_RANGE)
            log("ISO range:     ${iso?.lower} – ${iso?.upper}")
            val exp = c.get(CameraCharacteristics.SENSOR_INFO_EXPOSURE_TIME_RANGE)
            if (exp != null)
                log("Exposure:      ${exp.lower/1000}µs – ${exp.upper/1_000_000}ms")
            val flash = c.get(CameraCharacteristics.FLASH_INFO_AVAILABLE)
            log("Flash/Torch:   $flash")

            log("\nInfo dump complete.")

        } catch (e: Exception) {
            log("ERROR: ${e.message}")
        }
    }

    // ── Open Camera ───────────────────────────────────────────────────────────
    private fun openCamera(onOpen: (CameraDevice) -> Unit) {
        cameraDevice?.close()
        cameraDevice = null

        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
            != PackageManager.PERMISSION_GRANTED) {
            log("No camera permission"); return
        }

        log("Opening camera ID:$CAM_ID...")
        cameraManager.openCamera(CAM_ID, executor, object : CameraDevice.StateCallback() {
            override fun onOpened(camera: CameraDevice) {
                cameraDevice = camera
                log("Camera opened OK")
                handler.post { onOpen(camera) }
            }
            override fun onDisconnected(camera: CameraDevice) {
                camera.close(); cameraDevice = null; log("Camera disconnected")
            }
            override fun onError(camera: CameraDevice, error: Int) {
                camera.close(); cameraDevice = null; log("Camera error: $error")
            }
        })
    }

    // ── Normal 12MP Capture ───────────────────────────────────────────────────
    private fun captureNormal() {
        logSection("NORMAL CAPTURE (12MP)")
        val chars = cameraManager.getCameraCharacteristics(CAM_ID)
        val map = chars.get(CameraCharacteristics.SCALER_STREAM_CONFIGURATION_MAP)!!
        val sizes = map.getOutputSizes(ImageFormat.JPEG)
            .sortedByDescending { it.width.toLong() * it.height }
        val sz = sizes.first()
        val mp = sz.width.toLong() * sz.height / 1_000_000.0
        log("Target size: ${sz.width}×${sz.height} (%.1fMP)".format(mp))
        doCapture(sz, uhrMode = false)
    }

    // ── UHR Capture ───────────────────────────────────────────────────────────
    private fun captureUHR() {
        logSection("UHR CAPTURE ATTEMPT")
        val chars = cameraManager.getCameraCharacteristics(CAM_ID)
        val uhrMap = chars.get(CameraCharacteristics.SCALER_STREAM_CONFIGURATION_MAP_MAXIMUM_RESOLUTION)
        if (uhrMap == null) {
            log("UHR map NULL — trying largest normal JPEG instead")
            captureNormal(); return
        }
        val sizes = uhrMap.getOutputSizes(ImageFormat.JPEG)
            ?.sortedByDescending { it.width.toLong() * it.height }
        if (sizes.isNullOrEmpty()) {
            log("No UHR JPEG sizes found"); return
        }
        val sz = sizes.first()
        val mp = sz.width.toLong() * sz.height / 1_000_000.0
        log("UHR target: ${sz.width}×${sz.height} (%.1fMP)".format(mp))
        doCapture(sz, uhrMode = true)
    }

    // ── Core Capture Logic ────────────────────────────────────────────────────
    private fun doCapture(size: Size, uhrMode: Boolean) {
        imageReader?.close()
        imageReader = ImageReader.newInstance(size.width, size.height, ImageFormat.JPEG, 2)

        imageReader!!.setOnImageAvailableListener({ reader ->
            val image = reader.acquireNextImage() ?: return@setOnImageAvailableListener
            log("Image acquired: ${image.width}×${image.height}")
            val buffer = image.planes[0].buffer
            val bytes = ByteArray(buffer.remaining())
            buffer.get(bytes)
            image.close()
            saveImage(bytes, size, uhrMode)
            handler.post {
                captureSession?.close()
                cameraDevice?.close()
            }
        }, Handler(Looper.getMainLooper()))

        openCamera { camera ->
            val outputConfig = OutputConfiguration(imageReader!!.surface)
            if (uhrMode) {
                // Set UHR sensor pixel mode on the output configuration
                try {
                    outputConfig.streamUseCase =
                        CameraMetadata.SCALER_AVAILABLE_STREAM_USE_CASES_STILL_CAPTURE.toLong()
                } catch (e: Exception) {
                    log("streamUseCase not supported: ${e.message}")
                }
            }

            val sessionCfg = SessionConfiguration(
                SessionConfiguration.SESSION_REGULAR,
                listOf(outputConfig),
                executor,
                object : CameraCaptureSession.StateCallback() {
                    override fun onConfigured(session: CameraCaptureSession) {
                        captureSession = session
                        log("Session configured")
                        val req = camera.createCaptureRequest(CameraDevice.TEMPLATE_STILL_CAPTURE).apply {
                            addTarget(imageReader!!.surface)
                            set(CaptureRequest.CONTROL_AF_MODE,
                                CaptureRequest.CONTROL_AF_MODE_CONTINUOUS_PICTURE)
                            set(CaptureRequest.CONTROL_AE_MODE,
                                CaptureRequest.CONTROL_AE_MODE_ON)
                            if (uhrMode) {
                                // THE KEY: request maximum resolution pixel mode
                                try {
                                    set(CaptureRequest.SENSOR_PIXEL_MODE,
                                        CaptureRequest.SENSOR_PIXEL_MODE_MAXIMUM_RESOLUTION)
                                    log("UHR pixel mode SET")
                                } catch (e: Exception) {
                                    log("SENSOR_PIXEL_MODE not supported: ${e.message}")
                                }
                            }
                        }
                        log("Firing capture...")
                        session.capture(req.build(), object : CameraCaptureSession.CaptureCallback() {
                            override fun onCaptureCompleted(s: CameraCaptureSession,
                                req: CaptureRequest, result: TotalCaptureResult) {
                                log("Capture completed")
                                val pixelMode = result.get(CaptureResult.SENSOR_PIXEL_MODE)
                                log("Actual pixel mode: $pixelMode  (1=UHR, 0=normal)")
                            }
                            override fun onCaptureFailed(s: CameraCaptureSession,
                                req: CaptureRequest, failure: CaptureFailure) {
                                log("CAPTURE FAILED: reason=${failure.reason}")
                            }
                        }, handler)
                    }
                    override fun onConfigureFailed(session: CameraCaptureSession) {
                        log("Session configure FAILED")
                    }
                }
            )
            camera.createCaptureSession(sessionCfg)
        }
    }

    // ── Save Image ────────────────────────────────────────────────────────────
    private fun saveImage(bytes: ByteArray, size: Size, uhrMode: Boolean) {
        val ts = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.UK).format(Date())
        val tag = if (uhrMode) "UHR" else "NORMAL"
        val filename = "UHRTest_cam${CAM_ID}_${tag}_${size.width}x${size.height}_${ts}.jpg"

        val values = ContentValues().apply {
            put(MediaStore.Images.Media.DISPLAY_NAME, filename)
            put(MediaStore.Images.Media.MIME_TYPE, "image/jpeg")
            put(MediaStore.Images.Media.RELATIVE_PATH, "DCIM/UHRTest")
        }

        try {
            val uri = contentResolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values)
            uri?.let {
                contentResolver.openOutputStream(it)?.use { out -> out.write(bytes) }
                val mb = bytes.size / 1_048_576.0
                log("✓ SAVED: $filename")
                log("  Size: ${"%.2f".format(mb)}MB  (${bytes.size} bytes)")
                log("  Dims: ${size.width}×${size.height}")
                val mp = size.width.toLong() * size.height / 1_000_000.0
                log("  Res:  ${"%.1f".format(mp)}MP")
            } ?: log("ERROR: MediaStore insert returned null")
        } catch (e: IOException) {
            log("SAVE ERROR: ${e.message}")
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        captureSession?.close()
        cameraDevice?.close()
        imageReader?.close()
        executor.shutdown()
    }
}

