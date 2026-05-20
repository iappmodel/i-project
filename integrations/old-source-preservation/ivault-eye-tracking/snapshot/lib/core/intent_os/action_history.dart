import 'autonomous_action.dart';

/// Append-only log of [AutonomousAction] with bounded size; [undoLast] drops the most recent entry.
final class ActionHistory {
  ActionHistory({this.maxEntries = 32});

  final int maxEntries;
  final List<AutonomousAction> _entries = [];

  void record(AutonomousAction a) {
    _entries.add(a);
    while (_entries.length > maxEntries) {
      _entries.removeAt(0);
    }
  }

  void undoLast() {
    if (_entries.isEmpty) return;
    _entries.removeLast();
  }

  int get length => _entries.length;

  /// Chronological order (oldest first).
  List<AutonomousAction> get entries => List.unmodifiable(_entries);
}
