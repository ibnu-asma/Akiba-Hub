const fs = require('fs');
const file = 'apps/api/src/modules/sessions/sessions.service.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  "  date: string;\n  startTime?: string | null;\n  endTime?: string | null;",
  "  startAt: Date;\n  endAt?: Date | null;"
);

code = code.replace(
  "        date: input.date,\n        startTime: input.startTime ?? null,\n        endTime: input.endTime ?? null,",
  "        startAt: input.startAt,\n        endAt: input.endAt ?? null,"
);

code = code.replace(
  "export interface UpdateSessionInput extends Partial<CreateSessionInput> {}",
  "export interface UpdateSessionInput extends Partial<CreateSessionInput> {}" // Just keeping it here in case it's there
);

code = code.replace(
  "      { ...input, date: input.date ?? session.date },",
  "      { ...input },"
);

// We need to fix the sort in list()!
// It was sorting by sessions.date
code = code.replace(/desc\(sessions\.date\)/g, "desc(sessions.startAt)");
code = code.replace(/asc\(sessions\.date\)/g, "asc(sessions.startAt)");


fs.writeFileSync(file, code);
