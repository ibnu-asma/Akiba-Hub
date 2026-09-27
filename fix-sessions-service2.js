const fs = require('fs');
const file = 'apps/api/src/modules/sessions/sessions.service.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  "        date: sessions.startAt,\n        startTime: sessions.startTime,\n        endTime: sessions.endTime,",
  "        startAt: sessions.startAt,\n        endAt: sessions.endAt,"
);

fs.writeFileSync(file, code);
