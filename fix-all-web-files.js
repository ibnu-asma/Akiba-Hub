const fs = require('fs');

function fixSessionsPage() {
  const f = 'apps/web/src/app/(app)/sessions/page.tsx';
  let c = fs.readFileSync(f, 'utf8');
  c = c.replace(/\{session\.date\}/g, '{session.startAt.slice(0, 10)}');
  c = c.replace(/session\.startTime/g, 'session.startAt');
  c = c.replace(/session\.endTime/g, 'session.endAt');
  fs.writeFileSync(f, c);
}

function fixAttendanceRoster() {
  const f = 'apps/web/src/components/head/attendance-roster.tsx';
  let c = fs.readFileSync(f, 'utf8');
  c = c.replace(/s\.date/g, 's.startAt');
  c = c.replace(/session\.startTime/g, 'session.startAt');
  fs.writeFileSync(f, c);
}

function fixProfileAttendance() {
  const f = 'apps/web/src/components/profile/profile-attendance.tsx';
  let c = fs.readFileSync(f, 'utf8');
  // wait, UserAttendanceRecord in api.ts has date and startTime! I need to fix api.ts UserAttendanceRecord too!
}

function fixDashboardWidgets() {
  const f = 'apps/web/src/components/dashboard-widgets.tsx';
  let c = fs.readFileSync(f, 'utf8');
  c = c.replace(/session\.date/g, 'session.startAt');
  c = c.replace(/session\.endTime/g, 'session.endAt');
  c = c.replace(/session\.startTime/g, 'session.startAt');
  fs.writeFileSync(f, c);
}

function fixApi() {
  const f = 'apps/web/src/lib/api.ts';
  let c = fs.readFileSync(f, 'utf8');
  c = c.replace(
    /export interface UserAttendanceRecord \{[\s\S]*?id: string;/g,
    "export interface UserAttendanceRecord {\n  id: string;\n  userId: string;\n  sessionId: string;\n  sessionName: string;\n  status: string;\n  checkInAt?: string | null;\n  markedBy?: string | null;\n  startAt: string;\n  endAt: string | null;"
  );
  fs.writeFileSync(f, c);
}

fixSessionsPage();
fixAttendanceRoster();
fixDashboardWidgets();
fixApi();

// And now fix ProfileAttendance
const profileFile = 'apps/web/src/components/profile/profile-attendance.tsx';
let pcode = fs.readFileSync(profileFile, 'utf8');
pcode = pcode.replace(/r\.date/g, 'r.startAt');
pcode = pcode.replace(/cell\.record\.startTime/g, 'cell.record.startAt');
pcode = pcode.replace(/r\.startTime/g, 'r.startAt');
fs.writeFileSync(profileFile, pcode);

// And Session Editor implicitly has 'any'
const sessionEditorFile = 'apps/web/src/components/head/session-editor.tsx';
let scode = fs.readFileSync(sessionEditorFile, 'utf8');
scode = scode.replace("function parseEat(isoStr) {", "function parseEat(isoStr?: string | null) {");
fs.writeFileSync(sessionEditorFile, scode);

