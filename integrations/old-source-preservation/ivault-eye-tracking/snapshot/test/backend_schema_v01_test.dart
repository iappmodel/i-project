import 'package:eye_tracking_app/canonical/backend_schema_v01.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('Step 3 domains: all catalog domains have at least one table', () {
    const expected = BackendSchemaDomainV01.values;
    final covered = BackendSchemaRegistryV01.domainsCovered;
    expect(covered, containsAll(expected));
    expect(covered.length, expected.length);
    expect(expected.length, 15);
  });

  test('collection names are unique', () {
    final names = BackendSchemaRegistryV01.tables.map((t) => t.collectionName).toList();
    expect(names.toSet().length, names.length);
  });

  test('money moves only through ledger + value lots + reservations (registry)', () {
    final moneyTables = BackendSchemaRegistryV01.tables
        .where((t) => t.moneyAdjacent)
        .map((t) => t.collectionName)
        .toSet();
    expect(moneyTables, contains('wallet_ledger_entry'));
    expect(moneyTables, contains('wallet_value_lot'));
    expect(moneyTables, contains('budget_reservation'));
    expect(moneyTables, isNot(contains('wallet_account')),
        reason: 'wallet_account must not be an authoritative balance store');
  });

  test('primary economy pipeline tables exist in registry', () {
    for (final name in BackendSchemaRegistryV01.primaryEconomyPipeline) {
      expect(
        BackendSchemaRegistryV01.tableByCollectionName(name),
        isNotNull,
        reason: 'missing $name',
      );
    }
  });

  test('event_log domain wires to event_log segment', () {
    expect(BackendSchemaDomainV01.eventLog.wireSegment, 'event_log');
  });
}
