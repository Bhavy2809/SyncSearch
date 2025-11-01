import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../database/project.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private projectsRepository: Repository<Project>,
  ) {}

  /**
   * Create a new project for the authenticated user
   */
  async create(userId: string, createProjectDto: CreateProjectDto): Promise<Project> {
    const project = this.projectsRepository.create({
      ...createProjectDto,
      user: { id: userId } as any, // TypeORM will handle the relation
    });

    return this.projectsRepository.save(project);
  }

  /**
   * Find all projects belonging to the authenticated user
   */
  async findAllByUser(userId: string): Promise<Project[]> {
    return this.projectsRepository.find({
      where: { user: { id: userId } },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find a single project by ID
   * Verifies the project belongs to the authenticated user
   */
  async findOne(id: string, userId: string): Promise<Project> {
    const project = await this.projectsRepository
      .createQueryBuilder('project')
      .where('project.id = :id', { id })
      .getOne();

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    // Get the user_id from the database
    const result = await this.projectsRepository
      .createQueryBuilder('project')
      .select('project.user_id', 'userId')
      .where('project.id = :id', { id })
      .getRawOne();

    // Authorization check - ensure user owns this project
    if (result?.userId !== userId) {
      throw new ForbiddenException('You do not have permission to access this project');
    }

    return project;
  }

  /**
   * Update a project
   * Verifies the project belongs to the authenticated user
   */
  async update(id: string, userId: string, updateProjectDto: UpdateProjectDto): Promise<Project> {
    // First verify ownership
    const project = await this.findOne(id, userId);

    // Update the project
    Object.assign(project, updateProjectDto);
    
    return this.projectsRepository.save(project);
  }

  /**
   * Remove a project
   * Verifies the project belongs to the authenticated user
   * Cascades deletion to all associated media and transcripts
   */
  async remove(id: string, userId: string): Promise<void> {
    // First verify ownership
    await this.findOne(id, userId);

    // Delete the project (CASCADE will delete associated media and transcripts)
    await this.projectsRepository.delete(id);
  }
}
