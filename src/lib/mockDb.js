// In-memory mock database for local development without Postgres
const globalForMock = global;

if (!globalForMock.mockProgress) {
  globalForMock.mockProgress = []; // Array of { userId, questionId, solved, revise, dateSolved, confidenceLevel, nextRevisionDate, tags, notes, pattern, timeSpent, attempts }
}

if (!globalForMock.mockCustomQuestions) {
  globalForMock.mockCustomQuestions = []; // Array of { id, userId, title, link, difficulty, platform, pattern, createdAt }
}

if (!globalForMock.mockPatterns) globalForMock.mockPatterns = [];
if (!globalForMock.mockPlatforms) globalForMock.mockPlatforms = [];
if (!globalForMock.mockTags) globalForMock.mockTags = [];

export const mockProgress = globalForMock.mockProgress;
export const mockCustomQuestions = globalForMock.mockCustomQuestions;
export const mockPatterns = globalForMock.mockPatterns;
export const mockPlatforms = globalForMock.mockPlatforms;
export const mockTags = globalForMock.mockTags;
