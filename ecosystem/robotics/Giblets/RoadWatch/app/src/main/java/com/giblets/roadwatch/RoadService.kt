package com.giblets.roadwatch

import android.app.*
import android.content.Context
import android.content.Intent
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.location.LocationListener
import android.location.LocationManager
import android.os.*
import kotlin.math.abs
import kotlin.math.sqrt

class RoadService : Service(), SensorEventListener {

    companion object {
        const val CHANNEL_ID   = "roadwatch_channel"
        const val NOTIF_ID     = 1001
        const val POTHOLE_G    = 2.0f
        const val BUMP_G       = 1.5f
        const val ROUGH_G      = 0.8f
        const val MIN_SPEED    = 5.0f
        const val COOLDOWN_MS  = 1500L
        const val SPIKE_MAX_MS = 200
        const val BUMP_MIN_MS  = 250
    }

    private lateinit var sm: SensorManager
    private lateinit var lm: LocationManager
    private lateinit var db: RoadDatabase
    private val handler = Handler(Looper.getMainLooper())

    private var gravX = 0f; private var gravY = 0f; private var gravZ = 9.81f
    private val alpha = 0.8f

    private var spikeStart = 0L
    private var peakG = 0f
    private var inSpike = false
    private var lastEventTime = 0L
    private var currentSpeed = 0f
    private var currentLat = 0.0
    private var currentLon = 0.0
    private var hasLocation = false

    var eventCount = 0; private set
    var sessionStartMs = System.currentTimeMillis(); private set

    var onEvent: ((RoadEvent) -> Unit)? = null
    var onSpeedUpdate: ((Float) -> Unit)? = null
    var onGUpdate: ((Float) -> Unit)? = null

    inner class LocalBinder : Binder() { fun getService() = this@RoadService }
    private val binder = LocalBinder()
    override fun onBind(intent: Intent) = binder

    override fun onCreate() {
        super.onCreate()
        db = RoadDatabase(this)
        createNotificationChannel()
        startForeground(NOTIF_ID, buildNotification("Recording road data..."))
        startSensors()
        startLocation()
    }

    override fun onDestroy() {
        super.onDestroy()
        sm.unregisterListener(this)
        lm.removeUpdates(locationListener)
    }

    private fun startSensors() {
        sm = getSystemService(SENSOR_SERVICE) as SensorManager
        sm.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)?.let {
            sm.registerListener(this, it, SensorManager.SENSOR_DELAY_FASTEST)
        }
    }

    override fun onSensorChanged(event: SensorEvent) {
        if (event.sensor.type != Sensor.TYPE_ACCELEROMETER) return

        val ax = event.values[0]
        val ay = event.values[1]
        val az = event.values[2]

        gravX = alpha * gravX + (1 - alpha) * ax
        gravY = alpha * gravY + (1 - alpha) * ay
        gravZ = alpha * gravZ + (1 - alpha) * az

        val linX = ax - gravX
        val linY = ay - gravY
        val linZ = az - gravZ

        val vertG = abs(linZ) / 9.81f
        val totalG = sqrt(linX*linX + linY*linY + linZ*linZ) / 9.81f

        onGUpdate?.invoke(totalG)

        val now = System.currentTimeMillis()
        if (now - lastEventTime < COOLDOWN_MS) return
        if (currentSpeed < MIN_SPEED && hasLocation) return

        if (vertG > ROUGH_G && !inSpike) {
            inSpike = true
            spikeStart = now
            peakG = vertG
        } else if (inSpike) {
            if (vertG > peakG) peakG = vertG
            val duration = (now - spikeStart).toInt()

            if (vertG < ROUGH_G * 0.5f || duration > 1000) {
                val type = when {
                    peakG >= POTHOLE_G && duration < SPIKE_MAX_MS -> EventType.POTHOLE
                    peakG >= BUMP_G    && duration > BUMP_MIN_MS  -> EventType.BUMP
                    peakG >= ROUGH_G                               -> EventType.ROUGH
                    else -> null
                }
                if (type != null && hasLocation) {
                    val e = RoadEvent(
                        lat        = currentLat,
                        lon        = currentLon,
                        peakG      = peakG,
                        durationMs = duration,
                        speedKmh   = currentSpeed,
                        type       = type
                    )
                    db.insert(e)
                    eventCount++
                    lastEventTime = now
                    handler.post {
                        onEvent?.invoke(e)
                        updateNotification("$eventCount events | ${currentSpeed.toInt()} km/h")
                    }
                }
                inSpike = false
                peakG = 0f
            }
        }
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}

    private val locationListener = LocationListener { loc ->
        currentLat   = loc.latitude
        currentLon   = loc.longitude
        currentSpeed = loc.speed * 3.6f
        hasLocation  = true
        onSpeedUpdate?.invoke(currentSpeed)
    }

    private fun startLocation() {
        lm = getSystemService(LOCATION_SERVICE) as LocationManager
        try {
            lm.requestLocationUpdates(
                LocationManager.GPS_PROVIDER, 500L, 0f, locationListener)
        } catch (e: SecurityException) {}
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val ch = NotificationChannel(
                CHANNEL_ID, "RoadWatch Recording",
                NotificationManager.IMPORTANCE_LOW)
            getSystemService(NotificationManager::class.java).createNotificationChannel(ch)
        }
    }

    private fun buildNotification(text: String): Notification {
        val intent = Intent(this, MainActivity::class.java)
        val pi = PendingIntent.getActivity(this, 0, intent, PendingIntent.FLAG_IMMUTABLE)
        return Notification.Builder(this, CHANNEL_ID)
            .setContentTitle("RoadWatch Active")
            .setContentText(text)
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setContentIntent(pi)
            .setOngoing(true)
            .build()
    }

    private fun updateNotification(text: String) {
        getSystemService(NotificationManager::class.java).notify(NOTIF_ID, buildNotification(text))
    }
}
