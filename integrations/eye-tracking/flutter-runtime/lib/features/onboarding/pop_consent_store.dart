import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:path_provider/path_provider.dart';

/// Persists POP first-run consent + wizard completion (no biometrics).
final class PopConsentStore {
  PopConsentStore({
    File? persistenceFile,
    this.consentAccepted = false,
    this.wizardCompleted = false,
  }) : _file = persistenceFile;

  factory PopConsentStore.inMemory({
    bool consentAccepted = false,
    bool wizardCompleted = false,
  }) {
    return PopConsentStore(
      consentAccepted: consentAccepted,
      wizardCompleted: wizardCompleted,
    );
  }

  final File? _file;
  bool consentAccepted;
  bool wizardCompleted;
  bool _loaded = false;

  static const String kFileName = 'pop_onboarding.json';

  static Future<PopConsentStore> open() async {
    if (kIsWeb) {
      return PopConsentStore.inMemory();
    }
    try {
      final dir = await getApplicationDocumentsDirectory();
      final file = File('${dir.path}/$kFileName');
      final store = PopConsentStore(persistenceFile: file);
      await store.load();
      return store;
    } catch (_) {
      return PopConsentStore.inMemory();
    }
  }

  Future<void> load() async {
    if (_loaded) return;
    _loaded = true;
    final file = _file;
    if (file == null || !await file.exists()) return;
    try {
      final map = jsonDecode(await file.readAsString()) as Map<String, dynamic>;
      consentAccepted = map['consentAccepted'] == true;
      wizardCompleted = map['wizardCompleted'] == true;
    } catch (_) {}
  }

  Future<void> save() async {
    final file = _file;
    if (file == null) return;
    final payload = jsonEncode({
      'consentAccepted': consentAccepted,
      'wizardCompleted': wizardCompleted,
      'savedAtMs': DateTime.now().millisecondsSinceEpoch,
    });
    await file.writeAsString(payload);
  }

  Future<void> acceptConsent() async {
    consentAccepted = true;
    await save();
  }

  Future<void> markWizardCompleted() async {
    wizardCompleted = true;
    consentAccepted = true;
    await save();
  }
}
