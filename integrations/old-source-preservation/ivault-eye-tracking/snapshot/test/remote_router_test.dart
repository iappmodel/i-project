import 'package:flutter_test/flutter_test.dart';

import 'package:eye_tracking_app/features/remote/remote_commands.dart';
import 'package:eye_tracking_app/features/remote/remote_policy.dart';
import 'package:eye_tracking_app/features/remote/remote_router.dart';
import 'package:eye_tracking_app/features/remote/remote_types.dart';

void main() {
  group('routeRemoteCommand', () {
    test('blocks gaze on withdraw', () {
      final cmd = commandFromType(
        RemoteCommandTypes.withdraw,
        RemoteSurface.wallet,
        inputSource: RemoteInputSource.gaze,
      )!;
      final policy = RemotePolicyContext();
      final limiter = RemoteRateLimiter(maxPerWindow: 100);
      final r = routeRemoteCommand(
        command: cmd,
        policy: policy,
        rateLimiter: limiter,
        remoteLockedFromState: false,
        strictConfirmations: true,
      );
      expect(r, isA<RemoteRouteBlocked>());
      final b = r as RemoteRouteBlocked;
      expect(b.reason, contains('gaze'));
    });

    test('low-risk next executes without confirmation', () {
      final cmd = commandFromType(
        RemoteCommandTypes.nextItem,
        RemoteSurface.feed,
      )!;
      final policy = RemotePolicyContext();
      final limiter = RemoteRateLimiter(maxPerWindow: 100);
      final r = routeRemoteCommand(
        command: cmd,
        policy: policy,
        rateLimiter: limiter,
        remoteLockedFromState: false,
        strictConfirmations: true,
      );
      expect(r, isA<RemoteRouteExecuted>());
    });

    test('blocks when remote locked', () {
      final cmd = commandFromType(
        RemoteCommandTypes.nextItem,
        RemoteSurface.feed,
      )!;
      final policy = RemotePolicyContext();
      final limiter = RemoteRateLimiter(maxPerWindow: 100);
      final r = routeRemoteCommand(
        command: cmd,
        policy: policy,
        rateLimiter: limiter,
        remoteLockedFromState: true,
        strictConfirmations: true,
      );
      expect(r, isA<RemoteRouteBlocked>());
    });
  });
}
