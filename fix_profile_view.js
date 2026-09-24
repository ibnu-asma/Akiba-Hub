const fs = require('fs');
const file = 'apps/web/src/components/profile/profile-view.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/<CompactDetail label="Program" value=\{superGroupName \|\| 'G1 Akiba - Remote'\} icon="bookmark" \/>\n\s*<CompactDetail label="Group" value=\{groupName \|\| 'Remote Group 4'\} icon="users" \/>\n\s*<CompactDetail label="University" value=\{targetUser\.university \|\| 'ASTU'\} icon="file" \/>\n\s*<CompactDetail label="Department" value=\{targetUser\.department \|\| 'Computer Science & Engineering'\} icon="list" \/>\n\s*<CompactDetail label="Student ID" value=\{targetUser\.studentId \|\| 'ATR\/1234\/12'\} icon="shield" \/>\n\s*<CompactDetail label="Country" value=\{targetUser\.country \|\| 'Ethiopia'\} icon="map" \/>\n\s*/g, '');

fs.writeFileSync(file, content);
