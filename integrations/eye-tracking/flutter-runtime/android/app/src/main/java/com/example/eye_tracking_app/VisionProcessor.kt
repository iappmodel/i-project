package com.example.eye_tracking_app

import android.content.Context
import android.graphics.Bitmap
import android.graphics.PointF
import android.util.Log
import com.google.mediapipe.framework.image.BitmapImageBuilder
import com.google.mediapipe.framework.image.ByteBufferExtractor
import com.google.mediapipe.framework.image.MPImage
import com.google.mediapipe.tasks.components.containers.NormalizedLandmark
import com.google.mediapipe.tasks.core.BaseOptions
import com.google.mediapipe.tasks.vision.core.RunningMode
import com.google.mediapipe.tasks.vision.facelandmarker.FaceLandmarker
import com.google.mediapipe.tasks.vision.imagesegmenter.ImageSegmenter
import com.google.mediapipe.tasks.vision.imagesegmenter.ImageSegmenterResult
import kotlin.math.abs
import kotlin.math.hypot
import kotlin.math.min
import kotlin.math.roundToInt

/**
 * MediaPipe Face Landmarker (Tasks API), IMAGE mode, single face.
 * Call [init] once (e.g. from [android.app.Application] or before first [process]).
 *
 * EAR uses six eyelid-only contour points per eye (iris excluded), taken from the same
 * `leftEye` / `rightEye` lists returned to Flutter.
 */
object VisionProcessor {

    private const val MODEL_ASSET = "face_landmarker.task"

    /** When false, omit full landmark meshes from channel payload (privacy + perf). */
    private val includeFullLandmarks: Boolean
        get() = try {
            Class.forName("com.example.eye_tracking_app.BuildConfig")
                .getField("DEBUG")
                .getBoolean(null)
        } catch (_: Exception) {
            false
        }

    /** MediaPipe Tasks image segmenter (selfie); asset from `float16/latest` on GCS. */
    private const val SEGMENTER_MODEL_ASSET = "selfie_segmenter.tflite"

    /** Category index for “person” in selfie segmenter category mask (`IMAGE_FORMAT_ALPHA`). */
    private const val SEGMENTATION_PERSON_CATEGORY = 1
    private const val EAR_THRESHOLD = 0.15f

    /** Closed-eye frames required before a reopen counts as one blink (noise suppression). */
    private const val MIN_BLINK_FRAMES = 3

    /** Minimum time after a counted blink before another can be counted (debounce). */
    private const val BLINK_COOLDOWN_MS = 250L

    /** MediaPipe face mesh nose tip (normalized). */
    private const val NOSE_TIP_INDEX = 1

    /** Normalized gaze magnitude threshold (iris vs eye); beyond this counts as off-center. */
    /** Horizontal gaze beyond this (normalized, after EMA) reduces attention score. */
    private const val ATTENTION_GAZE_X_THRESHOLD = 0.4f

    /** Rolling window for gaze stability → attention bonus (ms). */
    private const val GAZE_X_ATTENTION_WINDOW_MS = 1000L

    /** Population variance of smooth gazeX over [GAZE_X_ATTENTION_WINDOW_MS] below this adds [ATTENTION_STEADY_GAZE_BONUS]. */
    private const val GAZE_X_ATTENTION_VARIANCE_THRESHOLD = 0.002

    private const val ATTENTION_STEADY_GAZE_BONUS = 0.3

    /** If \|head yaw\| and \|head pitch\| are both below this, add [ATTENTION_NEUTRAL_HEAD_BONUS]. */
    private const val ATTENTION_NEUTRAL_HEAD_ANGLE = 0.2f

    private const val ATTENTION_NEUTRAL_HEAD_BONUS = 0.2

    /**
     * Single-frame |Δ fused gazeX| (pre-EMA) in [min, max] counts as microsaccade vs jitter / large saccades.
     * Tunable with camera FPS and [GAZE_DEAD_ZONE].
     */
    private const val MICROSACCADE_MIN_STEP = 0.004f

    private const val MICROSACCADE_MAX_STEP = 0.07f

    private const val ATTENTION_MICROSACCADE_BONUS = 0.2

    /** Blinks in this rolling wall-time window approximate blinks/min for [ATTENTION_BLINK_FREQ_BONUS]. */
    private const val BLINK_RATE_WINDOW_MS = 60_000L

    private const val ATTENTION_BLINK_FREQ_MIN = 10

    private const val ATTENTION_BLINK_FREQ_MAX = 25

    private const val ATTENTION_BLINK_FREQ_BONUS = 0.2

    /** [likelyFake]: no meaningful horizontal gaze step for this long (live face usually jitters). */
    private const val AUTH_STATIC_GAZE_MS = 3000L

    /** |Δ fused pre-EMA gazeX| must exceed this to count as movement. */
    private const val AUTH_GAZE_MOVE_EPS = 0.00015f

    /** Rolling 1s gaze variance below this with enough samples is unnaturally still (e.g. frozen frame). */
    private const val AUTH_PERFECT_VARIANCE_MAX = 1e-9

