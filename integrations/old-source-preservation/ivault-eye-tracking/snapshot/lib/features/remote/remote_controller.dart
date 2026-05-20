import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'remote_commands.dart';
import 'remote_events.dart';
import 'remote_policy.dart';
import 'remote_router.dart';
import 'remote_types.dart';

typedef RemoteCommandHandler = Future<void> Function(
  RemoteCommand command,
  RemotePolicyContext policy,
);

const String _kPrefsOrbKey = 'iremote_orb_position_v1';

/// Central state + dispatch for iRemote (replaces TS RemoteProvider).
final class RemoteController extends ChangeNotifier {
  RemoteControlState _state = const RemoteControlState(
    surface: RemoteSurface.feed,
  );
  RemotePreferences _preferences = const RemotePreferences();
  final RemotePolicyContext policy = RemotePolicyContext();
  final RemoteRateLimiter rateLimiter = RemoteRateLimiter();
  final List<RemoteEventEntry> _log = [];

  final Map<String, RemoteCommandHandler> _handlers = {};

  RemoteCommand? _pendingConfirmation;

  RemoteControlState get remoteState => _state;
  RemotePreferences get preferences => _preferences;
  List<RemoteEventEntry> get eventLog => List.unmodifiable(_log);
  RemoteCommand? get pendingConfirmation => _pendingConfirmation;

  static const int maxLogEntries = 100;

