package com.example.eye_tracking_app

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
                        val bytes = call.arguments as? ByteArray
                        if (bytes == null) {
                            result.error(
                                "INVALID_ARGUMENT",
                                "processFrame expects Uint8List (JPEG/PNG image bytes)",
                                null
                            )
                            return@setMethodCallHandler
                        }
                        var decodeNs = 0L
                        var bitmap = null as android.graphics.Bitmap?
                        decodeNs = measureNanoTime {
                            bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
                        }
                        if (bitmap == null) {
                            val payload = HashMap<String, Any>(VisionProcessor.emptyPayload())
                            payload["nativeDecodeMs"] = decodeNs / 1_000_000.0
                            payload["nativeTotalMs"] = (System.nanoTime() - totalStartNs) / 1_000_000.0
                            result.success(payload)
                            return@setMethodCallHandler
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
                    else -> result.notImplemented()
                }
            }
    }

    companion object {
        private const val VISION_CHANNEL = "vision_channel"
        private const val METHOD_PROCESS_FRAME = "processFrame"
        private const val METHOD_CALIBRATE_HEAD_POSE = "calibrateHeadPose"
    }
}
