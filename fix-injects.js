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
  let changed = false;

  // Regex to match constructors: constructor(private readonly db: DatabaseProvider, ...)
  // We need to parse arguments. This is simpler if we just replace `private readonly name: Type` with `@Inject(Type) private readonly name: Type`
  
  // Basic regex to find constructor(...) 
  const ctorRegex = /constructor\s*\(([^)]+)\)/g;
  
  content = content.replace(ctorRegex, (match, argsStr) => {
    const args = argsStr.split(',').map(arg => arg.trim());
    const newArgs = args.map(arg => {
      // If it already has @Inject, skip
      if (arg.includes('@Inject(')) return arg;
      
      // Match `private readonly name: Type` or `private name: Type` or `name: Type`
      const typeMatch = arg.match(/:\s*([A-Za-z0-9_]+)/);
      if (typeMatch) {
        const type = typeMatch[1];
        if (type === 'string' || type === 'number' || type === 'boolean') return arg;
        
        // Add @Inject(Type)
        return `@Inject(${type}) ${arg}`;
      }
      return arg;
    });
    
    return `constructor(${newArgs.join(', ')})`;
  });

  if (content !== fs.readFileSync(file, 'utf-8')) {
    // Add import { Inject } from '@nestjs/common' if it has @Inject but no import
    if (content.includes('@Inject(') && !content.includes('Inject,')) {
      if (content.includes('@nestjs/common')) {
        content = content.replace(/{([^}]+)} from '@nestjs\/common'/, (m, p1) => {
          if (p1.includes('Inject')) return m;
          return `{ Inject, ${p1.trim()} } from '@nestjs/common'`;
        });
      } else {
        content = `import { Inject } from '@nestjs/common';\n` + content;
      }
    }
    fs.writeFileSync(file, content);
    console.log('Fixed', file);
  }
}
