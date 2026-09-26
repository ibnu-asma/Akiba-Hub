const fs = require('fs');
const content = fs.readFileSync('/home/solo/.gemini/antigravity/brain/17930ecb-136c-44a5-9847-759e31b1e98f/implementation_plan.md', 'utf8');

const frontmatter = `---
requestFeedback: true
userFacing: true
summary: "Implementation plan for making the Roadmap navbar item dynamic and collapsible."
---

`;

fs.writeFileSync('/home/solo/.gemini/antigravity/brain/17930ecb-136c-44a5-9847-759e31b1e98f/implementation_plan.md', frontmatter + content);
