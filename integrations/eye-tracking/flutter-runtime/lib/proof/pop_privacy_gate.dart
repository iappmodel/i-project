/// POP proof packet privacy gate — blocks biometric leakage (Stage 9).
library;

const Set<String> kForbiddenProofJsonKeys = {
  'landmarks',
  'fullLandmarks',
  'mesh',
  'yPlane',
  'y8',
  'jpegBytes',
  'frameBytes',
  'rawGazeStream',
  'cameraFrame',
  'bitmap',
};

/// Depth-first search for forbidden keys in nested JSON-like maps.
List<String> findForbiddenProofKeys(
  Object? value, {
  String path = r'$',
}) {
  final hits = <String>[];
  if (value is Map) {
    for (final entry in value.entries) {
      final key = entry.key.toString();
      final childPath = '$path.$key';
      if (kForbiddenProofJsonKeys.contains(key)) {
        hits.add(childPath);
      }
      hits.addAll(findForbiddenProofKeys(entry.value, path: childPath));
    }
  } else if (value is List) {
    for (var i = 0; i < value.length; i++) {
      hits.addAll(findForbiddenProofKeys(value[i], path: '$path[$i]'));
    }
  }
  return hits;
}

bool proofJsonPassesPrivacyGate(Map<String, dynamic> json) =>
    findForbiddenProofKeys(json).isEmpty;
