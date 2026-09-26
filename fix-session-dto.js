const fs = require('fs');
const file = 'apps/api/src/modules/sessions/sessions.controller.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /const createDto = z\.object\(\{[\s\S]*?\}\);/m,
  `const createDto = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(4000).nullable().optional(),
  date: z.string().min(1),
  startTime: z.string().nullable().optional(),
  endTime: z.string().nullable().optional(),
  location: z.string().max(200).nullable().optional(),
  resourceLink: z.string().url().nullable().optional().or(z.literal('')),
  recordingLink: z.string().url().nullable().optional().or(z.literal('')),
  lecturer: z.string().max(160).nullable().optional(),
  fundId: z.string().uuid().nullable().optional(),
  calendarInvite: z.boolean().nullable().optional(),
  groupIds: z.array(z.string().uuid()).default([]),
});`
);

fs.writeFileSync(file, code);
