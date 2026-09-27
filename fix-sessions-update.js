const fs = require('fs');
const file = 'apps/api/src/modules/sessions/sessions.service.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  "        date: input.date,\n        startTime: input.startTime ?? null,\n        endTime: input.endTime ?? null,",
  "        startAt: input.startAt,\n        endAt: input.endAt ?? null,"
);

fs.writeFileSync(file, code);
