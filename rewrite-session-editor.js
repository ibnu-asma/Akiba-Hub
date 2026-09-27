const fs = require('fs');
const file = 'apps/web/src/components/head/session-editor.tsx';
let code = fs.readFileSync(file, 'utf8');

// The DTO has changed.
code = code.replace(
  "  date: string;\n  startTime?: string | null;\n  endTime?: string | null;",
  "  startAt: string;\n  endAt?: string | null;"
);

// We need to parse startAt and endAt back into EAT strings to populate the date/time inputs.
const initLogic = `
  // Convert EAT UTC to YYYY-MM-DD and HH:MM
  function parseEat(isoStr) {
    if (!isoStr) return { d: '', t: '' };
    const date = new Date(isoStr);
    // EAT is UTC+3
    const eatOffsetMs = 3 * 60 * 60 * 1000;
    const eatDate = new Date(date.getTime() + eatOffsetMs);
    const d = eatDate.toISOString().slice(0, 10);
    const t = eatDate.toISOString().slice(11, 16);
    return { d, t };
  }
  
  const initStart = parseEat(session?.startAt);
  const initEnd = parseEat(session?.endAt);

  const [name, setName] = useState(session?.name ?? '');
  const [description, setDescription] = useState(session?.description ?? '');
  const [date, setDate] = useState(initStart.d);
  const [startTime, setStartTime] = useState(initStart.t);
  const [endTime, setEndTime] = useState(initEnd.t);
`;

code = code.replace(
  /const \[name, setName\].*?setEndTime\(.*?\);/s,
  initLogic
);

const toEatUTC = `
    const eatOffsetMs = 3 * 60 * 60 * 1000;
    let startAtIso = undefined;
    if (date) {
      const [y, m, d] = date.split('-').map(Number);
      let h = 0, min = 0;
      if (startTime) {
        const [hr, mr] = startTime.split(':').map(Number);
        h = hr; min = mr;
      }
      // Create date as UTC, then subtract 3 hours to represent the EAT time in true UTC
      const utcTime = Date.UTC(y, m - 1, d, h, min, 0);
      startAtIso = new Date(utcTime - eatOffsetMs).toISOString();
    }
    
    let endAtIso = undefined;
    if (date && endTime) {
      const [y, m, d] = date.split('-').map(Number);
      const [hr, mr] = endTime.split(':').map(Number);
      const utcTime = Date.UTC(y, m - 1, d, hr, mr, 0);
      endAtIso = new Date(utcTime - eatOffsetMs).toISOString();
    }
`;

const oldPayload = `        date,
        startTime: startTime || null,
        endTime: endTime || null,`;

code = code.replace(oldPayload, "        startAt: startAtIso,\n        endAt: endAtIso || null,");

code = code.replace("if (!validate()) return;", "if (!validate()) return;\n" + toEatUTC);

// The label for the time inputs should specify EAT
code = code.replace(
  '<label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Start Time</label>',
  '<label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Start Time (EAT)</label>'
);
code = code.replace(
  '<label className="text-xs font-bold text-slate-500 uppercase tracking-wider">End Time</label>',
  '<label className="text-xs font-bold text-slate-500 uppercase tracking-wider">End Time (EAT)</label>'
);

fs.writeFileSync(file, code);
