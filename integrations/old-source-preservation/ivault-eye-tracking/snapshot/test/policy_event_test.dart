import 'package:eye_tracking_app/core/events/policy_event.dart';
import 'package:eye_tracking_app/core/system.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('PolicyEventWire matches §16 namespaced contract', () {
    expect(PolicyEventWire.versionCreated, 'policy.version.created');
    expect(PolicyEventWire.versionActivated, 'policy.version.activated');
  });

  test('PolicyDomain wire values match spec', () {
    expect(PolicyDomain.reward.wireValue, 'reward');
    expect(PolicyDomain.trust.wireValue, 'trust');
    expect(PolicyDomain.fraud.wireValue, 'fraud');
    expect(PolicyDomain.campaign.wireValue, 'campaign');
    expect(PolicyDomain.withdrawal.wireValue, 'withdrawal');
  });

  test('PolicyVersionCreatedEvent holds PolicyVersionCreatedPayload fields', () {
    const e = PolicyVersionCreatedEvent(
      policyVersion: 'policy-acme-v3',
      domain: PolicyDomain.reward,
      createdBy: 'admin-42',
      notes: 'Q2 rollout',
    );
    expect(e.policyVersion, 'policy-acme-v3');
    expect(e.domain, PolicyDomain.reward);
    expect(e.createdBy, 'admin-42');
    expect(e.notes, 'Q2 rollout');
  });

  test('PolicyVersionActivatedEvent holds PolicyVersionActivatedPayload fields', () {
    const e = PolicyVersionActivatedEvent(
      policyVersion: 'policy-acme-v3',
      domain: PolicyDomain.trust,
      activatedBy: 'admin-7',
      activatedAt: '2026-04-25T12:00:00.000Z',
    );
    expect(e.policyVersion, 'policy-acme-v3');
    expect(e.domain, PolicyDomain.trust);
    expect(e.activatedBy, 'admin-7');
    expect(e.activatedAt, '2026-04-25T12:00:00.000Z');
  });

  test('EventBus forwards policy events', () async {
    final bus = EventBus();
    final seen = <PolicyEvent>[];
    final sub = bus.policyEvents.listen(seen.add);

    bus.emit(
      const PolicyVersionCreatedEvent(
        policyVersion: 'pv1',
        domain: PolicyDomain.fraud,
        createdBy: 'svc-ledger',
      ),
    );

    await Future<void>.delayed(Duration.zero);
    expect(seen, hasLength(1));
    expect(seen.single, isA<PolicyVersionCreatedEvent>());
    await sub.cancel();
  });
}
