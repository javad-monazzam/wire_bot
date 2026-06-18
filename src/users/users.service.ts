import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private readonly repo: Repository<User>) {}

  findByTelegramId(telegramId: number): Promise<User | null> {
    return this.repo.findOne({ where: { telegramId } });
  }

  findById(id: number): Promise<User | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findOrCreate(
    telegramId: number,
    username?: string,
    firstName?: string,
  ): Promise<User> {
    let user = await this.findByTelegramId(telegramId);
    if (!user) {
      user = this.repo.create({ telegramId, username, firstName, balance: '0' });
      user = await this.repo.save(user);
    } else if (user.username !== username || user.firstName !== firstName) {
      user.username = username;
      user.firstName = firstName;
      user = await this.repo.save(user);
    }
    return user;
  }

  async countAll(): Promise<number> {
    return this.repo.count();
  }
}
