import Foundation
import UIKit
import MediaPipeTasksVision

/// MediaPipe Face Landmarker (IMAGE mode), aligned with Android `VisionProcessor.kt` channel map.
final class VisionProcessor {
  static let shared = VisionProcessor()

  private let modelAsset = "face_landmarker.task"
  private let earThreshold: Float = 0.15
  private let minBlinkFrames = 3
  private let blinkCooldownMs: Int64 = 250
  private let noseTipIndex = 1
  private let attentionGazeXThreshold: Float = 0.4
  private let gazeXAttentionWindowMs: Int64 = 1000
  private let gazeXAttentionVarianceThreshold = 0.002
  private let attentionSteadyGazeBonus: Double = 0.3
  private let attentionNeutralHeadAngle: Float = 0.2
  private let attentionNeutralHeadBonus: Double = 0.2
  private let microsaccadeMinStep: Float = 0.004
  private let microsaccadeMaxStep: Float = 0.07
  private let attentionMicrosaccadeBonus: Double = 0.2
  private let blinkRateWindowMs: Int64 = 60_000
  private let attentionBlinkFreqMin = 10
  private let attentionBlinkFreqMax = 25
  private let attentionBlinkFreqBonus: Double = 0.2
  private let authStaticGazeMs: Int64 = 3000
  private let authGazeMoveEps: Float = 0.00015
  private let authPerfectVarianceMax = 1e-9
  private let authPerfectWindowMinSamples = 20
  private let authPerfectStreakMs: Int64 = 2500
  private let authNoBlinkFaceMs: Int64 = 30_000
  private let gazeDeadZone: Float = 0.035
  private let gazeXySmooth: Float = 0.85
  private let gazeDominanceMaxSamples = 20
  private let gazeDominanceMinSamples = 5

  private let leftEyeContourIndices: [Int] = [
    263, 249, 390, 373, 374, 380, 381, 382, 362,
    466, 388, 387, 386, 385, 384, 398,
  ]
  private let rightEyeContourIndices: [Int] = [
    33, 7, 163, 144, 145, 153, 154, 155, 133,
    246, 161, 160, 159, 158, 157, 173,
  ]
  private let leftEarSixInContour = [8, 13, 11, 0, 3, 5]
  private let rightEarSixInContour = [0, 11, 13, 8, 5, 3]
  private let leftIrisIndices = [474, 475, 476, 477]
  private let rightIrisIndices = [469, 470, 471, 472]

  private var landmarker: FaceLandmarker?
  private let lock = NSLock()

  private(set) var isBlinking = false
  private(set) var blinkCount = 0
  private var blinkFrames = 0
  private var lastBlinkTime: Int64 = 0
  private var smoothGazeX: Float = 0
  private var smoothGazeY: Float = 0
  private var leftGazeHistory: [Float] = []
  private var rightGazeHistory: [Float] = []
  private var gazeXAttentionWindow: [(Int64, Float)] = []
  private var microSaccadePrevGazeX: Float = 0
  private var microSaccadePrevInitialized = false
  private var blinkRateWindow: [Int64] = []
  private var prevHadFaceForAuth = false
  private var authFaceEnteredMs: Int64 = 0
  private var blinkCountAtAuthFaceEntry = 0
  private var authLastGazeMovementMs: Int64 = 0
  private var authPrevFinalGazeX = Float.nan
  private var authPerfectStabilitySinceMs: Int64 = 0
  private var headYawNeutral: Float = 0
  private var headYawNeutralValid = false
  private var pendingHeadYawNeutral = false

  private var includeFullLandmarks: Bool {
    #if DEBUG
    return true
    #else
    return false
    #endif
  }

  private init() {}

  func initLandmarker() {
    lock.lock()
    defer { lock.unlock() }
    guard landmarker == nil else { return }
    let options = FaceLandmarkerOptions()
    options.baseOptions.modelAssetPath = modelAsset
    options.runningMode = .image
    options.numFaces = 1
    landmarker = try? FaceLandmarker(options: options)
  }

