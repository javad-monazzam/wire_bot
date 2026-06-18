import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

export enum TransactionType {
  ADMIN_TOPUP = 'admin_topup',
  PURCHASE = 'purchase',
  REFUND = 'refund',
}

@Entity('transactions')
export class Transaction {
 @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (u) => u.transactions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: number;

  @Column({ type: 'enum', enum: TransactionType })
  type: TransactionType;

  // مقدار با علامت: مثبت = افزایش موجودی، منفی = کاهش موجودی
  @Column('bigint')
  amount: string;

  @Column('bigint')
  balanceAfter: string;

  @Column({ nullable: true })
  description?: string;

  // در صورتی که تراکنش توسط ادمین انجام شده، شناسه تلگرام ادمین
  @Column({ nullable: true })
  adminTelegramId?: string;

  @CreateDateColumn()
  createdAt: Date;
}
