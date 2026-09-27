const fs = require('fs');
const file = 'packages/database/src/schema.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace("date: date('date'),\n", "");
code = code.replace("startTime: varchar('start_time', { length: 16 }),\n", "");
code = code.replace("endTime: varchar('end_time', { length: 16 }),\n", "");

fs.writeFileSync(file, code);
