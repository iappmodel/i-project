import 'package:flutter/widgets.dart';

import 'remote_controller.dart';

/// Hosts [RemoteController] above [MaterialApp] so overlays can use routing context.
final class RemoteControlScope extends InheritedNotifier<RemoteController> {
  const RemoteControlScope({
    super.key,
    required RemoteController controller,
    required Widget child,
  }) : super(notifier: controller, child: child);

  static RemoteController of(BuildContext context, {bool listen = true}) {
    final scope = listen
        ? context.dependOnInheritedWidgetOfExactType<RemoteControlScope>()
        : context.getInheritedWidgetOfExactType<RemoteControlScope>();
    assert(scope != null, 'RemoteControlScope not found in ancestor tree');
    return scope!.notifier!;
  }
}
