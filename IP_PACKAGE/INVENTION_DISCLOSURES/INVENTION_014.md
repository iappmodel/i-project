# INVENTION_014 — Multimodal Command Engine (Voice + Gaze Fusion)

**Inventor:** Marcelo Silva
**Category:** Patent
**Family:** Intent OS
**Date:** 2026-06-15

## Problem Solved

Gaze-only and voice-only interfaces each suffer critical limitations: gaze cannot safely express complex commands or distinguish between looking and intending, while voice cannot specify spatial targets on screen. Users of hands-free systems need a way to combine voice intent ("open that", "select", "scroll down") with gaze position (which element the user is looking at) to execute compound commands that neither modality could safely or precisely achieve alone.

## Current Industry Approach

Voice assistants (Siri, Alexa, Google Assistant) operate without spatial awareness—they cannot know where the user is looking. Eye-tracking accessibility tools (Tobii, EyeTech) operate without semantic understanding—they can only dwell-select whatever element is at the gaze point. Research papers describe multimodal fusion but implementations remain academic prototypes. No shipping consumer product fuses real-time voice intent classification with live gaze position to create compound commands that route through a safety-gated execution pipeline.

## How [ i ] Solves It

The [ i ] Multimodal Command Engine fuses two real-time signal streams: (1) a VoiceEngine that captures speech-to-text via platform STT, emits voice events on an event bus with confidence and finality metadata, and classifies intent keywords; and (2) gaze/blink/dwell signals from the eye-tracking pipeline. The `MultimodalCommandEngine` maintains a modal state machine (idle/command) that activates when voice input contains trigger keywords. In command mode, voice defines the action rule while gaze defines the spatial target—a blink while voice is active triggers a "blink_action" at the current gaze position, and dwell while voice is active triggers a "dwell_action." The `MultimodalFrameProcessor` orchestrates per-frame fusion by feeding voice text to both the VoiceEngine (for event bus emission) and the MultimodalCommandEngine (for rule activation), then processing blink/dwell/gaze/stability through both the multimodal engine and a ControlPipeline. This architecture ensures that voice alone cannot trigger actions (no spatial target) and gaze alone cannot trigger high-risk actions (no voice confirmation), creating a natural multimodal safety lock.

## System Description

The system consists of three cooperating components. The **VoiceEngine** wraps the platform's `SpeechToText` API, manages listening state, and emits `VoiceEvent` objects on the system `EventBus` with text, timestamp, confidence, and finality. It normalizes text to lowercase and maintains a `lastVoiceText` for polling. The **MultimodalCommandEngine** is a stateful processor that tracks the last voice input and the current mode (idle or command). Mode transitions are keyword-driven: "command" activates command mode, "exit" returns to idle. In command mode, the engine checks for blink or dwell coincidence with active voice context to trigger compound actions. These are routed to a `ControlPipeline` or command executor. The **MultimodalFrameProcessor** is the per-frame orchestrator that accepts all signals (blink, dwell, gaze offset, stability, voice text) and distributes them to the VoiceEngine, MultimodalCommandEngine, and ControlPipeline in a single synchronous frame cycle. The ControlPipeline receives processed stability, blink detection, and gaze position for lower-level control actions. All compound commands produced by this system are subject to the Autonomous Execution Kernel's gate chain before execution.

## Technical Components

- `integrations/eye-tracking/flutter-runtime/lib/core/commands/multimodal_command_engine.dart` — fusion engine + frame processor
- `integrations/eye-tracking/flutter-runtime/lib/core/commands/voice_engine.dart` — STT wrapper with event bus
- `integrations/eye-tracking/flutter-runtime/lib/core/events/voice_event.dart` — typed voice event
- `integrations/eye-tracking/flutter-runtime/lib/core/system.dart` — EventBus infrastructure
- `MultimodalCommandEngine` class — modal state machine (idle/command)
- `MultimodalFrameProcessor` class — per-frame signal orchestrator
- `VoiceEngine` class — STT lifecycle, event emission, text normalization
- `ControlPipeline` abstract class — stability/blink/gaze routing interface
- `SpeechToText` integration — platform speech recognition
- Voice event bus emission with confidence and finality metadata
- Modal trigger keywords ("command" → activate, "exit" → deactivate)
- Blink/dwell coincidence detection for compound command generation

## Data Flow

1. Platform STT recognizes speech and delivers text + confidence to VoiceEngine
2. VoiceEngine normalizes text and emits VoiceEvent on system EventBus
3. MultimodalFrameProcessor receives frame tick with: blink, dwell, gaze, stability, voice
4. Voice text forwarded to VoiceEngine.setVoice() for bus emission
5. Voice text forwarded to MultimodalCommandEngine.setVoice() for mode evaluation
6. If voice contains "command" → mode transitions to "command"
7. MultimodalCommandEngine.process() called with blink, dwell, context
8. If in command mode AND voice active AND blink → "blink_action" generated
9. If in command mode AND voice active AND dwell → "dwell_action" generated
10. Generated compound command routed to ControlPipeline / Execution Kernel
11. ControlPipeline also receives raw stability, blink, gaze for lower-level control
12. Execution Kernel evaluates compound command through full gate chain before execution

