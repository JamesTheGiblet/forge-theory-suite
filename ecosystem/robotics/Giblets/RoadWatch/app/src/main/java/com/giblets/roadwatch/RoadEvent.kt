package com.giblets.roadwatch

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import java.text.SimpleDateFormat
import java.util.*

enum class EventType(val label: String, val colour: Int) {
    POTHOLE("Pothole",    0xFFFF2020.toInt()),
    BUMP("Speed Bump",    0xFFFF8800.toInt()),
    ROUGH("Rough",        0xFFFFCC00.toInt()),
    SMOOTH("Smooth",      0xFF00CC44.toInt())
}

data class RoadEvent(
    val id: Long = 0,
    val timestamp: Long = System.currentTimeMillis(),
    val lat: Double,
    val lon: Double,
    val peakG: Float,
    val durationMs: Int,
    val speedKmh: Float,
    val type: EventType
) {
    val severity: Int get() = when {
        peakG >= 4.0f -> 5
        peakG >= 3.0f -> 4
        peakG >= 2.0f -> 3
        peakG >= 1.5f -> 2
        else          -> 1
    }

    fun toKmlPlacemark(): String {
        val sdf = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.UK)
        return """
        <Placemark>
            <n>${type.label} S${severity}</n>
            <description>Peak: ${"%.2f".format(peakG)}G | Speed: ${"%.0f".format(speedKmh)}km/h | ${sdf.format(Date(timestamp))}</description>
            <styleUrl>#${type.name.lowercase()}</styleUrl>
            <Point><coordinates>$lon,$lat,0</coordinates></Point>
        </Placemark>""".trimIndent()
    }

    fun toGpxWpt(): String {
        val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.UK).apply {
            timeZone = TimeZone.getTimeZone("UTC")
        }
        return """  <wpt lat="$lat" lon="$lon">
    <ele>0</ele>
    <time>${sdf.format(Date(timestamp))}</time>
    <n>${type.label}</n>
    <desc>Peak: ${"%.2f".format(peakG)}G Sev:$severity Speed:${"%.0f".format(speedKmh)}km/h</desc>
    <sym>Flag</sym>
  </wpt>"""
    }
}

class RoadDatabase(context: Context) : SQLiteOpenHelper(context, "roadwatch.db", null, 2) {

    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL("""
            CREATE TABLE events (
                id        INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp INTEGER,
                lat       REAL,
                lon       REAL,
                peak_g    REAL,
                duration  INTEGER,
                speed_kmh REAL,
                type      TEXT
            )
        """.trimIndent())
    }

    override fun onUpgrade(db: SQLiteDatabase, old: Int, new: Int) {
        db.execSQL("DROP TABLE IF EXISTS events")
        onCreate(db)
    }

    fun insert(e: RoadEvent): Long {
        val cv = ContentValues().apply {
            put("timestamp", e.timestamp)
            put("lat",       e.lat)
            put("lon",       e.lon)
            put("peak_g",    e.peakG)
            put("duration",  e.durationMs)
            put("speed_kmh", e.speedKmh)
            put("type",      e.type.name)
        }
        return writableDatabase.insert("events", null, cv)
    }

    fun getAll(): List<RoadEvent> {
        val list = mutableListOf<RoadEvent>()
        val c = readableDatabase.query("events", null, null, null, null, null, "timestamp DESC")
        while (c.moveToNext()) {
            list.add(RoadEvent(
                id          = c.getLong(c.getColumnIndexOrThrow("id")),
                timestamp   = c.getLong(c.getColumnIndexOrThrow("timestamp")),
                lat         = c.getDouble(c.getColumnIndexOrThrow("lat")),
                lon         = c.getDouble(c.getColumnIndexOrThrow("lon")),
                peakG       = c.getFloat(c.getColumnIndexOrThrow("peak_g")),
                durationMs  = c.getInt(c.getColumnIndexOrThrow("duration")),
                speedKmh    = c.getFloat(c.getColumnIndexOrThrow("speed_kmh")),
                type        = EventType.valueOf(c.getString(c.getColumnIndexOrThrow("type")))
            ))
        }
        c.close()
        return list
    }

    fun getCount(): Int {
        val c = readableDatabase.rawQuery("SELECT COUNT(*) FROM events", null)
        val n = if (c.moveToFirst()) c.getInt(0) else 0
        c.close()
        return n
    }

    fun clear() = writableDatabase.delete("events", null, null)

    fun getStats(): Map<EventType, Int> {
        val map = mutableMapOf<EventType, Int>()
        val c = readableDatabase.rawQuery(
            "SELECT type, COUNT(*) as n FROM events GROUP BY type", null)
        while (c.moveToNext()) {
            val type = runCatching { EventType.valueOf(c.getString(0)) }.getOrNull() ?: continue
            map[type] = c.getInt(1)
        }
        c.close()
        return map
    }
}
