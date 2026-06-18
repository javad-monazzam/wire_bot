import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Plan } from './plan.entity';

interface CreatePlanInput {
  name: string;
  price: number;
  validityDays?: number;
  ip?: string;
}

@Injectable()
export class PlansService {
  constructor(@InjectRepository(Plan) private readonly repo: Repository<Plan>) {}

  findAllActive(): Promise<Plan[]> {
    return this.repo.find({ where: { isActive: true }, order: { price: 'ASC' } });
  }

  findAll(): Promise<Plan[]> {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  findActiveById(id: number): Promise<Plan | null> {
    return this.repo.findOne({ where: { id, isActive: true } });
  }

  async create(input: CreatePlanInput): Promise<Plan> {
    const plan = this.repo.create({
      name: input.name,
      price: input.price.toString(),
      validityDays: input.validityDays,
      ip: input.ip,
    });
    return this.repo.save(plan);
  }

  async deactivate(id: number): Promise<void> {
    await this.repo.update({ id }, { isActive: false });
  }
}
