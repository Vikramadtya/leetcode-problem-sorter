# Frontend Architecture & Data Flow

This document outlines the design and architecture of the Next.js frontend, heavily refactored for performance, strict API adherence, and clean state management.

## 1. Core Philosophy: "Dumb UI, Smart API"
The frontend acts entirely as a presentation layer. It **does not** filter arrays, perform complex local sorting, or calculate heavy paginations.
Instead, it relies on a highly responsive, strictly enforced API (the Java Backend, or the Mock Express Server during development). Every time a user changes a filter (e.g., "Medium Difficulty", "Hide Solved"), the UI immediately asks the API for the exact processed data.

## 2. API Contract Enforcement
We utilize an **OpenAPI Specification (`openapi.yaml`)** stored centrally in the `/api-contract` directory.
- The **Mock Server** is protected by `express-openapi-validator`. It intercepts every network request and response. If the UI sends an invalid property, or the Mock Server tries to return a missing field, the request is instantly rejected with an error.
- The **API Client (`src/lib/api/apiClient.js`)** bridges the UI to the API. It features a global error interceptor that fires elegant `react-hot-toast` notifications automatically whenever a network request fails or violates the contract.

## 3. Global State Management (Zustand)
We abandoned local `useState` prop-drilling in favor of a centralized store: `src/store/useAppStore.js`.

### The Store (`useAppStore`)
The store holds:
1. `questions`: The current page of processed questions returned by the API.
2. `filters`: An object containing the current state of all UI toggles (`search`, `difficulty`, `trackerMode`, `sortBy`, etc.).
3. `isLoading` / `error`: Global loading and error states.

### Data Flow
1. **User interacts** with a dropdown (e.g., changes difficulty to "Hard").
2. The UI calls `setFilter('difficulty', 'hard')`.
3. Zustand instantly updates the `filters` state, and automatically invokes `fetchQuestions()`.
4. `apiClient.js` formats the filters into query parameters and fetches from the Mock Server.
5. The API returns the exact, filtered JSON. Zustand updates the `questions` array.
6. The `Table.js` component effortlessly re-renders the new data.

### Optimistic Updates
When a user clicks the "Solved" checkbox, the UI feels instant because of optimistic updates:
1. `updateProgress(id, updates)` is called.
2. Zustand immediately mutates the specific question in the local state, visually updating the UI in 0ms.
3. A background `PATCH` request is sent via `apiClient.js`.
4. If the request fails (e.g., server offline), the global error interceptor shows a Toast, and Zustand automatically calls `fetchQuestions()` to revert the UI back to the correct server state.

## 4. Component Hierarchy
- `layout.js`: The global wrapper containing the `NextAuth` provider and the `<Toaster />` for notifications.
- `page.js` (Tracker Mode): The main dashboard. Configures Zustand with `trackerMode: true` to only show attempted/solved/important questions.
- `explore/page.js` (Explore Mode): The global directory. Disables `trackerMode` to show all questions.
- `Table.js`: A highly optimized presentation component. It expects data strictly in camelCase (matching the OpenAPI spec) and dispatches actions directly to the Zustand store, eliminating the need for excessive prop passing.