  Future<void> loadPersistedPosition() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_kPrefsOrbKey);
      if (raw == null || raw.isEmpty) return;
      final parts = raw.split('|');
      if (parts.length >= 2) {
        final x = double.tryParse(parts[0]) ?? 0.88;
        final y = double.tryParse(parts[1]) ?? 0.78;
        final anchor = parts.length > 2
            ? RemoteAnchor.values.firstWhere(
                (e) => e.name == parts[2],
                orElse: () => RemoteAnchor.bottomRight,
              )
            : RemoteAnchor.bottomRight;
        _state = _state.copyWith(
          position: RemotePosition(x: x, y: y, anchor: anchor),
        );
        notifyListeners();
      }
    } catch (e, st) {
      debugPrint('iRemote loadPersistedPosition: $e\n$st');
    }
  }

  Future<void> _savePosition(RemotePosition p) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(
        _kPrefsOrbKey,
        '${p.x}|${p.y}|${p.anchor.name}',
      );
    } catch (e, st) {
      debugPrint('iRemote _savePosition: $e\n$st');
    }
  }

  void _pushLog(RemoteEventEntry e) {
    _log.add(e);
    if (_log.length > maxLogEntries) {
      _log.removeRange(0, _log.length - maxLogEntries);
    }
    notifyListeners();
  }

  void registerRemoteHandlers(Map<String, RemoteCommandHandler> handlers) {
    _handlers.addAll(handlers);
    notifyListeners();
  }

  void clearHandlers() {
    _handlers.clear();
    notifyListeners();
  }

  void setRemoteSurface(RemoteSurface surface) {
    _state = _state.copyWith(surface: surface);
    _pushLog(
      RemoteEventEntry(
        type: RemoteEventTypes.closed,
        at: DateTime.now(),
        detail: 'surface→${surface.name}',
      ),
    );
    notifyListeners();
  }

  void setInputSource(RemoteInputSource source) {
    _state = _state.copyWith(inputSource: source);
    notifyListeners();
  }

  void setActiveContext({
    String? contentId,
    String? offerId,
    String? campaignId,
    String? walletActionId,
    bool clear = false,
  }) {
    _state = _state.copyWith(
      activeContentId: contentId,
      activeOfferId: offerId,
      activeCampaignId: campaignId,
      activeWalletActionId: walletActionId,
      clearActiveContentId: clear && contentId == null,
      clearActiveOfferId: clear && offerId == null,
      clearActiveCampaignId: clear && campaignId == null,
      clearActiveWalletActionId: clear && walletActionId == null,
    );
    notifyListeners();
  }

  void openRemote([RemoteMode mode = RemoteMode.quick]) {
    _state = _state.copyWith(mode: mode);
    _pushLog(
      RemoteEventEntry(type: RemoteEventTypes.opened, at: DateTime.now()),
    );
    notifyListeners();
  }

  void closeRemote() {
    _state = _state.copyWith(mode: RemoteMode.collapsed);
    _pendingConfirmation = null;
    _pushLog(
      RemoteEventEntry(type: RemoteEventTypes.closed, at: DateTime.now()),
    );
    notifyListeners();
  }

  void setRemoteMode(RemoteMode mode) {
    _state = _state.copyWith(mode: mode);
    notifyListeners();
  }

  void lockRemote() {
    _state = _state.copyWith(
      isLocked: true,
      mode: RemoteMode.locked,
      orbVisual: RemoteOrbVisualState.locked,
    );
    _pushLog(
      RemoteEventEntry(type: RemoteEventTypes.locked, at: DateTime.now()),
    );
    notifyListeners();
  }

  void unlockRemote() {
    _state = _state.copyWith(
      isLocked: false,
      mode: RemoteMode.collapsed,
      orbVisual: RemoteOrbVisualState.idle,
    );
    _pushLog(
      RemoteEventEntry(type: RemoteEventTypes.unlocked, at: DateTime.now()),
    );
    notifyListeners();
  }

  void setOrbVisual(RemoteOrbVisualState v) {
    _state = _state.copyWith(orbVisual: v);
    notifyListeners();
  }

  void setOrbDragging(bool dragging) {
    _state = _state.copyWith(isDragging: dragging);
    notifyListeners();
  }

  void updateOrbPosition(RemotePosition p, {bool persist = true}) {
    _state = _state.copyWith(position: p);
    if (persist) {
      unawaited(_savePosition(p));
    }
    _pushLog(
      RemoteEventEntry(type: RemoteEventTypes.moved, at: DateTime.now()),
    );
    notifyListeners();
  }

  void updatePreferences(RemotePreferences p) {
    _preferences = p;
    _state = _state.copyWith(
      reducedMotion: p.reducedMotion,
      strictConfirmations: p.strictConfirmations,
    );
    notifyListeners();
  }

  /// Demo toggles for policy-driven blocks (MVP).
  void mutatePolicy(void Function(RemotePolicyContext) fn) {
    fn(policy);
    notifyListeners();
  }

  /// Primary entry: routes then executes or defers confirmation.
  RemoteRouteResult dispatchRemoteCommand(
    RemoteCommand command, {
    bool skipConfirmation = false,
  }) {
    _pushLog(
      RemoteEventEntry(
        type: RemoteEventTypes.commandRequested,
        at: DateTime.now(),
        commandType: command.type,
      ),
    );

    final result = routeRemoteCommand(
      command: command,
      policy: policy,
      rateLimiter: rateLimiter,
      remoteLockedFromState: _state.isLocked,
      strictConfirmations: _state.strictConfirmations && !skipConfirmation,
    );

    if (result is RemoteRouteBlocked) {
      _pushLog(
        RemoteEventEntry(
          type: RemoteEventTypes.commandBlocked,
          at: DateTime.now(),
          commandType: command.type,
          detail: result.reason,
        ),
      );
    } else if (result is RemoteRouteRateLimited) {
      _pushLog(
        RemoteEventEntry(
          type: RemoteEventTypes.commandRateLimited,
          at: DateTime.now(),
          commandType: command.type,
          detail: result.reason,
        ),
      );
    } else if (result is RemoteRouteConfirmationRequired) {
      _pendingConfirmation = result.command;
      _pushLog(
        RemoteEventEntry(
          type: RemoteEventTypes.commandConfirmationRequired,
          at: DateTime.now(),
          commandType: command.type,
          detail: result.confirmationCopy,
        ),
      );
    } else if (result is RemoteRouteExecuted) {
      _pendingConfirmation = null;
      rateLimiter.record(result.command.type);
      _runBuiltInCommand(result.command);
      unawaited(_invokeHandler(result.command));
      _state = _state.copyWith(
        lastCommand: result.command.type,
        lastCommandAt: DateTime.now(),
      );
      _pushLog(
        RemoteEventEntry(
          type: RemoteEventTypes.commandExecuted,
          at: DateTime.now(),
          commandType: result.command.type,
        ),
      );
    } else if (result is RemoteRouteIgnored) {
      _pushLog(
        RemoteEventEntry(
          type: RemoteEventTypes.commandBlocked,
          at: DateTime.now(),
          commandType: command.type,
          detail: result.reason,
        ),
      );
    }
    notifyListeners();
    return result;
  }

  void _runBuiltInCommand(RemoteCommand command) {
    switch (command.type) {
      case RemoteCommandTypes.lockRemote:
        if (!_state.isLocked) {
          _state = _state.copyWith(
            isLocked: true,
            mode: RemoteMode.locked,
            orbVisual: RemoteOrbVisualState.locked,
          );
          _pushLog(
            RemoteEventEntry(type: RemoteEventTypes.locked, at: DateTime.now()),
          );
        }
      case RemoteCommandTypes.unlockRemote:
        if (_state.isLocked) {
          _state = _state.copyWith(
            isLocked: false,
            mode: RemoteMode.collapsed,
            orbVisual: RemoteOrbVisualState.idle,
          );
          _pushLog(
            RemoteEventEntry(
              type: RemoteEventTypes.unlocked,
              at: DateTime.now(),
            ),
          );
        }
      case RemoteCommandTypes.emergencyStop:
        rateLimiter.reset();
        _pendingConfirmation = null;
        _state = _state.copyWith(
          isLocked: true,
          mode: RemoteMode.locked,
          orbVisual: RemoteOrbVisualState.danger,
        );
        _pushLog(
          RemoteEventEntry(
            type: RemoteEventTypes.emergencyStop,
            at: DateTime.now(),
          ),
        );
      case RemoteCommandTypes.openCommandCenter:
        _state = _state.copyWith(mode: RemoteMode.commandCenter);
      case RemoteCommandTypes.openRemoteSettings:
        _state = _state.copyWith(mode: RemoteMode.expanded);
      default:
        break;
    }
  }

  void confirmPendingCommand() {
    final c = _pendingConfirmation;
    if (c == null) return;
    _pendingConfirmation = null;
    _pushLog(
      RemoteEventEntry(
        type: RemoteEventTypes.commandConfirmed,
        at: DateTime.now(),
        commandType: c.type,
      ),
    );
    rateLimiter.record(c.type);
    _runBuiltInCommand(c);
    unawaited(_invokeHandler(c));
    _state = _state.copyWith(lastCommand: c.type, lastCommandAt: DateTime.now());
    _pushLog(
      RemoteEventEntry(
        type: RemoteEventTypes.commandExecuted,
        at: DateTime.now(),
        commandType: c.type,
      ),
    );
    notifyListeners();
  }

  void cancelPendingCommand() {
    _pendingConfirmation = null;
    notifyListeners();
  }

  Future<void> _invokeHandler(RemoteCommand command) async {
    final h = _handlers[command.type];
    if (h != null) {
      await h(command, policy);
    }
  }
}

void unawaited(Future<void> f) {
  f.catchError((Object e, StackTrace st) {
    debugPrint('iRemote handler error: $e\n$st');
  });
}
