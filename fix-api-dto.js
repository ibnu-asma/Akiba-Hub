const fs = require('fs');
const file = 'apps/web/src/lib/api.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  "  date: string;\n  startTime: string | null;\n  endTime: string | null;",
  "  startAt: string;\n  endAt: string | null;"
);

// also in GroupSessionItem
code = code.replace(
  "  date: string;\n  startTime: string | null;\n  endTime: string | null;",
  "  startAt: string;\n  endAt: string | null;"
);

fs.writeFileSync(file, code);