  func requestHeadYawNeutralCalibration() {
    lock.lock()
    pendingHeadYawNeutral = true
    lock.unlock()
  }

  func emptyPayload() -> [String: Any] {
    noFacePayload(processStart: nil)
  }

  func process(_ image: UIImage) -> [String: Any] {
    let start = DispatchTime.now().uptimeNanoseconds
    guard let cg = image.cgImage else {
      return noFacePayload(processStart: start)
    }
    return process(cgImage: cg, processStart: start)
  }

  func process(cgImage: CGImage, processStart: UInt64) -> [String: Any] {
    lock.lock()
    let marker = landmarker
    lock.unlock()
    guard let marker else {
      return noFacePayload(processStart: processStart)
    }

    let uiImage = UIImage(cgImage: cgImage)
    guard let mpImage = try? MPImage(uiImage: uiImage) else {
      return noFacePayload(processStart: processStart)
    }

    guard let result = try? marker.detect(image: mpImage),
          let landmarks = result.faceLandmarks.first,
          !landmarks.isEmpty
    else {
      return noFacePayload(processStart: processStart)
    }

    let selfieQuality: Float = -1
    let faceConfidence: Double = -1

    let all = landmarks.map { ["x": $0.x, "y": $0.y] as [String: Float] }
    let leftEye = extractPoints(landmarks, leftEyeContourIndices)
    let rightEye = extractPoints(landmarks, rightEyeContourIndices)
    let leftEarPts = pickEarSix(from: leftEye, indices: leftEarSixInContour)
    let rightEarPts = pickEarSix(from: rightEye, indices: rightEarSixInContour)
    let leftEAR = computeEAR(leftEarPts)
    let rightEAR = computeEAR(rightEarPts)
    let avgEAR = (leftEAR + rightEAR) / 2

    let leftIris = extractPoints(landmarks, leftIrisIndices)
    let rightIris = extractPoints(landmarks, rightIrisIndices)
    let leftEyeCenter = centroid(of: leftEye)
    let rightEyeCenter = centroid(of: rightEye)
    let leftIrisCenter = centroid(of: leftIris)
    let rightIrisCenter = centroid(of: rightIris)
    let leftEyeWidth = eyeCornerDistance(leftEye)
    let rightEyeWidth = eyeCornerDistance(rightEye)
    let leftGaze = gazeTriple(eye: leftEyeCenter, iris: leftIrisCenter, width: leftEyeWidth)
    let rightGaze = gazeTriple(eye: rightEyeCenter, iris: rightIrisCenter, width: rightEyeWidth)

    let leftScaledX: Float
    let leftScaledY: Float
    if let g = leftGaze {
      leftScaledX = (g.0 / g.2) * 8
      leftScaledY = (g.1 / g.2) * 4
    } else {
      leftScaledX = 0
      leftScaledY = 0
    }
    let rightScaledX: Float
    let rightScaledY: Float
    if let g = rightGaze {
      rightScaledX = (g.0 / g.2) * 8
      rightScaledY = (g.1 / g.2) * 4
    } else {
      rightScaledX = 0
      rightScaledY = 0
    }

    let gazeAvailable = leftGaze != nil || rightGaze != nil
    let fusion = fuseGaze(
      leftOk: leftGaze != nil,
      rightOk: rightGaze != nil,
      leftScaledX: leftScaledX,
      leftScaledY: leftScaledY,
      rightScaledX: rightScaledX,
      rightScaledY: rightScaledY
    )
    let normGazeX = fusion.0
    let normGazeY = fusion.1
    let gazeDominantEye = fusion.2

    let headPose = headPoseFromNoseAndEyes(
      landmarks: landmarks,
      leftEye: leftEyeCenter,
      rightEye: rightEyeCenter
    )
    let headYawRaw = headPose?.0 ?? 0
    let headPitch = headPose?.1 ?? 0

    lock.lock()
    if pendingHeadYawNeutral, headPose != nil {
      headYawNeutral = headPose!.0
      headYawNeutralValid = true
      pendingHeadYawNeutral = false
    }
    let useNeutral = headYawNeutralValid
    let neutralYaw = headYawNeutral
    lock.unlock()

    let headYaw: Float
    if useNeutral, headPose != nil {
      headYaw = headYawRaw - neutralYaw
    } else {
      headYaw = headYawRaw
    }
    let headStable =
      headPose != nil && abs(headYaw) < 0.7 && abs(headPitch) < 0.5
    let headPenalty = min(1, abs(headYaw))
    let adjustedGazeX = normGazeX * (1 - headPenalty)
    let adjustedGazeY = normGazeY * (1 - headPenalty)
    let finalGazeX = applyDeadZone(adjustedGazeX).clamped(-1, 1)
    let finalGazeY = applyDeadZone(adjustedGazeY).clamped(-1, 1)

    let telemetry = updateTelemetry(
      finalGazeX: finalGazeX,
      finalGazeY: finalGazeY,
      gazeAvailable: gazeAvailable,
      avgEAR: avgEAR,
      smoothGazeXIn: finalGazeX,
      smoothGazeYIn: finalGazeY
    )

    let attentionScore = computeAttentionScore(
      avgEAR: avgEAR,
      gazeX: telemetry.smoothGazeX,
      gazeAvailable: gazeAvailable,
      headYaw: headYaw,
      headPitch: headPitch,
      headStable: headStable,
      gazeXVariance1s: telemetry.gazeXVariance1s,
      microSaccades: telemetry.microSaccades,
      blinksLast60s: telemetry.blinksLast60s
    )

    let processMs =
      Double(DispatchTime.now().uptimeNanoseconds - processStart) / 1_000_000

    return [
      "landmarks": includeFullLandmarks ? all : [] as [[String: Float]],
      "leftEye": includeFullLandmarks ? leftEye : [] as [[String: Float]],
      "rightEye": includeFullLandmarks ? rightEye : [] as [[String: Float]],
      "leftEAR": leftEAR,
      "rightEAR": rightEAR,
      "gazeX": telemetry.smoothGazeX,
      "gazeY": telemetry.smoothGazeY,
      "headYawRaw": headYawRaw,
      "headYaw": headYaw,
      "headPitch": headPitch,
      "headStable": headStable,
      "isBlinking": isBlinking,
      "blinkCount": blinkCount,
      "attentionScore": attentionScore,
      "gazeDominantEye": gazeDominantEye,
      "likelyFake": telemetry.likelyFake,
      "fakeStaticGaze": telemetry.fakeStaticGaze,
      "fakePerfectStability": telemetry.fakePerfectStability,
      "fakeNoBlink": telemetry.fakeNoBlink,
      "selfieQuality": selfieQuality,
      "faceConfidence": faceConfidence,
      "nativeProcessMs": processMs,
    ]
  }

