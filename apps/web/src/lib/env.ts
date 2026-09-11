/** Server-side environment — never exposed to the browser (BFF pattern). */
export const env = {
  apiUrl: process.env.API_URL ?? 'http://localhost:3000',
} as const;
