const fs = require('fs');
const file = 'apps/web/src/components/app-shell.tsx';
let code = fs.readFileSync(file, 'utf8');

const injection = `
  // 3) Roadmaps become children of the "Roadmap" sidebar item.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const roadmapsData = (await safe(hubFetch<any[]>('/roadmaps'))) ?? [];
  const roadmapChildren = roadmapsData.map((r) => ({
    label: r.title,
    href: \`/roadmaps/\${r.id}\`,
  }));
  if (!isStudent) {
    roadmapChildren.push({ label: '+ Add Roadmap', href: '/roadmaps/new' });
  }

  const hasTrackChildren = trackChildren.length > 0;
  const hasContestChildren = contestChildren.length > 0;
  const hasRoadmapChildren = roadmapChildren.length > 0;
`;

code = code.replace(
  "const hasTrackChildren = trackChildren.length > 0;\n  const hasContestChildren = contestChildren.length > 0;",
  injection
);

const itemInjection = `      if (item.href === '/contests' && hasContestChildren) {
        return { ...item, children: contestChildren };
      }
      if (item.href === '/roadmap' && hasRoadmapChildren) {
        return { ...item, children: roadmapChildren };
      }`;

code = code.replace(
  "if (item.href === '/contests' && hasContestChildren) {\n        return { ...item, children: contestChildren };\n      }",
  itemInjection
);

fs.writeFileSync(file, code);
