const fs = require('fs');
const file = 'apps/api/src/modules/sessions/sessions.controller.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  "  date: z.string().min(1),\n  startTime: z.string().nullable().optional(),\n  endTime: z.string().nullable().optional(),",
  "  startAt: z.string().datetime().optional().nullable(),\n  endAt: z.string().datetime().optional().nullable(),"
);

code = code.replace(
  "        date: parsed.date,\n        startTime: parsed.startTime,\n        endTime: parsed.endTime,",
  "        startAt: parsed.startAt ? new Date(parsed.startAt) : new Date(),\n        endAt: parsed.endAt ? new Date(parsed.endAt) : null,"
);

code = code.replace(
  "      { ...parsed, date: parsed.date },",
  "      { ...parsed, startAt: parsed.startAt ? new Date(parsed.startAt) : new Date(), endAt: parsed.endAt ? new Date(parsed.endAt) : null },"
);

fs.writeFileSync(file, code);
