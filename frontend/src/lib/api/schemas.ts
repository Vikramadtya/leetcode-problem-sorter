import { z } from 'zod';

export const ProgressSchema = z.object({
  id: z.string().optional(),
  question_id: z.string().optional(),
  status: z.enum(['Solved', 'Attempted', 'Unsolved']).default('Unsolved'),
  confidenceLevel: z.number().nullable().optional(),
  needsRevision: z.boolean().default(false),
  notes: z.string().nullable().optional(),
  last_practiced: z.string().nullable().optional(),
  next_review_date: z.string().nullable().optional(),
}).passthrough();

export const QuestionSchema = z.object({
  id: z.string(),
  title: z.string(),
  difficulty: z.enum(['Easy', 'Medium', 'Hard']).optional().nullable(),
  url: z.string().optional().nullable(),
  platform: z.string().optional().nullable(),
  tags: z.array(z.string()).default([]),
  pattern: z.string().optional().nullable(),
  progress: ProgressSchema.nullable().optional(),
}).passthrough();

export const QuestionsResponseSchema = z.object({
  data: z.array(QuestionSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
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