    private const val AUTH_PERFECT_WINDOW_MIN_SAMPLES = 20

    /** How long variance must stay “too perfect” before [fakePerfectStability]. */
    private const val AUTH_PERFECT_STREAK_MS = 2500L

    /** No counted blink since face re-detected for this long ⇒ suspicious. */
    private const val AUTH_NO_BLINK_FACE_MS = 30_000L

    /** After ×8 / ×4 scaling: if \|component\| ≤ this, treat as 0 (jitter suppression) before EMA. */
    private const val GAZE_DEAD_ZONE = 0.035f

    /** EMA on normalized gaze: `smooth = SMOOTH * smooth + (1 - SMOOTH) * raw`. */
    private const val GAZE_XY_SMOOTH = 0.85f

    /** Rolling horizontal gaze (×8 scaled) per eye for stability / dominance. */
    private const val GAZE_DOMINANCE_MAX_SAMPLES = 20

    /** Require this many samples per eye before variance decides dominant (else average both). */
    private const val GAZE_DOMINANCE_MIN_SAMPLES = 5

    private const val IRIS_LOG_TAG = "IRIS"

    /** Default off: enable manually for native gaze debugging. */
    @Volatile
    private var irisDebugLoggingEnabled = false

    /** When debug logging is enabled, emit one line every N processed face frames. */
    @Volatile
    private var irisDebugLogSampleRate = 30

    private var irisDebugLogFrameCounter = 0

    /** Optional runtime toggle for D/IRIS spam control from debug tooling. */
    fun setIrisDebugLogging(enabled: Boolean, sampleRate: Int = 30) {
        synchronized(this) {
            irisDebugLoggingEnabled = enabled
            irisDebugLogSampleRate = sampleRate.coerceAtLeast(1)
            irisDebugLogFrameCounter = 0
        }
    }

    @Volatile
    var isBlinking: Boolean = false

    @Volatile
    var blinkCount: Int = 0

    /** Subject's left eye: eyelid contour only (no iris ring). */
    private val LEFT_EYE_CONTOUR_INDICES = intArrayOf(
        263, 249, 390, 373, 374, 380, 381, 382, 362,
        466, 388, 387, 386, 385, 384, 398,
    )

    /** Subject's right eye: eyelid contour only (no iris ring). */
    private val RIGHT_EYE_CONTOUR_INDICES = intArrayOf(
        33, 7, 163, 144, 145, 153, 154, 155, 133,
        246, 161, 160, 159, 158, 157, 173,
    )

    /**
     * Six points into `leftEye` (same order as [LEFT_EYE_CONTOUR_INDICES]): p1 and p4 are the
     * horizontal eye corners; p2/p6 and p3/p5 are upper/lower lid pairs (MediaPipe 362–263 span).
     */
    private val LEFT_EAR_SIX_IN_CONTOUR = intArrayOf(8, 13, 11, 0, 3, 5)

    /** Same roles for `rightEye` (global 33–133 horizontal, 160/158 and 153/144 vertical pairs). */
    private val RIGHT_EAR_SIX_IN_CONTOUR = intArrayOf(0, 11, 13, 8, 5, 3)

    /** Subject's left iris ring (474–477); iris center for per-eye gaze. */
    private val LEFT_IRIS_INDICES = intArrayOf(474, 475, 476, 477)

    /** Subject's right iris ring (469–472). */
    private val RIGHT_IRIS_INDICES = intArrayOf(469, 470, 471, 472)

    @Volatile
    private var landmarker: FaceLandmarker? = null

    /** Optional; init failure leaves null so [process] still runs face-only. */
    @Volatile
    private var imageSegmenter: ImageSegmenter? = null

    private var blinkFrames: Int = 0

    /** Wall-clock ms from [System.currentTimeMillis] when [blinkCount] was last incremented; 0 = never. */
    private var lastBlinkTime: Long = 0L

    private var smoothGazeX = 0f

    private var smoothGazeY = 0f

    private val leftGazeHistory = ArrayDeque<Float>(GAZE_DOMINANCE_MAX_SAMPLES)

    private val rightGazeHistory = ArrayDeque<Float>(GAZE_DOMINANCE_MAX_SAMPLES)

    /** (wall ms, smooth gazeX) for variance over the last [GAZE_X_ATTENTION_WINDOW_MS]. */
    private val gazeXAttentionWindow = ArrayDeque<Pair<Long, Float>>(256)

    /** Previous fused horizontal gaze (pre-EMA) for microsaccade step detection. */
    private var microSaccadePrevGazeX = 0f

    private var microSaccadePrevInitialized = false

    /** Wall ms when a blink was counted; pruned to [BLINK_RATE_WINDOW_MS] for rate-based attention bonus. */
    private val blinkRateWindow = ArrayDeque<Long>(48)

    /** Anti-spoof: last transition to no-face cleared this; rising edge starts a new “face session”. */
    private var prevHadFaceForAuth = false

    private var authFaceEnteredMs = 0L