## User Flow

The user says "command" to enter command mode (visual indicator appears). They look at the desired UI element. They say "open" or "select" while blinking or dwelling on the target. The system fuses the voice intent with the gaze target to execute a precise compound command—e.g., "open [the element at gaze position]." The user says "exit" to return to normal mode. This enables complex interactions like "scroll down" (voice provides direction, gaze confirms target area), "close that" (voice provides action, gaze identifies which element), or "send to [person]" (voice provides action + parameter, gaze confirms selection).

## Economic Flow

1. Multimodal commands enable faster content navigation, increasing time available for attention-earning sessions
2. Voice+gaze confirmation for financial actions provides a natural second factor without disrupting flow
3. Compound commands reduce interaction time for marketplace transactions
4. Voice+gaze fusion enables premium interaction patterns (e.g., voice-driven content curation while eyes verify)
5. Multimodal verification earns higher confidence scores, qualifying for premium attention rewards
6. Accessibility enablement expands total addressable user base for the attention economy

## Fraud Prevention

- Voice alone cannot trigger actions (requires spatial gaze target)
- Gaze alone cannot trigger high-risk actions (requires voice confirmation via gate chain)
- Modal state machine prevents out-of-context command interpretation
- STT confidence metadata enables rejection of low-confidence voice input
- Keyword-based mode activation prevents accidental command interpretation of ambient speech
- All compound commands pass through the full Autonomous Execution Kernel gate chain
- Voice event bus with timestamps enables replay auditing of multimodal sequences
- "Exit" keyword ensures clean return to safe idle state

## Unique Elements

1. Real-time fusion of voice intent classification with live gaze position to produce compound commands that neither modality could achieve alone
2. Modal state machine architecture (idle/command) requiring explicit voice activation before gaze+voice commands are interpreted
3. Blink/dwell coincidence detection with active voice context as the triggering mechanism for compound action generation
4. Per-frame synchronous orchestration of voice, gaze, blink, dwell, and stability signals through a unified `MultimodalFrameProcessor`
5. Natural multimodal safety lock where voice provides intent and gaze provides target, preventing either modality from independently triggering consequential actions
6. Event bus architecture enabling decoupled voice event consumption by multiple subsystems (intent engine, command engine, audit log) from a single STT source
7. Integration with the Autonomous Execution Kernel gate chain ensuring all multimodal compound commands are still subject to governance and safety checks

## Potential Patent Claims

1. A method for multimodal command generation in a gaze-driven interface comprising: receiving continuous voice input and classifying intent keywords; receiving continuous gaze position, blink detection, and dwell status from an eye-tracking system; maintaining a modal state machine that activates compound command interpretation upon voice trigger; detecting temporal coincidence of voice intent with gaze-targeted blink or dwell events; and generating compound commands that specify both the intended action (from voice) and the spatial target (from gaze).

2. A system for voice-gaze fusion comprising: a voice engine wrapping platform speech-to-text and emitting typed events with confidence metadata on an event bus; a multimodal command engine maintaining modal state and detecting voice+gaze coincidence; a frame processor synchronously orchestrating voice, gaze, blink, dwell, and stability signals per frame; and a safety-gated execution path that evaluates generated compound commands before execution.

3. A computer-implemented method for hands-free interface control comprising: transitioning from an idle mode to a command mode upon detecting a voice activation keyword; in command mode, interpreting gaze-coincident blink events as compound commands where voice provides action semantics and gaze provides spatial targeting; routing said compound commands through a multi-gate safety evaluation; and returning to idle mode upon detecting a voice deactivation keyword.

4. A multimodal safety mechanism for autonomous interfaces comprising: requiring both voice intent AND gaze spatial targeting for the generation of any compound command; preventing voice-only commands from executing without a confirmed gaze target; preventing gaze-only interactions from triggering actions classified as requiring voice confirmation; and subjecting all generated compound commands to an ordered safety gate chain before execution.

## Potential Competitors

- Apple Siri + AssistiveTouch — voice and touch, no gaze fusion
- Google Assistant + Look to Speak — voice OR gaze, not fused compound commands
- Microsoft Gaze + Voice (research) — academic prototypes, not shipped consumer product
- Tobii Aware — gaze presence detection for voice assistants, not compound command fusion
- Amazon Alexa + Echo Show — voice + screen touch, no eye tracking
- Nuance Dragon + Eye Tracking (clinical) — dictation + gaze for AAC, not compound actions
- Meta Ray-Ban glasses — voice + camera AI, no gaze tracking for command fusion

## Related Files

- `integrations/eye-tracking/flutter-runtime/lib/core/commands/multimodal_command_engine.dart`
- `integrations/eye-tracking/flutter-runtime/lib/core/commands/voice_engine.dart`
- `integrations/eye-tracking/flutter-runtime/lib/core/events/voice_event.dart`
- `integrations/eye-tracking/flutter-runtime/lib/core/system.dart`
- `integrations/eye-tracking/flutter-runtime/lib/core/intent_os/autonomous_execution_kernel.dart`

## Scores

| Metric | Score (1-10) |
|--------|-------------|
| Priority | 8 |
| Patentability | 8 |
| Business Value | 8 |
