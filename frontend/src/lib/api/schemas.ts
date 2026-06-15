import { z } from 'zod';

const ProgressSchema = z.object({
  status: z.enum(['Unsolved', 'Attempted', 'Solved']).default('Unsolved'),
  dateSolved: z.string().nullable().optional(),
  confidenceLevel: z.number().min(1).max(5).nullable().optional(),
  nextRevisionDate: z.string().nullable().optional(),
  revise: z.boolean().default(false),
  attempts: z.number().default(0),
  timeSpent: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
  tags: z.array(z.string()).default([]),
  pattern: z.string().nullable().optional(),
  solutionLink: z.string().nullable().optional(),
  important: z.boolean().default(false),
});

const QuestionSchema = z.object({
  id: z.string(),
  platformId: z.string().or(z.number()).nullable().optional(),
  platform: z.string().nullable().optional(),
  title: z.string(),
  difficulty: z.string(),
  url: z.string(),
  companies: z.array(z.string()).default([]),
  acceptanceRate: z.number().nullable().optional(),
  frequency: z.number().nullable().optional(),
  isCustom: z.boolean().optional(),
  type: z.string().optional(),
  commentsCount: z.number().optional(),
  progress: ProgressSchema.optional(),
});

export const QuestionsResponseSchema = z.object({
  data: z.array(QuestionSchema),
  totalCount: z.number(),
  page: z.number(),
  totalPages: z.number(),
});

export const AnalyticsSchema = z.object({
  totalSolved: z.number().default(0),
  totalAttempted: z.number().default(0),
  totalRevise: z.number().default(0),
  completionPercent: z.string().default('0.0'),
  difficultyBreakdown: z.record(z.number()).default({ Easy: 0, Medium: 0, Hard: 0 }),
  platformsBreakdown: z.array(z.object({ name: z.string(), count: z.number() }).passthrough()).default([]),
  confidenceVsDifficulty: z.array(z.object({ name: z.string() }).passthrough()).default([]),
  problemsSolvedOverTime: z.array(z.object({ date: z.string(), count: z.number() }).passthrough()).default([]),
  timePerDifficulty: z.array(z.object({ name: z.string(), avgMinutes: z.number() }).passthrough()).default([]),
  patternMasteryData: z.array(z.object({ name: z.string(), mastered: z.number(), total: z.number() }).passthrough()).default([]),
  patternUsageFrequency: z.array(z.object({ name: z.string(), count: z.number() }).passthrough()).default([]),
  tagsFrequency: z.array(z.object({ name: z.string(), count: z.number() }).passthrough()).default([]),
  confidenceToProblemCount: z.array(z.object({ name: z.string(), count: z.number() }).passthrough()).default([]),
  patternsMostRevised: z.array(z.object({ name: z.string(), count: z.number() }).passthrough()).default([]),
  activityTimeline: z.array(z.any()).default([]), // Keep any for raw object map if it's used as such
  currentStreak: z.number().default(0),
  sdDailyCount: z.number().default(0),
  sdWeeklyCount: z.number().default(0),
});

export const CommentSchema = z.object({
  id: z.string(),
  question_id: z.string(),
  content: z.string(),
  created_at: z.string(),
  questionTitle: z.string().optional(),
  questionDifficulty: z.string().optional(),
  questionUrl: z.string().optional(),
  platformId: z.string().optional(),
  questionType: z.string().optional()
});

export const PlatformSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional()
});

export const TagSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional()
});

export const PatternSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional()
});

export const CompanySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable().optional()
});

export const UtilitiesSchema = z.object({
  platforms: z.array(PlatformSchema).default([]),
  patterns: z.array(PatternSchema).default([]),
  tags: z.array(TagSchema).default([]),
  difficulties: z.array(z.string()).default([])
});

export const SettingsSchema = z.object({
  dailyGoal: z.string().or(z.number()).default('2'),
  weeklyGoal: z.string().or(z.number()).default('10'),
  sdDailyGoal: z.string().or(z.number()).default('1'),
  sdWeeklyGoal: z.string().or(z.number()).default('3'),
  srsLevel1: z.string().or(z.number()).default('1'),
  srsLevel2: z.string().or(z.number()).default('3'),
  srsLevel3: z.string().or(z.number()).default('7'),
  srsLevel4: z.string().or(z.number()).default('14'),
  maxFlashcards: z.string().or(z.number()).default('20'),
  weekStart: z.string().or(z.number()).default('0'),
  defaultDifficulty: z.string().default('Medium'),
  defaultPlatform: z.string().default('LeetCode'),
  heatmapTheme: z.string().default('green'),
});
