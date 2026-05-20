import 'package:eye_tracking_app/core/events/fraud_event.dart';
import 'package:eye_tracking_app/core/events/trust_event.dart';
import 'package:eye_tracking_app/core/events/wallet_event.dart';
import 'package:eye_tracking_app/core/system.dart';

/// Single entry point for emitting **money-adjacent** events on [EventBus].
///
/// Rule 22 (AGENTS.md): UI and client ingestion must not call [EventBus.emit]
/// with [WalletEvent], [TrustEvent], or [FraudEvent]. System / settlement /
/// workers use this type so economics emissions stay auditable and grep-friendly.
final class SystemEconomicsBroadcaster {
  SystemEconomicsBroadcaster(this._bus);

  final EventBus _bus;

  void emitWallet(WalletEvent event) => _bus.emit(event);

  void emitTrust(TrustEvent event) => _bus.emit(event);

  void emitFraud(FraudEvent event) => _bus.emit(event);
}
