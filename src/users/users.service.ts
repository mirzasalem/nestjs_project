import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findById(id: number): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async create(data: Partial<User>): Promise<User> {
    const user = this.usersRepository.create(data);
    return this.usersRepository.save(user);
  }

  async incrementCancellationCount(userId: number): Promise<void> {
    await this.usersRepository.increment({ id: userId }, 'cancellationCount', 1);
    const user = await this.findById(userId);
    if (user && user.cancellationCount >= 3) {
      user.isFlagged = true;
      await this.usersRepository.save(user);
    }
  }

  async resetCancellationCount(userId: number): Promise<void> {
    await this.usersRepository.update(userId, {
      cancellationCount: 0,
      isFlagged: false,
    });
  }
}