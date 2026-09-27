const fs = require('fs');
const file = 'apps/api/src/modules/groups/groups.service.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  "        date: sql<string>`to_char(${sessions.date}, 'YYYY-MM-DD')`,\n        startTime: sessions.startTime,\n        endTime: sessions.endTime,",
  "        startAt: sessions.startAt,\n        endAt: sessions.endAt,"
);
code = code.replace("desc(sessions.date)", "desc(sessions.startAt)");

fs.writeFileSync(file, code);
