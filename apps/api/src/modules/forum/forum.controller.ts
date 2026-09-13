import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/auth/auth.guard.js';
import { CurrentPrincipal, Principal } from '../../common/auth/current-principal.js';
import { z } from 'zod';
import { ForumService } from './forum.service.js';

const createPostDto = z.object({ title: z.string().min(1).max(240), body: z.string().min(1).max(10000) });
const voteDto = z.object({ value: z.number().int().refine((v) => v === 1 || v === -1) });
const commentDto = z.object({ body: z.string().min(1).max(2000) });

/** Forum (SPEC §6.7) — academy-wide discussion; any authenticated user participates. */
@Controller('posts')
@UseGuards(AuthGuard)
export class ForumController {
  constructor(private readonly forum: ForumService) {}

  @Get()
  async list(@Query('sort') sort?: string, @CurrentPrincipal() principal?: Principal) {
    return this.forum.list(sort === 'top' || sort === 'oldest' ? sort : 'latest', 100, principal?.id);
  }

  @Post()
  async create(@Body() body: unknown, @CurrentPrincipal() principal: Principal) {
    const parsed = createPostDto.parse(body);
    return this.forum.create({ title: parsed.title, body: parsed.body }, { id: principal.id });
  }

  @Post(':id/vote')
  async vote(@Param('id') id: string, @Body() body: unknown, @CurrentPrincipal() principal: Principal) {
    const parsed = voteDto.parse(body);
    return this.forum.vote(id, principal.id, parsed.value);
  }

  @Get(':id/comments')
  async comments(@Param('id') id: string) {
    return this.forum.listComments(id);
  }

  @Post(':id/comments')
  async addComment(@Param('id') id: string, @Body() body: unknown, @CurrentPrincipal() principal: Principal) {
    const parsed = commentDto.parse(body);
    return this.forum.addComment(id, parsed.body, { id: principal.id });
  }
}
