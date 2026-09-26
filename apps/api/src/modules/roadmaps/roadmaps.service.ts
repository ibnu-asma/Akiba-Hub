import { Injectable, Inject } from '@nestjs/common';
import { DatabaseProvider } from '../../config/database.provider.js';
import { roadmaps, roadmapSections, roadmapItems, roadmapProgress, eq, asc, and, inArray } from '@hub/database';

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

  async update(id: string, data: { title: string; description?: string | null; sections: any[] }, updatedBy: string) {
    return this.db.db.transaction(async (tx) => {
      // 1. Update Roadmap
      await tx
        .update(roadmaps)
        .set({
          title: data.title,
          description: data.description ?? null,
        })
        .where(eq(roadmaps.id, id));

      const keptSectionIds = new Set<string>();
      const keptItemIds = new Set<string>();

      // 2. Upsert Sections and Items
      for (let i = 0; i < data.sections.length; i++) {
        const sec = data.sections[i];
        let sectionId = sec.id;

        if (sectionId) {
          // Update existing section
          await tx
            .update(roadmapSections)
            .set({ title: sec.title, sortOrder: i })
            .where(eq(roadmapSections.id, sectionId));
        } else {
          // Insert new section
          const [s] = await tx
            .insert(roadmapSections)
            .values({
              roadmapId: id,
              title: sec.title,
              sortOrder: i,
            })
            .returning();
          sectionId = s.id;
        }

        keptSectionIds.add(sectionId);

        for (let j = 0; j < sec.items.length; j++) {
          const item = sec.items[j];
          let itemId = item.id;

          if (itemId) {
            // Update existing item
            await tx
              .update(roadmapItems)
              .set({
                sectionId: sectionId,
                title: item.title,
                link: item.link,
                type: item.type,
                sortOrder: j,
              })
              .where(eq(roadmapItems.id, itemId));
          } else {
            // Insert new item
            const [insertedItem] = await tx
              .insert(roadmapItems)
              .values({
                sectionId: sectionId,
                title: item.title,
                link: item.link,
                type: item.type,
                sortOrder: j,
              })
              .returning();
            itemId = insertedItem.id;
          }
          
          keptItemIds.add(itemId);
        }
      }

      // 3. Cleanup removed items and sections
      const existingSections = await tx.select().from(roadmapSections).where(eq(roadmapSections.roadmapId, id));
      const existingSectionIds = existingSections.map(s => s.id);
      
      if (existingSectionIds.length > 0) {
        const existingItems = await tx.select().from(roadmapItems).where(inArray(roadmapItems.sectionId, existingSectionIds));
        
        // Find items to delete
        const itemsToDelete = existingItems.filter(i => !keptItemIds.has(i.id)).map(i => i.id);
        
        if (itemsToDelete.length > 0) {
          await tx.delete(roadmapProgress).where(inArray(roadmapProgress.itemId, itemsToDelete));
          await tx.delete(roadmapItems).where(inArray(roadmapItems.id, itemsToDelete));
        }

        // Find sections to delete
        const sectionsToDelete = existingSectionIds.filter(id => !keptSectionIds.has(id));
        if (sectionsToDelete.length > 0) {
          await tx.delete(roadmapSections).where(inArray(roadmapSections.id, sectionsToDelete));
        }
      }

      return this.findOne(id);
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