    private var blinkCountAtAuthFaceEntry = 0

    private var authLastGazeMovementMs = 0L

    private var authPrevFinalGazeX = Float.NaN

    /** 0 = not in a “too stable” streak. */
    private var authPerfectStabilitySinceMs = 0L

    private fun appendGazeSample(deque: ArrayDeque<Float>, value: Float) {
        deque.addLast(value)
        while (deque.size > GAZE_DOMINANCE_MAX_SAMPLES) {
            deque.removeFirst()
        }
    }

    /** Population variance; [Double.POSITIVE_INFINITY] if fewer than two samples. */
    private fun variance(samples: ArrayDeque<Float>): Double {
        val n = samples.size
        if (n < 2) return Double.POSITIVE_INFINITY
        var sum = 0.0
        for (v in samples) {
            sum += v.toDouble()
        }
        val mean = sum / n
        var acc = 0.0
        for (v in samples) {
            val d = v.toDouble() - mean
            acc += d * d
        }
        return acc / n
    }

    private fun varianceGazeXAttentionWindow(window: ArrayDeque<Pair<Long, Float>>): Double {
        if (window.size < 2) return Double.POSITIVE_INFINITY
        val tmp = ArrayDeque<Float>(window.size)
        for ((_, x) in window) {
            tmp.addLast(x)
        }
        return variance(tmp)
    }

    /**
     * Raw [headPoseFromNoseAndEyes] yaw at last calibration (e.g. user not looking off-axis but
     * camera/geometry yields a non-zero offset). Gaze damping uses **relative** yaw:
     * `correctedYaw = rawYaw - neutralYaw` so neutral posture maps to 0.
     */
    private var headYawNeutral = 0f

    private var headYawNeutralValid = false

    private var pendingHeadYawNeutral = false

    /** Next [process] with a valid face pose stores current raw yaw as neutral (Flutter: calibrateHeadPose). */
    fun requestHeadYawNeutralCalibration() {
        synchronized(this) {
            pendingHeadYawNeutral = true
        }
    }

    fun clearHeadYawNeutralCalibration() {
        synchronized(this) {
            headYawNeutralValid = false
            pendingHeadYawNeutral = false
        }
    }

    fun init(context: Context) {
        val app = context.applicationContext
        synchronized(this) {
            if (landmarker == null) {
                val baseOptions = BaseOptions.builder()
                    .setModelAssetPath(MODEL_ASSET)
                    .build()
                val options = FaceLandmarker.FaceLandmarkerOptions.builder()
                    .setBaseOptions(baseOptions)
                    .setRunningMode(RunningMode.IMAGE)
                    .setNumFaces(1)
                    .build()
                landmarker = FaceLandmarker.createFromOptions(app, options)
            }
            if (imageSegmenter == null) {
                try {
                    val segBase = BaseOptions.builder()
                        .setModelAssetPath(SEGMENTER_MODEL_ASSET)
                        .build()
                    // Tasks API: `ImageSegmenter.createFromFile` does not exist — use createFromOptions +
                    // BaseOptions.setModelAssetPath (same pattern as FaceLandmarker).
                    val segOptions = ImageSegmenter.ImageSegmenterOptions.builder()
                        .setBaseOptions(segBase)
                        .setRunningMode(RunningMode.IMAGE)
                        .setOutputConfidenceMasks(false)
                        .setOutputCategoryMask(true)
                        .build()
                    imageSegmenter = ImageSegmenter.createFromOptions(app, segOptions)
                } catch (e: Exception) {
                    Log.w("VisionProcessor", "ImageSegmenter init failed ($SEGMENTER_MODEL_ASSET)", e)
                    imageSegmenter = null
                }
            }
        }
    }

    /** Returns `-1` because this MediaPipe Tasks version does not expose qualityScores(). */
    private fun selfieQualityMean(result: ImageSegmenterResult?): Float {
        return -1f
    }

    /**
     * Fraction of category-mask pixels equal to [SEGMENTATION_PERSON_CATEGORY] (person / foreground).
     * Uses [ByteBufferExtractor] on the mask [MPImage] (row-major `width * height` bytes).
     * Returns `-1` if there is no category mask or the buffer size mismatches.
     */
    private fun categoryMaskPersonFillRatio(result: ImageSegmenterResult): Double {
        val opt = result.categoryMask()
        if (!opt.isPresent) return -1.0
        val mask: MPImage = opt.get()
        return try {
            val w = mask.width
            val h = mask.height
            val total = w * h
            if (total <= 0) return -1.0
            val buf = ByteBufferExtractor.extract(mask)
            if (buf.remaining() < total) return -1.0
            var personPixels = 0
            repeat(total) {
                val v = buf.get().toInt() and 0xFF
                if (v == SEGMENTATION_PERSON_CATEGORY) {
                    personPixels++
                }
            }
            personPixels.toDouble() / total.toDouble()
        } finally {
            mask.close()
        }
    }

    private fun distance(a: PointF, b: PointF): Double =
        hypot((a.x - b.x).toDouble(), (a.y - b.y).toDouble())

