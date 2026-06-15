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
  acceptanceRate: z.string().or(z.number()).nullable().optional(),
  frequency: z.number().nullable().optional(),
  isCustom: z.boolean().optional(),
  commentsCount: z.number().optional(),
  progress: ProgressSchema.optional(),
}).passthrough();

const QuestionsResponseSchema = z.object({
  data: z.array(QuestionSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});

async function run() {
  const loginRes = await fetch('http://127.0.0.1:4000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'mock' })
  });
  const loginData = await loginRes.json();
  const token = loginRes.headers.get('set-cookie')?.split(';')[0] || '';
  
  const res = await fetch('http://127.0.0.1:4000/api/v1/questions?trackerMode=false&limit=10', {
    headers: { 'Authorization': `Bearer ${loginData.token || loginData.accessToken || 'mock'}` }
  });
  const data = await res.json();
  console.log("RESPONSE:", data);
  
  try {
    QuestionsResponseSchema.parse(data);
    console.log("Validation SUCCESS");
  } catch(e) {
    console.error("Validation FAILED:", e.message);
  }
}
run();
