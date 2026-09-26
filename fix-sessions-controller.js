const fs = require('fs');
const file = 'apps/api/src/modules/sessions/sessions.controller.ts';
let code = fs.readFileSync(file, 'utf8');

const crudMethods = `
  @Get(':id')
  async findOne(@Param('id') id: string) {
    // Need to avoid conflict with 'attendance-grid' and 'user-attendance' routes.
    // Actually, NestJS route order matters. We should put this at the very bottom of the class!
  }
`;

// Let's do it safely by just adding the endpoints.
const patchDelete = `
  @Get(':id')
  async findOne(@Param('id') id: string) {
    if (id === 'attendance-grid' || id === 'user-attendance') throw new Error('Not found');
    return this.sessions.findOne(id);
  }

  @Patch(':id')
  @UseGuards(new MockRulesGuard(2))
  async update(@Param('id') id: string, @Body() body: unknown, @CurrentPrincipal() principal: Principal) {
    const parsed = createDto.parse(body);
    return this.sessions.update(
      id,
      { ...parsed, date: parsed.date },
      { id: principal.id, name: principal.name, role: principal.role }
    );
  }

  @Delete(':id')
  @UseGuards(new MockRulesGuard(2))
  async remove(@Param('id') id: string, @CurrentPrincipal() principal: Principal) {
    await this.sessions.remove(id, { id: principal.id, name: principal.name, role: principal.role });
    return { ok: true };
  }
`;

if (!code.includes('@Patch(\':id\')')) {
  // Insert right before the last closing brace.
  code = code.replace(/}\s*$/, patchDelete + '\n}');
  // Also add Delete and Patch to imports if needed
  if (!code.includes('Delete,')) code = code.replace('Controller,', 'Controller, Delete, Patch,');
  fs.writeFileSync(file, code);
}
