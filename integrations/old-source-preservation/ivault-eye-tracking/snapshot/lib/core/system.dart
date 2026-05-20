import 'dart:async';

import 'events/admin_event.dart';
import 'events/blink_event.dart';
import 'events/campaign_event.dart';
import 'events/conversion_event.dart';
import 'events/device_event.dart';
import 'events/fraud_event.dart';
import 'events/gaze_event.dart';
import 'events/policy_event.dart';
import 'events/presence_event.dart';
import 'events/system_event.dart';
import 'events/trust_event.dart';
import 'events/voice_event.dart';
import 'events/wallet_event.dart';
import 'events/withdrawal_event.dart';

/// Application-wide event bus (broadcast).
class EventBus {
  final StreamController<Object> _bus = StreamController<Object>.broadcast();

  Stream<GazeEvent> get gazeEvents =>
      _bus.stream.where((e) => e is GazeEvent).cast<GazeEvent>();

  Stream<BlinkEvent> get blinkEvents =>
      _bus.stream.where((e) => e is BlinkEvent).cast<BlinkEvent>();

  Stream<VoiceEvent> get voiceEvents =>
      _bus.stream.where((e) => e is VoiceEvent).cast<VoiceEvent>();

  Stream<DeviceEvent> get deviceEvents =>
      _bus.stream.where((e) => e is DeviceEvent).cast<DeviceEvent>();

  Stream<WalletEvent> get walletEvents =>
      _bus.stream.where((e) => e is WalletEvent).cast<WalletEvent>();

  Stream<AdminEvent> get adminEvents =>
      _bus.stream.where((e) => e is AdminEvent).cast<AdminEvent>();

  Stream<TrustEvent> get trustEvents =>
      _bus.stream.where((e) => e is TrustEvent).cast<TrustEvent>();

  Stream<PolicyEvent> get policyEvents =>
      _bus.stream.where((e) => e is PolicyEvent).cast<PolicyEvent>();

  Stream<PresenceEvent> get presenceEvents =>
      _bus.stream.where((e) => e is PresenceEvent).cast<PresenceEvent>();

  Stream<WithdrawalEvent> get withdrawalEvents =>
      _bus.stream.where((e) => e is WithdrawalEvent).cast<WithdrawalEvent>();

  Stream<FraudEvent> get fraudEvents =>
      _bus.stream.where((e) => e is FraudEvent).cast<FraudEvent>();

  Stream<ConversionEvent> get conversionEvents =>
      _bus.stream.where((e) => e is ConversionEvent).cast<ConversionEvent>();

  Stream<CampaignEvent> get campaignEvents =>
      _bus.stream.where((e) => e is CampaignEvent).cast<CampaignEvent>();

  Stream<SystemEvent> get systemEvents =>
      _bus.stream.where((e) => e is SystemEvent).cast<SystemEvent>();

  /// All bus payloads (gaze, blink, voice, device, wallet, admin, trust, policy,
  /// presence, withdrawal, fraud, conversion, campaign, system) for unified listeners.
  Stream<Object> get stream => _bus.stream;

  void emit(Object event) {
    if (event is! GazeEvent &&
        event is! BlinkEvent &&
        event is! VoiceEvent &&
        event is! DeviceEvent &&
        event is! WalletEvent &&
        event is! AdminEvent &&
        event is! TrustEvent &&
        event is! PolicyEvent &&
        event is! PresenceEvent &&
        event is! WithdrawalEvent &&
        event is! FraudEvent &&
        event is! ConversionEvent &&
        event is! CampaignEvent &&
        event is! SystemEvent) {
      return;
    }
    if (!_bus.isClosed) {
      _bus.add(event);
    }
  }
}

/// Global hooks for cross-cutting concerns (logging, intent OS, analytics).
class System {
  System._();

  static final EventBus bus = EventBus();
}
