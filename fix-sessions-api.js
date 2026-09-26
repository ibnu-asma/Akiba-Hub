const fs = require('fs');
const file = 'apps/api/src/modules/sessions/sessions.service.ts';
let code = fs.readFileSync(file, 'utf8');

const crudMethods = `
  async findOne(id: string) {
    const row = await this.db.db.select().from(sessions).where(eq(sessions.id, id)).execute();
    if (!row.length) throw DomainError.notFound('Session not found');
    const sg = await this.db.db.select({ groupId: sessionGroups.groupId }).from(sessionGroups).where(eq(sessionGroups.sessionId, id)).execute();
    return { ...row[0], groupIds: sg.map(x => x.groupId) };
  }

  async update(id: string, input: CreateSessionInput, actor: { id: string; name: string; role: string }) {
    if (!isHoEOrHigher(actor.role)) throw DomainError.forbidden('Only heads can edit sessions');
    const rows = await this.db.db
      .update(sessions)
      .set({
        name: input.name,
        description: input.description ?? null,
        date: input.date,
        startTime: input.startTime ?? null,
        endTime: input.endTime ?? null,
        location: input.location ?? null,
        resourceLink: input.resourceLink ?? null,
        recordingLink: input.recordingLink ?? null,
        lecturer: input.lecturer ?? null,
        fundId: input.fundId ?? null,
        calendarInvite: input.calendarInvite ?? false,
      })
      .where(eq(sessions.id, id))
      .returning()
      .execute();
      
    if (!rows.length) throw DomainError.notFound('Session not found');
    
    // Replace groups
    await this.db.db.delete(sessionGroups).where(eq(sessionGroups.sessionId, id)).execute();
    if (input.groupIds.length > 0) {
      await this.db.db
        .insert(sessionGroups)
        .values(input.groupIds.map((groupId) => ({ sessionId: id, groupId })))
        .execute();
    }
    
    await this.audit.record({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: 'UPDATE',
      entityType: 'session',
      entityId: id,
      description: \`updated session '\${input.name}'\`,
    });
    return rows[0];
  }

  async remove(id: string, actor: { id: string; name: string; role: string }) {
    if (!isHoEOrHigher(actor.role)) throw DomainError.forbidden('Only heads can delete sessions');
    
    const row = await this.db.db.select({ name: sessions.name }).from(sessions).where(eq(sessions.id, id)).execute();
    if (!row.length) return;
    
    await this.db.db.delete(sessionGroups).where(eq(sessionGroups.sessionId, id)).execute();
    await this.db.db.delete(sessions).where(eq(sessions.id, id)).execute();
    
    await this.audit.record({
      actorId: actor.id,
      actorName: actor.name,
      actorRole: actor.role,
      action: 'DELETE',
      entityType: 'session',
      entityId: id,
      description: \`deleted session '\${row[0].name}'\`,
    });
  }
`;

if (!code.includes('async findOne(id: string)')) {
  code = code.replace(/async getAttendance\(/, crudMethods + '\n  async getAttendance(');
  fs.writeFileSync(file, code);
}
