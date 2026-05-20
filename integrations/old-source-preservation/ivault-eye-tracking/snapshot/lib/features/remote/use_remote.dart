import 'package:flutter/widgets.dart';

import 'remote_controller.dart';
import 'remote_router.dart';
import 'remote_scope.dart';
import 'remote_types.dart';

/// Typed access to iRemote (spec `useRemote()`).
extension UseRemote on BuildContext {
  RemoteController get remote => RemoteControlScope.of(this);

  RemoteControlState get remoteState => RemoteControlScope.of(this).remoteState;

  void setRemoteSurface(RemoteSurface surface) =>
      RemoteControlScope.of(this).setRemoteSurface(surface);

  void openRemote([RemoteMode mode = RemoteMode.quick]) =>
      RemoteControlScope.of(this).openRemote(mode);

  void closeRemote() => RemoteControlScope.of(this).closeRemote();

  void lockRemote() => RemoteControlScope.of(this).lockRemote();

  void unlockRemote() => RemoteControlScope.of(this).unlockRemote();

  RemoteRouteResult dispatchRemoteCommand(
    RemoteCommand command, {
    bool skipConfirmation = false,
  }) =>
      RemoteControlScope.of(this).dispatchRemoteCommand(
        command,
        skipConfirmation: skipConfirmation,
      );

  void registerRemoteHandlers(Map<String, RemoteCommandHandler> handlers) =>
      RemoteControlScope.of(this).registerRemoteHandlers(handlers);
}