    /** Centroid of `{x,y}` landmark maps; null if empty or no valid coordinates. */
    private fun centroidOfLandmarkMaps(points: List<Map<String, Float>>): PointF? {
        if (points.isEmpty()) return null
        var sx = 0.0
        var sy = 0.0
        var n = 0
        for (m in points) {
            val x = m["x"] ?: continue
            val y = m["y"] ?: continue
            sx += x.toDouble()
            sy += y.toDouble()
            n++
        }
        if (n == 0) return null
        return PointF((sx / n).toFloat(), (sy / n).toFloat())
    }

    private fun contourPoint(contour: List<Map<String, Float>>, index: Int): PointF? {
        if (index !in contour.indices) return null
        val m = contour[index]
        val x = m["x"] ?: return null
        val y = m["y"] ?: return null
        return PointF(x, y)
    }

    /** Symmetric dead zone around 0 using [GAZE_DEAD_ZONE]. */
    private fun applyDeadZone(v: Float): Float =
        if (abs(v) <= GAZE_DEAD_ZONE) 0f else v

    /** Horizontal eye opening: `distance(eye[0], eye[8])` on eyelid contour lists. */
    private fun eyeCornerDistance(eye: List<Map<String, Float>>): Float? {
        if (8 !in eye.indices) return null
        val p0 = contourPoint(eye, 0) ?: return null
        val p8 = contourPoint(eye, 8) ?: return null
        val w = distance(p0, p8).toFloat()
        if (w <= 1e-9f) return null
        return w
    }

    /** `(iris−centroid)x, (iris−centroid)y, eyeWidth)` or null if inputs invalid. */
    private fun gazeTriple(
        eyeCenter: PointF?,
        irisCenter: PointF?,
        eyeWidth: Float?,
    ): Triple<Float, Float, Float>? {
        if (eyeCenter == null || irisCenter == null || eyeWidth == null) return null
        if (eyeWidth <= 1e-9f) return null
        val gazeX = irisCenter.x - eyeCenter.x
        val gazeY = irisCenter.y - eyeCenter.y
        return Triple(gazeX, gazeY, eyeWidth)
    }

    /**
     * Eye Aspect Ratio from six contour [PointF] values (iris not included upstream).
     *
     * Order: **p1** = one eye corner, **p4** = opposite corner (horizontal opening);
     * **p2** and **p6** = top and bottom lid pair; **p3** and **p5** = second top and bottom pair.
     *
     * `EAR = (distance(p2,p6) + distance(p3,p5)) / (2 * distance(p1,p4))`
     */
    /**
     * Simplified head pose from nose vs eyes (normalized by inter-ocular distance).
     *
     * - **headYaw**: horizontal offset of nose tip from midpoint between eye centers, divided by
     *   eye-center distance (left–right head turn shifts nose along this axis in 2D).
     * - **headPitch**: vertical offset of nose tip from that midpoint, same scale (nod shifts nose
     *   vertically relative to eyes in 2D).
     * - **headStable**: \|headYaw\| below 0.7f and \|headPitch\| below 0.5f (nose offset / inter-eye scale).
     *
     * @return `(headYaw, headPitch, headStable)` or `null` if geometry is degenerate.
     */
    private fun headPoseFromNoseAndEyes(
        landmarks: List<NormalizedLandmark>,
        leftEyeCenter: PointF?,
        rightEyeCenter: PointF?,
    ): Triple<Float, Float, Boolean>? {
        val leftCenter = leftEyeCenter ?: return null
        val rightCenter = rightEyeCenter ?: return null
        val midX = (leftCenter.x + rightCenter.x) * 0.5
        val midY = (leftCenter.y + rightCenter.y) * 0.5
        val iod = distance(leftCenter, rightCenter)
        if (iod < 1e-6) return null
        if (NOSE_TIP_INDEX !in landmarks.indices) return null
        val nose = landmarks[NOSE_TIP_INDEX]
        val nx = nose.x().toDouble()
        val ny = nose.y().toDouble()
        val headYaw = ((nx - midX) / iod).toFloat()
        val headPitch = ((ny - midY) / iod).toFloat()
        val headStable = abs(headYaw) < 0.7f && abs(headPitch) < 0.5f
        return Triple(headYaw, headPitch, headStable)
    }

    fun computeEAR(points: List<PointF>): Float {
        if (points.size < 6) return 0f
        val p1 = points[0]
        val p2 = points[1]
        val p3 = points[2]
        val p4 = points[3]
        val p5 = points[4]
        val p6 = points[5]
        val horizontal = distance(p1, p4)
        if (horizontal <= 1e-6) return 0f
        val numerator = distance(p2, p6) + distance(p3, p5)
        return (numerator / (2.0 * horizontal)).toFloat()
    }

    fun computeCenter(points: List<PointF>): PointF {
        if (points.isEmpty()) return PointF(0f, 0f)
        var sumX = 0f
        var sumY = 0f
        for (p in points) {
            sumX += p.x
            sumY += p.y
        }
        return PointF(sumX / points.size, sumY / points.size)
    }

