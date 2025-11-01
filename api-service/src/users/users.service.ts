import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../database/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async create(email: string, password: string): Promise<User> {
    const user = this.usersRepository.create({
      email,
      password,
    });
    return this.usersRepository.save(user);
  }

  async updateStripeCustomerId(userId: string, stripeCustomerId: string): Promise<void> {
    await this.usersRepository.update(userId, { stripeCustomerId });
  }
}
