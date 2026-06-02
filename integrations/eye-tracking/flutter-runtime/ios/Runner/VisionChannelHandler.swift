import Flutter
import UIKit

/// `vision_channel` — same methods as Android `MainActivity.kt`.
enum VisionChannelHandler {
  static let channelName = "vision_channel"
  private static let methodProcessFrame = "processFrame"
  private static let methodCalibrateHeadPose = "calibrateHeadPose"

  static func register(with messenger: FlutterBinaryMessenger) {
    let channel = FlutterMethodChannel(
      name: channelName,
      binaryMessenger: messenger
    )
    VisionProcessor.shared.initLandmarker()
    channel.setMethodCallHandler { call, result in
      switch call.method {
      case methodCalibrateHeadPose:
        VisionProcessor.shared.requestHeadYawNeutralCalibration()
        result(nil)
      case methodProcessFrame:
        handleProcessFrame(call: call, result: result)
      default:
        result(FlutterMethodNotImplemented)
      }
    }
  }

  private static func handleProcessFrame(
    call: FlutterMethodCall,
    result: @escaping FlutterResult
  ) {
    let totalStart = DispatchTime.now().uptimeNanoseconds
    switch call.arguments {
    case let map as [String: Any]:
      processFrameMap(map, totalStart: totalStart, result: result)
    case let data as FlutterStandardTypedData:
      processJpegBytes(data.data, totalStart: totalStart, result: result)
    default:
      result(
        FlutterError(
          code: "INVALID_ARGUMENT",
          message: "processFrame expects Map (y8/jpeg) or legacy ByteArray (JPEG)",
          details: nil
        )
      )
    }
  }

  private static func processFrameMap(
    _ map: [String: Any],
    totalStart: UInt64,
    result: @escaping FlutterResult
  ) {
    let format = map["format"] as? String
    switch format {
    case "y8":
      guard let w = map["width"] as? NSNumber,
            let h = map["height"] as? NSNumber,
            let rowStride = map["rowStride"] as? NSNumber,
            let typed = map["bytes"] as? FlutterStandardTypedData
      else {
        result(successPayload(
          VisionProcessor.shared.emptyPayload(),
          decodeMs: 0,
          totalStart: totalStart
        ))
        return
      }
      let width = w.intValue
      let height = h.intValue
      let stride = rowStride.intValue
      let yBytes = typed.data
      if width <= 0 || height <= 0 || yBytes.count < width * height {
        result(successPayload(
          VisionProcessor.shared.emptyPayload(),
          decodeMs: 0,
          totalStart: totalStart
        ))
        return
      }
      let decodeStart = DispatchTime.now().uptimeNanoseconds
      guard let image = y8ToUIImage(
        yBytes: yBytes,
        width: width,
        height: height,
        rowStride: stride
      ) else {
        let decodeMs =
          Double(DispatchTime.now().uptimeNanoseconds - decodeStart) / 1_000_000
        result(successPayload(
          VisionProcessor.shared.emptyPayload(),
          decodeMs: decodeMs,
          totalStart: totalStart
        ))
        return
      }
      let decodeMs =
        Double(DispatchTime.now().uptimeNanoseconds - decodeStart) / 1_000_000
      var payload = VisionProcessor.shared.process(image)
      result(successPayload(payload, decodeMs: decodeMs, totalStart: totalStart))

    case "jpeg":
      guard let typed = map["bytes"] as? FlutterStandardTypedData else {
        result(
          FlutterError(
            code: "INVALID_ARGUMENT",
            message: "processFrame jpeg map missing bytes",
            details: nil
          )
        )
        return
      }
      processJpegBytes(typed.data, totalStart: totalStart, result: result)

    default:
      result(
        FlutterError(
          code: "INVALID_ARGUMENT",
          message: "processFrame map missing or unknown format: \(format ?? "nil")",
          details: nil
        )
      )
    }
  }

  private static func processJpegBytes(
    _ bytes: Data,
    totalStart: UInt64,
    result: @escaping FlutterResult
  ) {
    let decodeStart = DispatchTime.now().uptimeNanoseconds
    guard let image = UIImage(data: bytes), let cg = image.cgImage else {
      let decodeMs =
        Double(DispatchTime.now().uptimeNanoseconds - decodeStart) / 1_000_000
      result(successPayload(
        VisionProcessor.shared.emptyPayload(),
        decodeMs: decodeMs,
        totalStart: totalStart
      ))
      return
    }
    let decodeMs =
      Double(DispatchTime.now().uptimeNanoseconds - decodeStart) / 1_000_000
    var payload = VisionProcessor.shared.process(cgImage: cg, processStart: decodeStart)
    result(successPayload(payload, decodeMs: decodeMs, totalStart: totalStart))
  }

  private static func successPayload(
    _ payload: [String: Any],
    decodeMs: Double,
    totalStart: UInt64
  ) -> [String: Any] {
    var out = payload
    out["nativeDecodeMs"] = decodeMs
    out["nativeTotalMs"] =
      Double(DispatchTime.now().uptimeNanoseconds - totalStart) / 1_000_000
    return out
  }

  /// Luma Y plane → grayscale UIImage (matches Android Y8 → ARGB path).
  private static func y8ToUIImage(
    yBytes: Data,
    width: Int,
    height: Int,
    rowStride: Int
  ) -> UIImage? {
    let count = width * height
    var pixels = [UInt8](repeating: 255, count: count * 4)
    var out = 0
    if rowStride == width {
      for i in 0..<count {
        let lum = yBytes[i]
        pixels[out] = lum
        pixels[out + 1] = lum
        pixels[out + 2] = lum
        pixels[out + 3] = 255
        out += 4
      }
    } else {
      var y = 0
      while y < height {
        let rowBase = y * rowStride
        var x = 0
        while x < width {
          let lum = yBytes[rowBase + x]
          pixels[out] = lum
          pixels[out + 1] = lum
          pixels[out + 2] = lum
          pixels[out + 3] = 255
          out += 4
          x += 1
        }
        y += 1
      }
    }
    let data = Data(pixels)
    guard let provider = CGDataProvider(data: data as CFData) else { return nil }
    guard let cg = CGImage(
      width: width,
      height: height,
      bitsPerComponent: 8,
      bitsPerPixel: 32,
      bytesPerRow: width * 4,
      space: CGColorSpaceCreateDeviceRGB(),
      bitmapInfo: CGBitmapInfo(rawValue: CGImageAlphaInfo.premultipliedLast.rawValue),
      provider: provider,
      decode: nil,
      shouldInterpolate: false,
      intent: .defaultIntent
    ) else { return nil }
    return UIImage(cgImage: cg)
  }
}
