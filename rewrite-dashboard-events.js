const fs = require('fs');
const file = 'apps/web/src/components/dashboard-widgets.tsx';
let code = fs.readFileSync(file, 'utf8');

// The dashboard uses \`getSessionStartTime\` and \`getSessionEndTime\`. We don't need them anymore since we have proper Date objects!
// Well, we have \`session.startAt\` string.
// So we can replace:
const regex1 = /function getSessionEndTime.*?function extractMeetingLink/s;

const newFunctions = `
function formatEatTime(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  // Option B: strict EAT in 12-hour format
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Africa/Addis_Ababa',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(d) + ' EAT';
}

function getEatDate(isoString) {
  if (!isoString) return { monthStr: 'Date', dayNum: 1 };
  const d = new Date(isoString);
  const eatFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Africa/Addis_Ababa',
    month: 'short',
    day: 'numeric',
  });
  const parts = eatFormatter.formatToParts(d);
  const monthStr = parts.find(p => p.type === 'month')?.value || 'Date';
  const dayNum = parseInt(parts.find(p => p.type === 'day')?.value || '1', 10);
  return { monthStr, dayNum };
}

function extractMeetingLink`;

code = code.replace(regex1, newFunctions);

// inside EventsPanel:
code = code.replace(
  "  const activeSessions = (sessions ?? []).filter((s) => getSessionEndTime(s) >= now);",
  "  const activeSessions = (sessions ?? []).filter((s) => new Date(s.endAt || s.startAt) >= now);"
);
code = code.replace(
  "  activeSessions.sort((a, b) => getSessionStartTime(a).getTime() - getSessionStartTime(b).getTime());",
  "  activeSessions.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());"
);

// inside map loop:
code = code.replace(
  "            const startTime = getSessionStartTime(session);\n            const endTime = getSessionEndTime(session);\n            const isLive = startTime <= now && endTime >= now;\n            const meetLink = extractMeetingLink(session);\n            const monthStr = MONTH_NAMES[startTime.getMonth()] ?? 'Date';\n            const dayNum = startTime.getDate();",
  `            const startTime = new Date(session.startAt);
            const endTime = new Date(session.endAt || session.startAt);
            const isLive = startTime <= now && endTime >= now;
            const meetLink = extractMeetingLink(session);
            const { monthStr, dayNum } = getEatDate(session.startAt);
            const timeString = formatEatTime(session.startAt);`
);

// We need to inject timeString in the UI!
// Let's find where the time was rendered. Wait, was the time rendered in the event content?
// In the original code, I don't think it rendered the time at all! "Upcoming Events card... it shows the even time, which time zone it is using?"
// Let's check how the original code rendered the time. Wait, if it didn't render it, where did the user see the time?
// Let's check the code block for `event content`.