  // MARK: - Telemetry / blink / anti-spoof

  private struct TelemetryOut {
    let smoothGazeX: Float
    let smoothGazeY: Float
    let gazeXVariance1s: Double
    let microSaccades: Bool
    let blinksLast60s: Int
    let likelyFake: Bool
    let fakeStaticGaze: Bool
    let fakePerfectStability: Bool
    let fakeNoBlink: Bool
  }

  private func updateTelemetry(
    finalGazeX: Float,
    finalGazeY: Float,
    gazeAvailable: Bool,
    avgEAR: Float,
    smoothGazeXIn: Float,
    smoothGazeYIn: Float
  ) -> TelemetryOut {
    lock.lock()
    defer { lock.unlock() }
    let s = gazeXySmooth
    smoothGazeX = s * smoothGazeX + (1 - s) * smoothGazeXIn
    smoothGazeY = s * smoothGazeY + (1 - s) * smoothGazeYIn
    let smoothOutX = smoothGazeX
    let smoothOutY = smoothGazeY

    let now = Int64(Date().timeIntervalSince1970 * 1000)
    gazeXAttentionWindow.append((now, smoothOutX))
    while let first = gazeXAttentionWindow.first,
          now - first.0 > gazeXAttentionWindowMs
    {
      gazeXAttentionWindow.removeFirst()
    }
    let gazeXVariance1s = varianceGazeWindow(gazeXAttentionWindow)

    let microSaccades: Bool
    if !gazeAvailable || avgEAR < earThreshold {
      microSaccadePrevInitialized = false
      microSaccades = false
    } else if !microSaccadePrevInitialized {
      microSaccadePrevGazeX = finalGazeX
      microSaccadePrevInitialized = true
      microSaccades = false
    } else {
      let step = abs(finalGazeX - microSaccadePrevGazeX)
      microSaccadePrevGazeX = finalGazeX
      microSaccades = step >= microsaccadeMinStep && step <= microsaccadeMaxStep
    }

    if avgEAR < earThreshold {
      blinkFrames += 1
    } else {
      if blinkFrames >= minBlinkFrames && now - lastBlinkTime > blinkCooldownMs {
        blinkCount += 1
        lastBlinkTime = now
        blinkRateWindow.append(now)
      }
      blinkFrames = 0
    }
    isBlinking = blinkFrames > 0
    while let first = blinkRateWindow.first, now - first > blinkRateWindowMs {
      blinkRateWindow.removeFirst()
    }
    let blinksLast60s = blinkRateWindow.count

    if !gazeAvailable {
      authPrevFinalGazeX = .nan
    }
    if !prevHadFaceForAuth {
      authFaceEnteredMs = now
      blinkCountAtAuthFaceEntry = blinkCount
      authLastGazeMovementMs = now
      authPrevFinalGazeX = gazeAvailable ? finalGazeX : .nan
      authPerfectStabilitySinceMs = 0
    } else {
      if gazeAvailable && !authPrevFinalGazeX.isNaN {
        if abs(finalGazeX - authPrevFinalGazeX) > authGazeMoveEps {
          authLastGazeMovementMs = now
        }
        authPrevFinalGazeX = finalGazeX
      } else if gazeAvailable {
        authPrevFinalGazeX = finalGazeX
      }
    }
    let fakeStaticGaze =
      gazeAvailable && (now - authLastGazeMovementMs > authStaticGazeMs)
    let windowN = gazeXAttentionWindow.count
    let tooStable =
      gazeXVariance1s.isFinite &&
      gazeXVariance1s < authPerfectVarianceMax &&
      windowN >= authPerfectWindowMinSamples
    let fakePerfectStability: Bool
    if tooStable {
      if authPerfectStabilitySinceMs == 0 {
        authPerfectStabilitySinceMs = now
      }
      fakePerfectStability = now - authPerfectStabilitySinceMs >= authPerfectStreakMs
    } else {
      authPerfectStabilitySinceMs = 0
      fakePerfectStability = false
    }
    let fakeNoBlink =
      blinkCount == blinkCountAtAuthFaceEntry &&
      (now - authFaceEnteredMs >= authNoBlinkFaceMs)
    prevHadFaceForAuth = true
    let likelyFake = fakeStaticGaze || fakePerfectStability || fakeNoBlink

    return TelemetryOut(
      smoothGazeX: smoothOutX,
      smoothGazeY: smoothOutY,
      gazeXVariance1s: gazeXVariance1s,
      microSaccades: microSaccades,
      blinksLast60s: blinksLast60s,
      likelyFake: likelyFake,
      fakeStaticGaze: fakeStaticGaze,
      fakePerfectStability: fakePerfectStability,
      fakeNoBlink: fakeNoBlink
    )
  }

