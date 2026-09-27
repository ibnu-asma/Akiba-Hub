const fs = require('fs');
const file = 'apps/api/src/modules/groups/groups.service.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  "      date: s.date,\n      startTime: s.startTime,\n      endTime: s.endTime,",
  "      startAt: s.startAt,\n      endAt: s.endAt,"
);

fs.writeFileSync(file, code);
