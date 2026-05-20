import 'package:eye_tracking_app/core/events/fraud_event.dart';
import 'package:eye_tracking_app/core/system.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('FraudFlagCreatedEvent holds catalog fields', () {
    const e = FraudFlagCreatedEvent(
      fraudFlagId: 'ff1',
      userId: 'u1',
      source: FraudFlagSource.trustEngine,
      signal: 'velocity_spike',
      severity: FraudSeverity.high,
      relatedEventIds: ['e1', 'e2'],
      policyVersion: 'policy-fraud-v1',
    );
    expect(e.fraudFlagId, 'ff1');
    expect(e.userId, 'u1');
    expect(e.source.wireValue, 'trust_engine');
    expect(e.signal, 'velocity_spike');
    expect(e.severity.wireValue, 'high');
    expect(e.relatedEventIds, ['e1', 'e2']);
    expect(e.policyVersion, 'policy-fraud-v1');
  });

  test('FraudCaseOpenedEvent holds catalog fields', () {
    const e = FraudCaseOpenedEvent(
      fraudCaseId: 'fc1',
      userId: 'u2',
      severity: FraudSeverity.critical,
      reason: 'multi_engine_correlation',
      relatedEventIds: ['a'],
    );
    expect(e.fraudCaseId, 'fc1');
    expect(e.reason, 'multi_engine_correlation');
    expect(e.severity, FraudSeverity.critical);
  });

  test('FraudCaseResolvedEvent holds catalog fields', () {
    const e = FraudCaseResolvedEvent(
      fraudCaseId: 'fc1',
      userId: 'u2',
      resolution: FraudCaseResolution.falsePositive,
      resolvedBy: FraudCaseResolvedBy.admin,
    );
    expect(e.resolution.wireValue, 'false_positive');
    expect(e.resolvedBy.wireValue, 'admin');
  });

  test('FraudEventWire names match §14', () {
    expect(FraudEventWire.flagCreated, 'fraud.flag.created');
    expect(FraudEventWire.caseOpened, 'fraud.case.opened');
    expect(FraudEventWire.caseResolved, 'fraud.case.resolved');
  });

  test('EventBus forwards fraud events', () async {
    final bus = EventBus();
    final seen = <FraudEvent>[];
    final sub = bus.fraudEvents.listen(seen.add);

    bus.emit(
      const FraudCaseResolvedEvent(
        fraudCaseId: 'fc',
        userId: 'u',
        resolution: FraudCaseResolution.confirmedFraud,
        resolvedBy: FraudCaseResolvedBy.system,
      ),
    );

    await Future<void>.delayed(Duration.zero);
    expect(seen, hasLength(1));
    expect(seen.single, isA<FraudCaseResolvedEvent>());
    await sub.cancel();
  });
}