  private func noFacePayload(processStart: UInt64?) -> [String: Any] {
    lock.lock()
    smoothGazeX = 0
    smoothGazeY = 0
    leftGazeHistory.removeAll()
    rightGazeHistory.removeAll()
    gazeXAttentionWindow.removeAll()
    microSaccadePrevInitialized = false
    prevHadFaceForAuth = false
    authPerfectStabilitySinceMs = 0
    authPrevFinalGazeX = .nan
    let now = Int64(Date().timeIntervalSince1970 * 1000)
    while let first = blinkRateWindow.first, now - first > blinkRateWindowMs {
      blinkRateWindow.removeFirst()
    }
    let blinking = isBlinking
    let count = blinkCount
    lock.unlock()

    let processMs: Double
    if let start = processStart {
      processMs =
        Double(DispatchTime.now().uptimeNanoseconds - start) / 1_000_000
    } else {
      processMs = 0
    }

    return [
      "landmarks": [] as [[String: Float]],
      "leftEye": [] as [[String: Float]],
      "rightEye": [] as [[String: Float]],
      "leftEAR": Float(0),
      "rightEAR": Float(0),
      "gazeX": Float(0),
      "gazeY": Float(0),
      "headYawRaw": Float(0),
      "headYaw": Float(0),
      "headPitch": Float(0),
      "headStable": false,
      "isBlinking": blinking,
      "blinkCount": count,
      "attentionScore": 0,
      "gazeDominantEye": "none",
      "likelyFake": false,
      "fakeStaticGaze": false,
      "fakePerfectStability": false,
      "fakeNoBlink": false,
      "selfieQuality": Float(-1),
      "faceConfidence": Double(-1),
      "nativeProcessMs": processMs,
    ]
  }

