const fs = require('fs');
const file = 'apps/web/src/components/dashboard-widgets.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  "{session.startTime ?? 'TBD'}\\n                        {session.endTime ? \\` – \\${session.endTime}\\` : ''}",
  "{timeString || 'TBD'}"
);
// wait, the actual text is:
// {session.startTime ?? 'TBD'}
// {session.endTime ? ` – ${session.endTime}` : ''}
// I will just use regex to replace it.

code = code.replace(/\{session\.startTime \?\? 'TBD'\}.*?\{session\.endTime \? ` – \$\{session\.endTime\}` : ''\}/s, "{timeString || 'TBD'}");

fs.writeFileSync(file, code);
