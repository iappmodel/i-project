import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:path_provider/path_provider.dart';

import 'adaptive_calibration_profile.dart';

/// Local JSON persistence for [AdaptiveCalibrationProfile] (bounds + drift only).
final class CalibrationProfileStore {
  CalibrationProfileStore({
    File? persistenceFile,
    AdaptiveCalibrationProfile? initial,
  })  : _file = persistenceFile,
        profile = initial ?? AdaptiveCalibrationProfile();

  factory CalibrationProfileStore.inMemory({
    AdaptiveCalibrationProfile? initial,
  }) {
    return CalibrationProfileStore._(
      persistenceFile: null,
      initial: initial ?? AdaptiveCalibrationProfile(),
    );
  }

  CalibrationProfileStore._({
    File? persistenceFile,
    required AdaptiveCalibrationProfile initial,
  })  : _file = persistenceFile,
        profile = initial;

  final File? _file;
  AdaptiveCalibrationProfile profile;
  bool _loaded = false;

  static const String kProfileFileName = 'calibration_profile.json';

  /// Resolves app-documents file when no explicit [persistenceFile] was injected.
  static Future<CalibrationProfileStore> open() async {
    if (kIsWeb) {
      return CalibrationProfileStore.inMemory();
    }
    try {
      final dir = await getApplicationDocumentsDirectory();
      final file = File('${dir.path}/$kProfileFileName');
      final store = CalibrationProfileStore(persistenceFile: file);
      await store.load();
      return store;
    } catch (_) {
      return CalibrationProfileStore.inMemory();
    }
  }

  Future<void> load() async {
    if (_loaded) return;
    _loaded = true;
    final file = _file;
    if (file == null || !await file.exists()) return;
    try {
      final raw = await file.readAsString();
      profile = AdaptiveCalibrationProfile.fromJsonString(raw);
    } catch (_) {
      profile = AdaptiveCalibrationProfile();
    }
  }

  Future<void> save({bool foldLongTerm = false}) async {
    if (foldLongTerm) {
      profile = profile.foldSessionToLongTerm();
    }
    final file = _file;
    if (file == null) return;
    try {
      await file.parent.create(recursive: true);
      await file.writeAsString(profile.toJsonString());
    } catch (_) {
      // Non-fatal: in-memory profile still drives zone path.
    }
  }

  void replace(AdaptiveCalibrationProfile next) {
    profile = next;
  }
}
