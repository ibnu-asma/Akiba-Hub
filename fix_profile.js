const fs = require('fs');
const file = 'apps/web/src/app/(app)/profile/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Remove generateCohortAttendance function (everything from `// Helper to generate` up to `return records;\n}`)
content = content.replace(/\/\/ Helper to generate realistic cohort[\s\S]*?return records;\n\}\n\n/, '');

// 2. Fix duplicated const solvedCount and totalMinutes
content = content.replace(/const solvedCount = Math\.max.*?\n\s*const totalMinutes =.*?\n\s*const solvedCount = distinctProblems\.size;\n\s*const totalMinutes = mySubmissions\.reduce.*/g, 'const solvedCount = distinctProblems.size;\n  const totalMinutes = mySubmissions.reduce((sum, s) => sum + (s.timeSpentMin || 0), 0);');

// 3. Remove dummy consistency data block
content = content.replace(/\/\/ Ensure rich 2026, 2025, and 2024 heatmap data[\s\S]*?solvesMap\.set\('2026-09-11'[^;]*;\n  \}/g, '');

// 4. Remove dummy attendance data
content = content.replace(/\/\/ Combine database attendance[\s\S]*?const combinedAttendance = \[\.\.\.\(dbAttendance \?\? \[\]\).*?\n\s*const combinedAttendance = dbAttendance \?\? \[\];/g, 'const combinedAttendance = dbAttendance ?? [];');

fs.writeFileSync(file, content);
