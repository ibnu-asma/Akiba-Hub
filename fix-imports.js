const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.ts')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('./apps/api/src');

for (const file of files) {
  let content = fs.readFileSync(file, 'utf-8');
  if (content.includes('@Inject(')) {
    // Check if Inject is imported from @nestjs/common
    const importRegex = /import\s+{[^}]*}\s+from\s+['"]@nestjs\/common['"]/;
    const match = content.match(importRegex);
    if (match) {
      const importStatement = match[0];
      // Regex to see if Inject is inside the braces. Matches word boundary so it doesn't match Injectable
      if (!/\bInject\b/.test(importStatement)) {
        const newImportStatement = importStatement.replace('{', '{ Inject, ');
        content = content.replace(importStatement, newImportStatement);
        fs.writeFileSync(file, content);
        console.log('Fixed import in', file);
      }
    } else {
      content = "import { Inject } from '@nestjs/common';\n" + content;
      fs.writeFileSync(file, content);
      console.log('Added import to', file);
    }
  }
}
