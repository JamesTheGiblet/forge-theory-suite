package com.giblets.roadwatch

import android.content.Context
import android.graphics.*
import android.view.View

class RoadMapView(context: Context) : View(context) {

    private val events = mutableListOf<RoadEvent>()
    private val paint = Paint(Paint.ANTI_ALIAS_FLAG)
    private val textPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = 0xFF00FF00.toInt()
        textSize = 28f
        typeface = Typeface.MONOSPACE
    }
    private val bgPaint = Paint().apply { color = 0xFF0A0A0A.toInt() }
    private val gridPaint = Paint().apply {
        color = 0xFF1A2A1A.toInt()
        strokeWidth = 1f
    }

    private var minLat = 0.0; private var maxLat = 0.0
    private var minLon = 0.0; private var maxLon = 0.0
    private var hasData = false

    fun setEvents(list: List<RoadEvent>) {
        events.clear()
        events.addAll(list)
        if (events.isNotEmpty()) {
            minLat = events.minOf { it.lat } - 0.001
            maxLat = events.maxOf { it.lat } + 0.001
            minLon = events.minOf { it.lon } - 0.001
            maxLon = events.maxOf { it.lon } + 0.001
            hasData = true
        }
        invalidate()
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        canvas.drawRect(0f, 0f, width.toFloat(), height.toFloat(), bgPaint)

        if (!hasData || events.isEmpty()) {
            textPaint.textAlign = Paint.Align.CENTER
            canvas.drawText("No events recorded yet", width / 2f, height / 2f, textPaint)
            textPaint.textAlign = Paint.Align.LEFT
            return
        }

        val pad = 60f
        val mapW = width - pad * 2
        val mapH = height - pad * 2

        for (i in 0..4) {
            val x = pad + mapW * i / 4
            val y = pad + mapH * i / 4
            canvas.drawLine(x, pad, x, pad + mapH, gridPaint)
            canvas.drawLine(pad, y, pad + mapW, y, gridPaint)
        }

        events.forEach { e ->
            val x = pad + ((e.lon - minLon) / (maxLon - minLon) * mapW).toFloat()
            val y = pad + mapH - ((e.lat - minLat) / (maxLat - minLat) * mapH).toFloat()
            val radius = (e.severity * 8 + 6).toFloat()

            paint.color = e.type.colour and 0x44FFFFFF.toInt()
            paint.style = Paint.Style.FILL
            canvas.drawCircle(x, y, radius * 2f, paint)

            paint.color = e.type.colour
            canvas.drawCircle(x, y, radius, paint)
        }

        val legendX = pad
        var legendY = height - 20f
        textPaint.textSize = 22f
        EventType.values().reversed().forEach { t ->
            paint.color = t.colour
            canvas.drawCircle(legendX + 10f, legendY - 8f, 8f, paint)
            canvas.drawText(t.label, legendX + 26f, legendY, textPaint)
            legendY -= 30f
        }

        textPaint.textSize = 24f
        textPaint.textAlign = Paint.Align.RIGHT
        canvas.drawText("${events.size} events", width - pad + 40f, pad - 10f, textPaint)
        textPaint.textAlign = Paint.Align.LEFT
    }
}
