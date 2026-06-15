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
  commentsCount: z.number().optional(),
  progress: ProgressSchema.optional(),
}).passthrough();

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
  platformsBreakdown: z.array(z.any()).default([]),
  confidenceVsDifficulty: z.array(z.any()).default([]),
  problemsSolvedOverTime: z.array(z.any()).default([]),
  timePerDifficulty: z.array(z.any()).default([]),
  patternMasteryData: z.array(z.any()).default([]),
  patternUsageFrequency: z.array(z.any()).default([]),
  tagsFrequency: z.array(z.any()).default([]),
  confidenceToProblemCount: z.array(z.any()).default([]),
  patternsMostRevised: z.array(z.any()).default([]),
  activityTimeline: z.array(z.any()).default([]),
  currentStreak: z.number().default(0),
}).passthrough();

export const SettingsSchema = z.object({
  dailyGoal: z.string().or(z.number()).default('2'),
  weeklyGoal: z.string().or(z.number()).default('10'),
  srsLevel1: z.string().or(z.number()).default('1'),
  srsLevel2: z.string().or(z.number()).default('3'),
  srsLevel3: z.string().or(z.number()).default('7'),
  srsLevel4: z.string().or(z.number()).default('14'),
  maxFlashcards: z.string().or(z.number()).default('20'),
  weekStart: z.string().or(z.number()).default('0'),
  defaultDifficulty: z.string().default('Medium'),
  defaultPlatform: z.string().default('LeetCode'),
  heatmapTheme: z.string().default('green'),
}).passthrough();
