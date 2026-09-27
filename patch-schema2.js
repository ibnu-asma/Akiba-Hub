const fs = require('fs');
const file = 'packages/database/src/schema.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  "startAt: timestamp('start_at', { withTimezone: true }).notNull().defaultNow(),",
  "date: date('date'),\n    startTime: varchar('start_time', { length: 16 }),\n    endTime: varchar('end_time', { length: 16 }),\n    startAt: timestamp('start_at', { withTimezone: true }).notNull().defaultNow(),"
);

fs.writeFileSync(file, code);
