class DigitalTwinState {
  // LOW-LEVEL PHYSIOLOGY
  double gazeStability;
  double blinkRate;
  double microSaccadeNoise;

  // COGNITIVE STATE
  double attentionDepth;
  double cognitiveLoad;
  double decisionLatency;

  // INTENT FIELD
  double hoverProbability;
  double selectProbability;
  double dwellProbability;

  // LEARNING MEMORY
  int sessionCount;
  double adaptationRate;

  DigitalTwinState({
    this.gazeStability = 0.5,
    this.blinkRate = 0.5,
    this.microSaccadeNoise = 0.5,
    this.attentionDepth = 0.5,
    this.cognitiveLoad = 0.5,
    this.decisionLatency = 0.5,
    this.hoverProbability = 0.0,
    this.selectProbability = 0.0,
    this.dwellProbability = 0.0,
    this.sessionCount = 0,
    this.adaptationRate = 0.1,
  });
}
