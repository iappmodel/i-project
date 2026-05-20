import type { AlphabetEvent } from "./event.types";

export type LearningSessionContext =
  | "iearn"
  | "school"
  | "creator_course"
  | "brand_training"
  | "self_study"
  | "tutoring";

export type LearningVerificationStatus =
  | "learned"
  | "partially_learned"
  | "knowledge_verified"
  | "failed"
  | "suspicious"
  | "incomplete";

export type LearningSessionStatus =
  | "started"
  | "lesson_completed"
  | "verified"
  | "partially_verified"
  | "knowledge_verified"
  | "failed"
  | "suspicious"
  | "expired";

export interface LearningSession {
  learningSessionId: string;
  userId: string;
  context: LearningSessionContext;
  lessonId: string;
  courseId?: string | null;
  creatorId?: string | null;
  schoolId?: string | null;
  requiredDurationMs: number;
  watchedDurationMs: number;
  status: LearningSessionStatus;
  ageBand: string;
  startedAt: string;
  completedAt?: string | null;
  updatedAt: string;
}

export interface LearningSignalInput {
  learningSessionId: string;
  userId: string;
  context: LearningSessionContext;
  requiredDurationMs: number;
  watchedDurationMs: number;
  attentionScore: number;
  focusScore: number;
  focusMultiplier: number;
  quizScore: number;
  quizQuestionCount: number;
  quizCorrectCount: number;
  recallScore: number;
  recallDelayHours: number;
  applicationScore: number;
  practiceCompletionScore: number;
  explanationQualityScore: number;
  cheatingRisk: number;
  aiAnswerRisk: number;
  answerCopyRisk: number;
  velocityRisk: number;
  deviceIntegrityScore: number;
  ageBand: string;
  metadata?: Record<string, unknown>;
}

export interface LearningRuleSet {
  context: LearningSessionContext;
  minWatchedRatio: number;
  minAttentionScore: number;
  minFocusScore: number;
  minQuizScore: number;
  minRecallScore: number;
  minApplicationScore: number;
  minPracticeCompletionScore: number;
  minLearningScore: number;
  minKnowledgeScore: number;
  minQualityScore: number;
  maxRiskScore: number;
  under13Allowed: boolean;
  teenAllowed: boolean;
  requiresGuardianOrSchoolForUnder13: boolean;
  active: boolean;
}

export interface LearningVerificationResult {
  learningSessionId: string;
  userId: string;
  status: LearningVerificationStatus;
  watchedRatio: number;
  learningScore: number;
  knowledgeScore: number;
  qualityScore: number;
  riskScore: number;
  reasons: string[];
  lessonCompletedEvent: AlphabetEvent;
  quizSubmittedEvent?: AlphabetEvent | null;
  learningEvent?: AlphabetEvent | null;
  knowledgeEvent?: AlphabetEvent | null;
  metadata: Record<string, unknown>;
}
