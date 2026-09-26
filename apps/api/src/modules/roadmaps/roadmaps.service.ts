import { Injectable, Inject } from '@nestjs/common';
import { DatabaseProvider } from '../../config/database.provider.js';
import { roadmaps, roadmapSections, roadmapItems, roadmapProgress } from '@hub/database';
import { eq, asc, and, inArray } from 'drizzle-orm';
import { DomainError, ERROR_CODES } from '@hub/shared';

@Injectable()
export class RoadmapsService {
  constructor(@Inject(DatabaseProvider) private readonly db: DatabaseProvider) {}

  async findAll() {
    const allRoadmaps = await this.db.db.select().from(roadmaps).orderBy(asc(roadmaps.createdAt));
    const sections = await this.db.db.select().from(roadmapSections).orderBy(asc(roadmapSections.sortOrder));
    const items = await this.db.db.select().from(roadmapItems).orderBy(asc(roadmapItems.sortOrder));

    return allRoadmaps.map((r) => {
      return {
        ...r,
        sections: sections
          .filter((s) => s.roadmapId === r.id)
          .map((s) => ({
            ...s,
            items: items.filter((i) => i.sectionId === s.id),
          })),
      };
    });
  }

  async findOne(id: string) {
    const all = await this.findAll();
    const r = all.find((x) => x.id === id);
    if (!r) throw DomainError.notFound('Roadmap not found');
    return r;
  }

  async create(data: { title: string; description?: string | null; sections: any[] }, createdBy: string) {
    return this.db.db.transaction(async (tx) => {
      const [r] = await tx
        .insert(roadmaps)
        .values({
          title: data.title,
          description: data.description ?? null,
          createdBy,
        })
        .returning();

      for (let i = 0; i < data.sections.length; i++) {
        const sec = data.sections[i];
        const [s] = await tx
          .insert(roadmapSections)
          .values({
            roadmapId: r.id,
            title: sec.title,
            sortOrder: i,
          })
          .returning();

        for (let j = 0; j < sec.items.length; j++) {
          const item = sec.items[j];
          await tx.insert(roadmapItems).values({
            sectionId: s.id,
            type: item.type,
            title: item.title,
            link: item.link,
            sortOrder: j,
          });
        }
      }

      return r;
    });
  }

  async delete(id: string) {
    await this.db.db.transaction(async (tx) => {
      const sections = await tx.select().from(roadmapSections).where(eq(roadmapSections.roadmapId, id));
      const sectionIds = sections.map(s => s.id);
      
      if (sectionIds.length > 0) {
        const items = await tx.select().from(roadmapItems).where(inArray(roadmapItems.sectionId, sectionIds));
        const itemIds = items.map(i => i.id);
        
        if (itemIds.length > 0) {
          await tx.delete(roadmapProgress).where(inArray(roadmapProgress.itemId, itemIds));
          await tx.delete(roadmapItems).where(inArray(roadmapItems.sectionId, sectionIds));
        }
        
        await tx.delete(roadmapSections).where(eq(roadmapSections.roadmapId, id));
      }
      
      await tx.delete(roadmaps).where(eq(roadmaps.id, id));
    });
  }

  async getProgress(userId: string) {
    const rows = await this.db.db.select({ itemId: roadmapProgress.itemId }).from(roadmapProgress).where(eq(roadmapProgress.userId, userId));
    return rows.map((r) => r.itemId);
  }

  async toggleProgress(userId: string, itemId: string) {
    const existing = await this.db.db
      .select()
      .from(roadmapProgress)
      .where(and(eq(roadmapProgress.userId, userId), eq(roadmapProgress.itemId, itemId)))
      .limit(1);

    if (existing.length > 0) {
      await this.db.db
        .delete(roadmapProgress)
        .where(and(eq(roadmapProgress.userId, userId), eq(roadmapProgress.itemId, itemId)));
      return { completed: false };
    } else {
      await this.db.db
        .insert(roadmapProgress)
        .values({ userId, itemId });
      return { completed: true };
    }
  }
}
