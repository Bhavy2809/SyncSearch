import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  /**
   * POST /projects
   * Create a new project for the authenticated user
   */
  @Post()
  create(
    @CurrentUser('id') userId: string,
    @Body() createProjectDto: CreateProjectDto,
  ) {
    return this.projectsService.create(userId, createProjectDto);
  }

  /**
   * GET /projects
   * List all projects for the authenticated user
   */
  @Get()
  findAll(@CurrentUser('id') userId: string) {
    return this.projectsService.findAllByUser(userId);
  }

  /**
   * GET /projects/:id
   * Get a single project by ID
   * Verifies ownership before returning
   */
  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.projectsService.findOne(id, userId);
  }

  /**
   * PATCH /projects/:id
   * Update a project
   * Verifies ownership before updating
   */
  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() updateProjectDto: UpdateProjectDto,
  ) {
    return this.projectsService.update(id, userId, updateProjectDto);
  }

  /**
   * DELETE /projects/:id
   * Delete a project
   * Verifies ownership before deletion
   * Cascades to all associated media and transcripts
   */
  @Delete(':id')
  remove(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.projectsService.remove(id, userId);
  }
}