    /**
     * @return Map with `landmarks` (full face `{x,y}` each), `leftEye`, `rightEye` (eyelid contour
     * only), `leftEAR`, `rightEAR`, `gazeX` / `gazeY` (per-eye `(iris−centroid)/eyeWidth`, × `8.0f`
     * on X and × `4.0f` on Y; when both eyes valid and variance can pick dominance, **80% dominant +
     * 20% other** eye on X and Y (`gazeDominantEye`); else **average** both until histories reach
     * [GAZE_DOMINANCE_MIN_SAMPLES]; single-eye fallback when only one side is valid; then
     * [applyDeadZone], clamp to `[-1f, 1f]`, then EMA [GAZE_XY_SMOOTH]). Before dead zone, gaze is
     * scaled by `(1 - headPenalty)` where `headPenalty = min(1, |correctedYaw|)` and
     * `correctedYaw = rawYaw - neutralYaw` after [requestHeadYawNeutralCalibration] (otherwise raw yaw).
     * and
     * `headYaw` / `headPitch` (nose vs eye-midline, normalized by inter-eye distance) plus
     * `headStable`. Gaze is `0f` when iris/eye geometry is unavailable; head fields default when pose cannot be computed.
     * `attentionScore` is 0–100: [computeAttentionScore] keeps `attention` in ~0–1 (penalties/bonuses as
     * fractions of 100), then `attentionScore = (attention * 100).roundToInt()` clamped to 0–100.
     * No face yields 0.
     *
     * When a face is detected and [imageSegmenter] loaded: `selfieQuality` is the mean of
     * [ImageSegmenterResult.qualityScores] (or `-1`); `faceConfidence` is the fraction of
     * [ImageSegmenterResult.categoryMask] pixels with category [SEGMENTATION_PERSON_CATEGORY] (`1`),
     * matching a row-major mask scan — or `-1` if unavailable.
     */
    fun process(bitmap: Bitmap): Map<String, Any> {
        val processStartNs = System.nanoTime()
        val faceLandmarker = landmarker ?: return noFacePayload(processStartNs)

        val image = if (bitmap.config == Bitmap.Config.ARGB_8888) {
            bitmap
        } else {
            bitmap.copy(Bitmap.Config.ARGB_8888, false)
        }

        return try {
            val mpImage = BitmapImageBuilder(image).build()
            val result = faceLandmarker.detect(mpImage) ?: return noFacePayload(processStartNs)
            val faces = result.faceLandmarks()
            if (faces.isEmpty()) return noFacePayload(processStartNs)

            val (selfieQuality, faceConfidence) = try {
                val seg = imageSegmenter
                if (seg != null) {
                    val segResult = seg.segment(mpImage)
                    Pair(selfieQualityMean(segResult), categoryMaskPersonFillRatio(segResult))
                } else {
                    Pair(-1f, -1.0)
                }
            } catch (e: Exception) {
                Log.w("VisionProcessor", "ImageSegmenter.segment failed", e)
                Pair(-1f, -1.0)
            }

            val landmarks = faces[0]
            val all = landmarks.map { lm -> mapOf("x" to lm.x(), "y" to lm.y()) }
            val leftEye = extractPoints(landmarks, LEFT_EYE_CONTOUR_INDICES)
            val rightEye = extractPoints(landmarks, RIGHT_EYE_CONTOUR_INDICES)
            val leftEarPts = pickEarSixFromContour(leftEye, LEFT_EAR_SIX_IN_CONTOUR)
            val rightEarPts = pickEarSixFromContour(rightEye, RIGHT_EAR_SIX_IN_CONTOUR)
            val leftEAR = computeEAR(leftEarPts)
            val rightEAR = computeEAR(rightEarPts)
            val avgEAR = (leftEAR + rightEAR) / 2f

            val leftIris = extractPoints(landmarks, LEFT_IRIS_INDICES)
            val rightIris = extractPoints(landmarks, RIGHT_IRIS_INDICES)
            synchronized(this) {
                if (irisDebugLoggingEnabled) {
                    irisDebugLogFrameCounter += 1
                    if (irisDebugLogFrameCounter % irisDebugLogSampleRate == 0) {
                        Log.d(
                            IRIS_LOG_TAG,
                            "Left iris: ${leftIris.size} | Right iris: ${rightIris.size}",
                        )
                    }
                }
            }
            val leftEyeCenter = centroidOfLandmarkMaps(leftEye)
            val rightEyeCenter = centroidOfLandmarkMaps(rightEye)
            val leftIrisCenter = centroidOfLandmarkMaps(leftIris)
            val rightIrisCenter = centroidOfLandmarkMaps(rightIris)
            val leftEyeWidth = eyeCornerDistance(leftEye)
            val rightEyeWidth = eyeCornerDistance(rightEye)
            val leftGazeParts = gazeTriple(leftEyeCenter, leftIrisCenter, leftEyeWidth)
            val rightGazeParts = gazeTriple(rightEyeCenter, rightIrisCenter, rightEyeWidth)

            val leftScaledX: Float
            val leftScaledY: Float
            if (leftGazeParts != null) {
                val (gx, gy, w) = leftGazeParts
                leftScaledX = (gx / w) * 8.0f
                leftScaledY = (gy / w) * 4.0f
            } else {
                leftScaledX = 0f
                leftScaledY = 0f
            }
            val rightScaledX: Float
            val rightScaledY: Float
            if (rightGazeParts != null) {
                val (gx, gy, w) = rightGazeParts
                rightScaledX = (gx / w) * 8.0f
                rightScaledY = (gy / w) * 4.0f
            } else {
                rightScaledX = 0f
                rightScaledY = 0f
            }

            val gazeAvailable = leftGazeParts != null || rightGazeParts != null
            val fusion = synchronized(this) {
                if (leftGazeParts != null) {
                    appendGazeSample(leftGazeHistory, leftScaledX)
                }
                if (rightGazeParts != null) {
                    appendGazeSample(rightGazeHistory, rightScaledX)
                }
                val leftOk = leftGazeParts != null
                val rightOk = rightGazeParts != null
                val lN = leftGazeHistory.size
                val rN = rightGazeHistory.size
                val canPickByVariance = leftOk && rightOk &&
                    lN >= GAZE_DOMINANCE_MIN_SAMPLES &&
                    rN >= GAZE_DOMINANCE_MIN_SAMPLES
                val leftVar = variance(leftGazeHistory)
                val rightVar = variance(rightGazeHistory)
                val isRightDominant = rightVar < leftVar
                when {
                    leftOk && rightOk && canPickByVariance -> {
                        if (isRightDominant) {
                            val gx = rightScaledX * 0.8f + leftScaledX * 0.2f
                            val gy = rightScaledY * 0.8f + leftScaledY * 0.2f
                            Triple(gx, gy, "right")
                        } else {
                            val gx = leftScaledX * 0.8f + rightScaledX * 0.2f
                            val gy = leftScaledY * 0.8f + rightScaledY * 0.2f
                            Triple(gx, gy, "left")
                        }
                    }
                    leftOk && rightOk -> {
                        val ax = (leftScaledX + rightScaledX) * 0.5f
                        val ay = (leftScaledY + rightScaledY) * 0.5f
                        Triple(ax, ay, "both")
                    }
                    rightOk -> Triple(rightScaledX, rightScaledY, "right")
                    leftOk -> Triple(leftScaledX, leftScaledY, "left")
                    else -> Triple(0f, 0f, "none")
                }
            }
            val normGazeX = fusion.first
            val normGazeY = fusion.second
            val gazeDominantEye: String = fusion.third

            val headPose = headPoseFromNoseAndEyes(landmarks, leftEyeCenter, rightEyeCenter)
            val headYawRaw = headPose?.first ?: 0f
            val headPitch = headPose?.second ?: 0f
            val (neutralYaw, useNeutralYaw) = synchronized(this) {
                if (pendingHeadYawNeutral && headPose != null) {
                    headYawNeutral = headPose.first
                    headYawNeutralValid = true
                    pendingHeadYawNeutral = false
                }
                Pair(headYawNeutral, headYawNeutralValid)
            }
            val headYaw = if (useNeutralYaw && headPose != null) {
                headYawRaw - neutralYaw
            } else {
                headYawRaw
            }
            val headStable = headPose != null &&
                abs(headYaw) < 0.7f &&
                abs(headPitch) < 0.5f
            val headPenalty = min(1f, abs(headYaw) / 1.0f)
            val adjustedGazeX = normGazeX * (1f - headPenalty)
            val adjustedGazeY = normGazeY * (1f - headPenalty)
            val finalGazeX = applyDeadZone(adjustedGazeX).coerceIn(-1f, 1f)
            val finalGazeY = applyDeadZone(adjustedGazeY).coerceIn(-1f, 1f)

            val smoothGazeXOut: Float
            val smoothGazeYOut: Float
            val gazeXVariance1s: Double
            val microSaccadesDetected: Boolean
            val blinksLast60s: Int
            var fakeStaticGaze = false
            var fakePerfectStability = false
            var fakeNoBlink = false
            synchronized(this) {
                val s = GAZE_XY_SMOOTH
                smoothGazeX = s * smoothGazeX + (1f - s) * finalGazeX
                smoothGazeY = s * smoothGazeY + (1f - s) * finalGazeY
                smoothGazeXOut = smoothGazeX
                smoothGazeYOut = smoothGazeY
                val now = System.currentTimeMillis()
                gazeXAttentionWindow.addLast(now to smoothGazeXOut)
                while (
                    gazeXAttentionWindow.isNotEmpty() &&
                    now - gazeXAttentionWindow.first().first > GAZE_X_ATTENTION_WINDOW_MS
                ) {
                    gazeXAttentionWindow.removeFirst()
                }
                gazeXVariance1s = varianceGazeXAttentionWindow(gazeXAttentionWindow)
                microSaccadesDetected = when {
                    !gazeAvailable || avgEAR < EAR_THRESHOLD -> {
                        microSaccadePrevInitialized = false
                        false
                    }
                    !microSaccadePrevInitialized -> {
                        microSaccadePrevGazeX = finalGazeX
                        microSaccadePrevInitialized = true
                        false
                    }
                    else -> {
                        val step = abs(finalGazeX - microSaccadePrevGazeX)
                        microSaccadePrevGazeX = finalGazeX
                        step >= MICROSACCADE_MIN_STEP && step <= MICROSACCADE_MAX_STEP
                    }
                }
                if (avgEAR < EAR_THRESHOLD) {
                    blinkFrames += 1
                } else {
                    if (blinkFrames >= MIN_BLINK_FRAMES &&
                        now - lastBlinkTime > BLINK_COOLDOWN_MS
                    ) {
                        blinkCount += 1
                        lastBlinkTime = now
                        blinkRateWindow.addLast(now)
                    }
                    blinkFrames = 0
                }
                isBlinking = blinkFrames > 0
                while (
                    blinkRateWindow.isNotEmpty() &&
                    now - blinkRateWindow.first() > BLINK_RATE_WINDOW_MS
                ) {
                    blinkRateWindow.removeFirst()
                }
                blinksLast60s = blinkRateWindow.size

                if (!gazeAvailable) {
                    authPrevFinalGazeX = Float.NaN
                }
                if (!prevHadFaceForAuth) {
                    authFaceEnteredMs = now
                    blinkCountAtAuthFaceEntry = blinkCount
                    authLastGazeMovementMs = now
                    authPrevFinalGazeX = if (gazeAvailable) finalGazeX else Float.NaN
                    authPerfectStabilitySinceMs = 0L
                } else {
                    if (gazeAvailable && !authPrevFinalGazeX.isNaN()) {
                        if (abs(finalGazeX - authPrevFinalGazeX) > AUTH_GAZE_MOVE_EPS) {
                            authLastGazeMovementMs = now
                        }
                        authPrevFinalGazeX = finalGazeX
                    } else if (gazeAvailable) {
                        authPrevFinalGazeX = finalGazeX
                    }
                }
                fakeStaticGaze = gazeAvailable &&
                    (now - authLastGazeMovementMs > AUTH_STATIC_GAZE_MS)
                val windowN = gazeXAttentionWindow.size
                val tooStable = gazeXVariance1s.isFinite() &&
                    gazeXVariance1s < AUTH_PERFECT_VARIANCE_MAX &&
                    windowN >= AUTH_PERFECT_WINDOW_MIN_SAMPLES
                fakePerfectStability = if (tooStable) {
                    if (authPerfectStabilitySinceMs == 0L) {
                        authPerfectStabilitySinceMs = now
                    }
                    now - authPerfectStabilitySinceMs >= AUTH_PERFECT_STREAK_MS
                } else {
                    authPerfectStabilitySinceMs = 0L
                    false
                }
                fakeNoBlink = (blinkCount == blinkCountAtAuthFaceEntry) &&
                    (now - authFaceEnteredMs >= AUTH_NO_BLINK_FACE_MS)
                prevHadFaceForAuth = true
            }

            val likelyFake = fakeStaticGaze || fakePerfectStability || fakeNoBlink

            val headPoseForAttention = if (headPose != null) {
                Triple(headYaw, headPitch, headStable)
            } else {
                null
            }
            val attentionScore = computeAttentionScore(
                avgEAR = avgEAR,
                gazeX = smoothGazeXOut,
                gazeAvailable = gazeAvailable,
                headPose = headPoseForAttention,
                gazeXVariance1s = gazeXVariance1s,
                microSaccadesDetected = microSaccadesDetected,
                blinksLast60s = blinksLast60s,
            )

            mapOf(
                "landmarks" to if (includeFullLandmarks) all else emptyList<Map<String, Float>>(),
                "leftEye" to if (includeFullLandmarks) leftEye else emptyList<Map<String, Float>>(),
                "rightEye" to if (includeFullLandmarks) rightEye else emptyList<Map<String, Float>>(),
                "leftEAR" to leftEAR,
                "rightEAR" to rightEAR,
                "gazeX" to smoothGazeXOut,
                "gazeY" to smoothGazeYOut,
                // Raw horizontal head yaw before neutral subtraction (same geometry as headYaw offset).
                "headYawRaw" to headYawRaw,
                "headYaw" to headYaw,
                "headPitch" to headPitch,
                "headStable" to headStable,
                "isBlinking" to isBlinking,
                "blinkCount" to blinkCount,
                "attentionScore" to attentionScore,
                "gazeDominantEye" to gazeDominantEye,
                "likelyFake" to likelyFake,
                "fakeStaticGaze" to fakeStaticGaze,
                "fakePerfectStability" to fakePerfectStability,
                "fakeNoBlink" to fakeNoBlink,
                "selfieQuality" to selfieQuality,
                "faceConfidence" to faceConfidence,
                "nativeProcessMs" to (System.nanoTime() - processStartNs) / 1_000_000.0,
            )
        } finally {
            if (image !== bitmap) {
                image.recycle()
            }
        }
    }

