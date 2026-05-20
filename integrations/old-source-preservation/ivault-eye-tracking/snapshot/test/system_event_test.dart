import 'package:eye_tracking_app/core/events/system_event.dart';
import 'package:eye_tracking_app/core/system.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('SystemJobStartedEvent matches catalog payload', () {
    const e = SystemJobStartedEvent(
      jobId: 'j1',
      jobType: SystemJobType.fraudScan,
      startedAt: '2026-04-25T12:00:00Z',
    );
    expect(e.jobId, 'j1');
    expect(e.jobType, SystemJobType.fraudScan);
    expect(e.startedAt, '2026-04-25T12:00:00Z');
  });

  test('SystemJobType wire values match spec', () {
    expect(SystemJobType.rewardRelease.wireValue, 'reward_release');
    expect(
      SystemJobType.budgetReservationExpiry.wireValue,
      'budget_reservation_expiry',
    );
    expect(SystemJobType.campaignStatusSync.wireValue, 'campaign_status_sync');
  });

  test('SystemJobCompletedEvent uses string jobType', () {
    const e = SystemJobCompletedEvent(
      jobId: 'j1',
      jobType: 'fraud_scan',
      processedCount: 10,
      failedCount: 1,
      completedAt: '2026-04-25T12:05:00Z',
    );
    expect(e.processedCount, 10);
    expect(e.failedCount, 1);
    expect(e.jobType, 'fraud_scan');
  });

  test('SystemJobFailedEvent holds reason and retryable', () {
    const e = SystemJobFailedEvent(
      jobId: 'j1',
      jobType: 'wallet_projection',
      reason: 'timeout',
      retryable: true,
    );
    expect(e.reason, 'timeout');
    expect(e.retryable, isTrue);
  });

  test('SystemEventWire names', () {
    expect(SystemEventWire.jobStarted, 'system.job.started');
    expect(SystemEventWire.jobCompleted, 'system.job.completed');
    expect(SystemEventWire.jobFailed, 'system.job.failed');
  });

  test('EventBus forwards system events', () async {
    final bus = EventBus();
    final seen = <SystemEvent>[];
    final sub = bus.systemEvents.listen(seen.add);

    bus.emit(
      const SystemJobStartedEvent(
        jobId: 'j',
        jobType: SystemJobType.trustScoreRecompute,
        startedAt: 't0',
      ),
    );

    await Future<void>.delayed(Duration.zero);
    expect(seen, hasLength(1));
    expect(seen.single, isA<SystemJobStartedEvent>());
    await sub.cancel();
  });
}
