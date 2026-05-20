import 'package:eye_tracking_app/canonical/canonical.dart';
import 'package:eye_tracking_app/core/events/wallet_event.dart';
import 'package:eye_tracking_app/core/system.dart';
import 'package:eye_tracking_app/core/system_economics_broadcaster.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('ClientAttentionIngestAllowlistV01', () {
    test('matches canonical attention wire constants', () {
      expect(
        ClientAttentionIngestAllowlistV01.eventTypes,
        equals({
          CanonicalAttentionEventTypesV01.sessionStarted,
          CanonicalAttentionEventTypesV01.sessionCompleted,
          CanonicalAttentionEventTypesV01.sessionAbandoned,
          CanonicalAttentionEventTypesV01.runtimeSignalSampled,
        }),
      );
    });
  });

  group('validateClientAttentionIngestEventType', () {
    test('accepts each allowlisted type', () {
      for (final t in ClientAttentionIngestAllowlistV01.eventTypes) {
        final r = validateClientAttentionIngestEventType(t);
        expect(r, isA<ClientAttentionIngestAcceptedV01>(), reason: t);
      }
    });

    test('rejects empty and whitespace-only', () {
      expect(
        validateClientAttentionIngestEventType(''),
        isA<ClientAttentionIngestRejectedV01>()
            .having((e) => e.code, 'code', 'empty'),
      );
      expect(
        validateClientAttentionIngestEventType('   '),
        isA<ClientAttentionIngestRejectedV01>().having((e) => e.code, 'code', 'empty'),
      );
    });

    test('rejects server-owned economics types with code server_owned', () {
      const serverSamples = <String>[
        'attention.verification.created',
        'attention.verification.rejected',
        'reward.decision.approved',
        'reward.decision.rejected',
        'reward.decision.held',
        'budget.reservation.created',
        'wallet.value_lot.created',
        'wallet.ledger_entry.created',
        'trust.score.updated',
        'fraud.flag.created',
      ];
      for (final t in serverSamples) {
        final r = validateClientAttentionIngestEventType(t);
        expect(r, isA<ClientAttentionIngestRejectedV01>(), reason: t);
        expect((r as ClientAttentionIngestRejectedV01).code, 'server_owned');
        expect(r.wireType, t);
      }
    });

    test('rejects unknown types as not_allowlisted', () {
      final r = validateClientAttentionIngestEventType('attention.fake.client');
      expect(r, isA<ClientAttentionIngestRejectedV01>());
      expect((r as ClientAttentionIngestRejectedV01).code, 'not_allowlisted');
    });
  });

  group('ServerOwnedEconomicsEventTypesV01', () {
    test('disjoint from client attention allowlist', () {
      final overlap = ClientAttentionIngestAllowlistV01.eventTypes
          .intersection(ServerOwnedEconomicsEventTypesV01.eventTypes);
      expect(overlap, isEmpty);
    });

    test('contains MVP backend types except client-ingestible attention', () {
      for (final e in MvpBackendEventSetV01.eventTypes) {
        if (ClientAttentionIngestAllowlistV01.eventTypes.contains(e)) {
          expect(
            ServerOwnedEconomicsEventTypesV01.eventTypes.contains(e),
            isFalse,
            reason: 'client-allowlisted must not be in server-owned set: $e',
          );
        } else {
          expect(
            ServerOwnedEconomicsEventTypesV01.eventTypes.contains(e),
            isTrue,
            reason: 'MVP server type should be classified server-owned: $e',
          );
        }
      }
    });
  });

  group('SystemEconomicsBroadcaster', () {
    test('forwards wallet event to EventBus', () async {
      final bus = EventBus();
      final future = bus.walletEvents.first;
      final broadcaster = SystemEconomicsBroadcaster(bus);
      broadcaster.emitWallet(
        const WalletValueLotCreatedEvent(
          valueLotId: 'lot-test',
          userId: 'user-test',
          sourceType: WalletValueLotSourceType.campaignReward,
          sourceId: 'dec-test',
          originalAmount: 1.0,
          currency: WalletCurrency.usd,
          initialState: WalletValueLotInitialState.pending,
          trustScoreAtCreation: 0.5,
          fraudRiskAtCreation: 0.05,
        ),
      );
      final e = await future;
      expect(e, isA<WalletValueLotCreatedEvent>());
    });
  });
}
