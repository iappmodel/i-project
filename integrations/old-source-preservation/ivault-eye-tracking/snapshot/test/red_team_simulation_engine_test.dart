import 'package:eye_tracking_app/adversarial_layer.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('RedTeamSimulationEngine', () {
    test('builds full specialized attacker swarm', () {
      final engine = RedTeamSimulationEngine();
      final swarm = engine.buildInitialSwarm();

      expect(swarm, hasLength(5));
      expect(
        swarm.map((agent) => agent.type),
        containsAll(<RedTeamAgentType>{
          RedTeamAgentType.attentionSpoofing,
          RedTeamAgentType.economicExploit,
          RedTeamAgentType.collusionSwarm,
          RedTeamAgentType.withdrawalAttack,
          RedTeamAgentType.platformSpoofing,
        }),
      );
    });

    test('runs war loop in shadow mode and adapts policy', () {
      final engine = RedTeamSimulationEngine();
      final report = engine.runWarLoop(
        cycles: 4,
        initialAgents: engine.buildInitialSwarm(),
        initialPolicy: engine.initialPolicy(),
        mode: SimulationEnvironmentMode.shadow,
        surface: const SystemSurfaceState(
          watchVerifyStrength: 0.62,
          rewardIssuanceStrength: 0.58,
          walletGateStrength: 0.6,
          trustIntegrityStrength: 0.57,
          integrationIntegrityStrength: 0.55,
          liquidityResilience: 0.63,
        ),
      );

      expect(report.cycles, 4);
      expect(report.reports, hasLength(4));
      expect(report.reports.every((cycle) => cycle.environmentMode == SimulationEnvironmentMode.shadow), isTrue);
      expect(
        report.finalPolicy.anomalySensitivity,
        greaterThan(engine.initialPolicy().anomalySensitivity),
      );
    });

    test('gates live fire mode by confidence threshold', () {
      final engine = RedTeamSimulationEngine();
      final lowConfidence = engine.runWarLoop(
        cycles: 1,
        initialAgents: engine.buildInitialSwarm(),
        initialPolicy: engine.initialPolicy(),
        mode: SimulationEnvironmentMode.liveFire,
        liveFireConfidence: 0.4,
        surface: const SystemSurfaceState(
          watchVerifyStrength: 0.6,
          rewardIssuanceStrength: 0.6,
          walletGateStrength: 0.6,
          trustIntegrityStrength: 0.6,
          integrationIntegrityStrength: 0.6,
          liquidityResilience: 0.6,
        ),
      );
      final highConfidence = engine.runWarLoop(
        cycles: 1,
        initialAgents: engine.buildInitialSwarm(),
        initialPolicy: engine.initialPolicy(),
        mode: SimulationEnvironmentMode.liveFire,
        liveFireConfidence: 0.9,
        surface: const SystemSurfaceState(
          watchVerifyStrength: 0.6,
          rewardIssuanceStrength: 0.6,
          walletGateStrength: 0.6,
          trustIntegrityStrength: 0.6,
          integrationIntegrityStrength: 0.6,
          liquidityResilience: 0.6,
        ),
      );

      expect(
        lowConfidence.reports.first.environmentMode,
        SimulationEnvironmentMode.shadow,
      );
      expect(
        highConfidence.reports.first.environmentMode,
        SimulationEnvironmentMode.liveFire,
      );
    });
  });
}
