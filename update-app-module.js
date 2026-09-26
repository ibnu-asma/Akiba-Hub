const fs = require('fs');
const file = 'apps/api/src/app.module.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  "import { ForumService } from './modules/forum/forum.service.js';",
  "import { ForumService } from './modules/forum/forum.service.js';\nimport { RoadmapsController } from './modules/roadmaps/roadmaps.controller.js';\nimport { RoadmapsService } from './modules/roadmaps/roadmaps.service.js';"
);

code = code.replace(
  "ForumController,",
  "ForumController,\n    RoadmapsController,"
);

code = code.replace(
  "ForumService,",
  "ForumService,\n    RoadmapsService,"
);

fs.writeFileSync(file, code);
