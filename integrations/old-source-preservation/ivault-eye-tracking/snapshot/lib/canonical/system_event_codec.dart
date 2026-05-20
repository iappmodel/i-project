// Persistence / transport codec for [SystemEventV01] (§4 canonical envelope).
//
// Dart-first backend: serialize to JSON maps for log replay, outbox tables, or
// HTTP intake without a second event catalog.

import 'build_spec_v01.dart';

/// True when [eventTypeRequiresIdempotencyKeyV01] mandates a dedupe key.
bool systemEventRequiresIdempotencyKey(SystemEventV01 e) =>
    eventTypeRequiresIdempotencyKeyV01(e.eventType);

/// Validates idempotency rules for §19; returns null if ok, else error message.
String? validateSystemEventIdempotency(SystemEventV01 e) {
  if (systemEventRequiresIdempotencyKey(e)) {
    final k = e.idempotencyKey;
    if (k == null || k.trim().isEmpty) {
      return 'idempotencyKey required for eventType=${e.eventType}';
    }
  }
  return null;
}

Map<String, Object?> systemEventV01ToJson(SystemEventV01 e) {
  return <String, Object?>{
    'eventId': e.eventId,
    'eventType': e.eventType,
    'eventVersion': e.eventVersion,
    'actorType': e.actorType.wireName,
    'actorId': e.actorId,
    'subjectType': e.subjectType.wireName,
    'subjectId': e.subjectId,
    'userId': e.userId,
    'campaignId': e.campaignId,
    'sessionId': e.sessionId,
    'payload': e.payload,
    'policyVersion': e.policyVersion,
    'idempotencyKey': e.idempotencyKey,
    'correlationId': e.correlationId,
    'causationId': e.causationId,
    'modelVersion': e.modelVersion,
    'createdAt': e.createdAt,
  };
}

CanonicalActorTypeV01? _actorFromWire(String? w) {
  if (w == null) return null;
  for (final v in CanonicalActorTypeV01.values) {
    if (v.wireName == w) return v;
  }
  return null;
}

SystemEventV01? systemEventV01FromJson(Map<String, Object?> m) {
  final eventId = m['eventId'] as String?;
  final eventType = m['eventType'] as String?;
  final actorId = m['actorId'] as String?;
  final subjectId = m['subjectId'] as String?;
  final createdAt = m['createdAt'] as String?;
  final actorType = _actorFromWire(m['actorType'] as String?);
  final subjectType = canonicalSubjectTypeV01FromWire(
    m['subjectType'] as String? ?? '',
  );
  if (eventId == null ||
      eventType == null ||
      actorId == null ||
      subjectId == null ||
      createdAt == null ||
      actorType == null ||
      subjectType == null) {
    return null;
  }
  final payload = m['payload'];
  return SystemEventV01(
    eventId: eventId,
    eventType: eventType,
    eventVersion: (m['eventVersion'] as num?)?.toInt() ?? 1,
    actorType: actorType,
    actorId: actorId,
    subjectType: subjectType,
    subjectId: subjectId,
    userId: m['userId'] as String?,
    campaignId: m['campaignId'] as String?,
    sessionId: m['sessionId'] as String?,
    payload: payload is Map
        ? Map<String, Object?>.from(payload as Map)
        : const <String, Object?>{},
    policyVersion: m['policyVersion'] as String?,
    idempotencyKey: m['idempotencyKey'] as String?,
    correlationId: m['correlationId'] as String?,
    causationId: m['causationId'] as String?,
    modelVersion: m['modelVersion'] as String?,
    createdAt: createdAt,
  );
}
