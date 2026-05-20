package com.example.eye_tracking_app

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.os.Bundle
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import kotlin.system.measureNanoTime

class MainActivity : FlutterActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        VisionProcessor.init(this)
    }

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, VISION_CHANNEL)
            .setMethodCallHandler { call, result ->
                when (call.method) {
                    METHOD_CALIBRATE_HEAD_POSE -> {
                        VisionProcessor.requestHeadYawNeutralCalibration()
                        result.success(null)
                    }
                    METHOD_PROCESS_FRAME -> {
                        val totalStartNs = System.nanoTime()
                        when (val args = call.arguments) {
                            is Map<*, *> -> {
                                @Suppress("UNCHECKED_CAST")
                                processFrameFromMap(
                                    args as Map<String, Any?>,
                                    totalStartNs,
                                    result,
                                )
                            }
                            is ByteArray -> {
                                processFrameFromJpegBytes(args, totalStartNs, result)
                            }
                            else -> result.error(
                                "INVALID_ARGUMENT",
                                "processFrame expects Map (y8/jpeg) or legacy ByteArray (JPEG)",
                                null,
                            )
                        }
                    }
                    else -> result.notImplemented()
                }
            }
    }

    private fun processFrameFromMap(
        map: Map<String, Any?>,
        totalStartNs: Long,
        result: MethodChannel.Result,
    ) {
        when (map["format"] as? String) {
            "y8" -> {
                val w = (map["width"] as? Number)?.toInt() ?: 0
                val h = (map["height"] as? Number)?.toInt() ?: 0
                val rowStride = (map["rowStride"] as? Number)?.toInt() ?: w
                val yBytes = map["bytes"] as? ByteArray
                if (yBytes == null || w <= 0 || h <= 0 || yBytes.size < w * h) {
                    val payload = HashMap<String, Any>(VisionProcessor.emptyPayload())
                    payload["nativeDecodeMs"] = 0.0
                    payload["nativeTotalMs"] =
                        (System.nanoTime() - totalStartNs) / 1_000_000.0
                    result.success(payload)
                    return
                }
                var decodeNs = 0L
                var bitmap: Bitmap? = null
                decodeNs = measureNanoTime {
                    bitmap = y8ToArgbBitmap(yBytes, w, h, rowStride)
                }
                if (bitmap == null) {
                    val payload = HashMap<String, Any>(VisionProcessor.emptyPayload())
                    payload["nativeDecodeMs"] = decodeNs / 1_000_000.0
                    payload["nativeTotalMs"] =
                        (System.nanoTime() - totalStartNs) / 1_000_000.0
                    result.success(payload)
                    return
                }
                try {
                    val landmarks = HashMap<String, Any>(VisionProcessor.process(bitmap))
                    landmarks["nativeDecodeMs"] = decodeNs / 1_000_000.0
                    landmarks["nativeTotalMs"] =
                        (System.nanoTime() - totalStartNs) / 1_000_000.0
                    result.success(landmarks)
                } finally {
                    bitmap.recycle()
                }
            }
            "jpeg" -> {
                val bytes = map["bytes"] as? ByteArray
                if (bytes == null) {
                    result.error(
                        "INVALID_ARGUMENT",
                        "processFrame jpeg map missing bytes",
                        null,
                    )
                    return
                }
                processFrameFromJpegBytes(bytes, totalStartNs, result)
            }
            else -> result.error(
                "INVALID_ARGUMENT",
                "processFrame map missing or unknown format: ${map["format"]}",
                null,
            )
        }
    }

    private fun processFrameFromJpegBytes(
        bytes: ByteArray,
        totalStartNs: Long,
        result: MethodChannel.Result,
    ) {
        var decodeNs = 0L
        var bitmap: Bitmap? = null
        decodeNs = measureNanoTime {
            bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
        }
        if (bitmap == null) {
            val payload = HashMap<String, Any>(VisionProcessor.emptyPayload())
            payload["nativeDecodeMs"] = decodeNs / 1_000_000.0
            payload["nativeTotalMs"] = (System.nanoTime() - totalStartNs) / 1_000_000.0
            result.success(payload)
            return
        }
        try {
            val landmarks = HashMap<String, Any>(VisionProcessor.process(bitmap))
            landmarks["nativeDecodeMs"] = decodeNs / 1_000_000.0
            landmarks["nativeTotalMs"] = (System.nanoTime() - totalStartNs) / 1_000_000.0
            result.success(landmarks)
        } finally {
            bitmap.recycle()
        }
    }

    /** Luma-only buffer → ARGB_8888 for MediaPipe (no JPEG decode). */
    private fun y8ToArgbBitmap(
        yBytes: ByteArray,
        width: Int,
        height: Int,
        rowStride: Int,
    ): Bitmap {
        val pixels = IntArray(width * height)
        if (rowStride == width) {
            var i = 0
            while (i < width * height) {
                val lum = yBytes[i].toInt() and 0xff
                pixels[i] = -0x1000000 or (lum shl 16) or (lum shl 8) or lum
                i++
            }
        } else {
            var out = 0
            var y = 0
            while (y < height) {
                val rowBase = y * rowStride
                var x = 0
                while (x < width) {
                    val lum = yBytes[rowBase + x].toInt() and 0xff
                    pixels[out++] = -0x1000000 or (lum shl 16) or (lum shl 8) or lum
                    x++
                }
                y++
            }
        }
        return Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888).also {
            it.setPixels(pixels, 0, width, 0, 0, width, height)
        }
    }

    companion object {
        private const val VISION_CHANNEL = "vision_channel"
        private const val METHOD_PROCESS_FRAME = "processFrame"
        private const val METHOD_CALIBRATE_HEAD_POSE = "calibrateHeadPose"
    }
}
