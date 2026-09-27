const fs = require('fs');
const file = 'apps/api/src/modules/sessions/sessions.service.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/sessions\.date/g, 'sessions.startAt');

fs.writeFileSync(file, code);