  private func computeAttentionScore(
    avgEAR: Float,
    gazeX: Float,
    gazeAvailable: Bool,
    headYaw: Float,
    headPitch: Float,
    headStable: Bool,
    gazeXVariance1s: Double,
    microSaccades: Bool,
    blinksLast60s: Int
  ) -> Int {
    var attention = 1.0
    if !headStable { attention -= 0.30 }
    if avgEAR < earThreshold { attention -= 0.40 }
    if gazeAvailable && abs(gazeX) > attentionGazeXThreshold {
      attention -= 0.20
    }
    if gazeXVariance1s < gazeXAttentionVarianceThreshold {
      attention += attentionSteadyGazeBonus / 100
    }
    if abs(headYaw) < attentionNeutralHeadAngle &&
      abs(headPitch) < attentionNeutralHeadAngle
    {
      attention += attentionNeutralHeadBonus / 100
    }
    if microSaccades { attention += attentionMicrosaccadeBonus / 100 }
    if blinksLast60s >= attentionBlinkFreqMin &&
      blinksLast60s <= attentionBlinkFreqMax
    {
      attention += attentionBlinkFreqBonus / 100
    }
    attention = min(1, max(0, attention))
    return Int((attention * 100).rounded())
  }

  // MARK: - Geometry helpers

  private func fuseGaze(
    leftOk: Bool,
    rightOk: Bool,
    leftScaledX: Float,
    leftScaledY: Float,
    rightScaledX: Float,
    rightScaledY: Float
  ) -> (Float, Float, String) {
    lock.lock()
    defer { lock.unlock() }
    if leftOk { appendSample(&leftGazeHistory, leftScaledX) }
    if rightOk { appendSample(&rightGazeHistory, rightScaledX) }
    let lN = leftGazeHistory.count
    let rN = rightGazeHistory.count
    let canPick =
      leftOk && rightOk && lN >= gazeDominanceMinSamples &&
      rN >= gazeDominanceMinSamples
    let leftVar = variance(leftGazeHistory)
    let rightVar = variance(rightGazeHistory)
    if leftOk && rightOk && canPick {
      if rightVar < leftVar {
        return (
          rightScaledX * 0.8 + leftScaledX * 0.2,
          rightScaledY * 0.8 + leftScaledY * 0.2,
          "right"
        )
      }
      return (
        leftScaledX * 0.8 + rightScaledX * 0.2,
        leftScaledY * 0.8 + rightScaledY * 0.2,
        "left"
      )
    }
    if leftOk && rightOk {
      return (
        (leftScaledX + rightScaledX) * 0.5,
        (leftScaledY + rightScaledY) * 0.5,
        "both"
      )
    }
    if rightOk { return (rightScaledX, rightScaledY, "right") }
    if leftOk { return (leftScaledX, leftScaledY, "left") }
    return (0, 0, "none")
  }

  private func appendSample(_ deque: inout [Float], _ value: Float) {
    deque.append(value)
    while deque.count > gazeDominanceMaxSamples {
      deque.removeFirst()
    }
  }