    /** Same keys as [process] when there is no face; preserves [isBlinking] / [blinkCount]. */
    fun emptyPayload(): Map<String, Any> = noFacePayload()

    /**
     * [attention] is a 0–1 aggregate (1 = best); penalties and bonuses are applied as fractions of 100,
     * then [attentionScore] = `(attention * 100).roundToInt()` in 0–100.
     * No face uses [noFacePayload] (score 0).
     */
    private fun computeAttentionScore(
        avgEAR: Float,
        gazeX: Float,
        gazeAvailable: Boolean,
        headPose: Triple<Float, Float, Boolean>?,
        gazeXVariance1s: Double,
        microSaccadesDetected: Boolean,
        blinksLast60s: Int,
    ): Int {
        var attention = 1.0
        val headStable = headPose?.third == true
        if (!headStable) attention -= 30 / 100.0
        if (avgEAR < EAR_THRESHOLD) attention -= 40 / 100.0
        if (gazeAvailable && abs(gazeX) > ATTENTION_GAZE_X_THRESHOLD) attention -= 20 / 100.0
        if (gazeXVariance1s < GAZE_X_ATTENTION_VARIANCE_THRESHOLD) {
            attention += ATTENTION_STEADY_GAZE_BONUS / 100.0
        }
        headPose?.let { (yaw, pitch, _) ->
            if (abs(yaw) < ATTENTION_NEUTRAL_HEAD_ANGLE && abs(pitch) < ATTENTION_NEUTRAL_HEAD_ANGLE) {
                attention += ATTENTION_NEUTRAL_HEAD_BONUS / 100.0
            }
        }
        if (microSaccadesDetected) attention += ATTENTION_MICROSACCADE_BONUS / 100.0
        if (blinksLast60s in ATTENTION_BLINK_FREQ_MIN..ATTENTION_BLINK_FREQ_MAX) {
            attention += ATTENTION_BLINK_FREQ_BONUS / 100.0
        }
        attention = attention.coerceIn(0.0, 1.0)
        return (attention * 100.0).roundToInt()
    }

