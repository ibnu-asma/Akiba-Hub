const fs = require('fs');
const file = 'packages/database/src/schema.ts';
let code = fs.readFileSync(file, 'utf8');

// Find sessions table
const lines = code.split('\n');
let insideSessions = false;
const newLines = [];

for (const line of lines) {
  if (line.includes("export const sessions = pgTable(")) {
    insideSessions = true;
  }
  
  if (insideSessions && line.includes("date: date('date').notNull(),")) {
    newLines.push("    startAt: timestamp('start_at', { withTimezone: true }).notNull().defaultNow(),");
    newLines.push("    endAt: timestamp('end_at', { withTimezone: true }),");
    continue;
  }
  if (insideSessions && line.includes("startTime: varchar('start_time', { length: 16 }),")) continue;
  if (insideSessions && line.includes("endTime: varchar('end_time', { length: 16 }),")) continue;
  
  if (insideSessions && line.includes("},")) {
    insideSessions = false;
  }
  
  newLines.push(line);
}

fs.writeFileSync(file, newLines.join('\n'));