  private func variance(_ samples: [Float]) -> Double {
    let n = samples.count
    if n < 2 { return .infinity }
    let mean = samples.reduce(0, +) / Float(n)
    var acc = 0.0
    for v in samples {
      let d = Double(v - mean)
      acc += d * d
    }
    return acc / Double(n)
  }

  private func varianceGazeWindow(_ window: [(Int64, Float)]) -> Double {
    if window.count < 2 { return .infinity }
    return variance(window.map { $0.1 })
  }

  private func extractPoints(
    _ landmarks: [NormalizedLandmark],
    _ indices: [Int]
  ) -> [[String: Float]] {
    var out: [[String: Float]] = []
    for i in indices where i < landmarks.count {
      let lm = landmarks[i]
      out.append(["x": lm.x, "y": lm.y])
    }
    return out
  }

  private func pickEarSix(
    from contour: [[String: Float]],
    indices: [Int]
  ) -> [CGPoint] {
    guard indices.count == 6 else { return [] }
    var pts: [CGPoint] = []
    for idx in indices {
      guard idx < contour.count,
            let x = contour[idx]["x"],
            let y = contour[idx]["y"]
      else { return [] }
      pts.append(CGPoint(x: CGFloat(x), y: CGFloat(y)))
    }
    return pts
  }

  private func computeEAR(_ points: [CGPoint]) -> Float {
    guard points.count >= 6 else { return 0 }
    let h = dist(points[0], points[3])
    if h <= 1e-6 { return 0 }
    let num = dist(points[1], points[5]) + dist(points[2], points[4])
    return Float(num / (2 * h))
  }

  private func centroid(of maps: [[String: Float]]) -> CGPoint? {
    guard !maps.isEmpty else { return nil }
    var sx = 0.0
    var sy = 0.0
    var n = 0
    for m in maps {
      guard let x = m["x"], let y = m["y"] else { continue }
      sx += Double(x)
      sy += Double(y)
      n += 1
    }
    guard n > 0 else { return nil }
    return CGPoint(x: sx / Double(n), y: sy / Double(n))
  }

  private func eyeCornerDistance(_ eye: [[String: Float]]) -> Float? {
    guard eye.count > 8,
          let p0 = eye[0]["x"], let p0y = eye[0]["y"],
          let p8 = eye[8]["x"], let p8y = eye[8]["y"]
    else { return nil }
    let w = hypot(Double(p0 - p8), Double(p0y - p8y))
    if w <= 1e-9 { return nil }
    return Float(w)
  }

  private func gazeTriple(
    eye: CGPoint?,
    iris: CGPoint?,
    width: Float?
  ) -> (Float, Float, Float)? {
    guard let eye, let iris, let width, width > 1e-9 else { return nil }
    return (
      Float(iris.x - eye.x),
      Float(iris.y - eye.y),
      width
    )
  }

  private func headPoseFromNoseAndEyes(
    landmarks: [NormalizedLandmark],
    leftEye: CGPoint?,
    rightEye: CGPoint?
  ) -> (Float, Float, Bool)? {
    guard let leftEye, let rightEye, noseTipIndex < landmarks.count else {
      return nil
    }
    let midX = (leftEye.x + rightEye.x) * 0.5
    let midY = (leftEye.y + rightEye.y) * 0.5
    let iod = dist(leftEye, rightEye)
    if iod < 1e-6 { return nil }
    let nose = landmarks[noseTipIndex]
    let headYaw = Float((Double(nose.x) - midX) / iod)
    let headPitch = Float((Double(nose.y) - midY) / iod)
    let stable = abs(headYaw) < 0.7 && abs(headPitch) < 0.5
    return (headYaw, headPitch, stable)
  }

  private func applyDeadZone(_ v: Float) -> Float {
    abs(v) <= gazeDeadZone ? 0 : v
  }

  private func dist(_ a: CGPoint, _ b: CGPoint) -> Double {
    hypot(Double(a.x - b.x), Double(a.y - b.y))
  }
}

private extension Float {
  func clamped(_ lo: Float, _ hi: Float) -> Float {
    min(hi, max(lo, self))
  }
}
