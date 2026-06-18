import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('plans')
export class Plan {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @Column('')
  name?: string;

  @Column('')
  domain?: string;
  @Column('')
  ip?: string;

  // قیمت به تومان
  @Column('bigint')
  price: string;

  // مدت اعتبار به روز (اختیاری؛ اگر خالی باشد یعنی بدون انقضا)
  @Column({ nullable: true })
  validityDays?: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
