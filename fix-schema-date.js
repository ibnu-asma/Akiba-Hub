const fs = require('fs');
const file = 'packages/database/src/schema.ts';
let code = fs.readFileSync(file, 'utf8');

// The replacement was: code.replace("date: date('date').notNull(),", "startAt: timestamp...");
// This only replaces the FIRST occurrence in javascript!
// Wait, if it only replaced the first occurrence, then `dailyProblems` was the first occurrence!
// And `sessions` didn't get replaced? Let's check `sessions` in schema.ts
