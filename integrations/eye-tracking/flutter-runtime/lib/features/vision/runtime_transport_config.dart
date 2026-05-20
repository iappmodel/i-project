/// Runtime switches for vision frame transport experiments.
///
/// Default values preserve the promoted JPEG full-frame path. See
/// `docs/technical/Y_PLANE_TRANSPORT_EXPERIMENT.md`.
library;

/// When `true` on Android, [CameraImage] YUV420 frames use experimental
/// Y-plane map transport instead of full-resolution JPEG encode.
///
/// Must remain `false` until device validation completes.
const bool useExperimentalYPlaneTransport = false;

/// Longest edge (px) for Y-plane extraction/downscale on the experimental path.
const int kExperimentalYPlaneMaxEdge = 512;
