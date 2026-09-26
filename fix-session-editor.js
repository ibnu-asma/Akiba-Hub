const fs = require('fs');
const file = 'apps/web/src/components/head/session-editor.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/\\`/g, '`');
code = code.replace(/\\\$/g, '$');

fs.writeFileSync(file, code);