    private fun noFacePayload(processStartNs: Long? = null): Map<String, Any> {
        synchronized(this) {
            smoothGazeX = 0f
            smoothGazeY = 0f
            leftGazeHistory.clear()
            rightGazeHistory.clear()
            gazeXAttentionWindow.clear()
            microSaccadePrevInitialized = false
            prevHadFaceForAuth = false
            authPerfectStabilitySinceMs = 0L
            authPrevFinalGazeX = Float.NaN
            val pruneT = System.currentTimeMillis()
            while (
                blinkRateWindow.isNotEmpty() &&
                pruneT - blinkRateWindow.first() > BLINK_RATE_WINDOW_MS
            ) {
                blinkRateWindow.removeFirst()
            }
        }
        return mapOf(
            "landmarks" to emptyList<Map<String, Float>>(),
            "leftEye" to emptyList<Map<String, Float>>(),
            "rightEye" to emptyList<Map<String, Float>>(),
            "leftEAR" to 0f,
            "rightEAR" to 0f,
            "gazeX" to 0f,
            "gazeY" to 0f,
            "headYawRaw" to 0f,
            "headYaw" to 0f,
            "headPitch" to 0f,
            "headStable" to false,
            "isBlinking" to isBlinking,
            "blinkCount" to blinkCount,
            "attentionScore" to 0,
            "gazeDominantEye" to "none",
            "likelyFake" to false,
            "fakeStaticGaze" to false,
            "fakePerfectStability" to false,
            "fakeNoBlink" to false,
            "selfieQuality" to -1f,
            "faceConfidence" to -1.0,
            "nativeProcessMs" to if (processStartNs == null) 0.0 else {
                (System.nanoTime() - processStartNs) / 1_000_000.0
            },
        )
    }

    private fun extractPoints(
        landmarks: List<NormalizedLandmark>,
        indices: IntArray,
    ): List<Map<String, Float>> {
        val out = ArrayList<Map<String, Float>>(indices.size)
        for (i in indices) {
            if (i !in landmarks.indices) continue
            val lm = landmarks[i]
            out.add(mapOf("x" to lm.x(), "y" to lm.y()))
        }
        return out
    }

    private fun pickEarSixFromContour(
        eyeContour: List<Map<String, Float>>,
        contourIndicesForP1ToP6: IntArray,
    ): List<PointF> {
        if (contourIndicesForP1ToP6.size != 6) return emptyList()
        val out = ArrayList<PointF>(6)
        for (idx in contourIndicesForP1ToP6) {
            if (idx !in eyeContour.indices) return emptyList()
            val m = eyeContour[idx]
            val x = m["x"] ?: return emptyList()
            val y = m["y"] ?: return emptyList()
            out.add(PointF(x, y))
        }
        return out
    }
}
