import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Plan } from '../plans/plan.entity';

export enum VpnConfigStatus {
  ACTIVE = 'active',
  REMOVED = 'removed',
}

@Entity('vpn_configs')
export class VpnConfig {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  @ManyToOne(() => User, (u) => u.vpnConfigs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: number;

  @ManyToOne(() => Plan, { nullable: true })
  @JoinColumn({ name: 'planId' })
  plan?: Plan;

  @Column()
  planId?: number;

  // شناسه‌ای که به‌عنوان پارامتر publicKey به سرور خارجی ارسال می‌شود
  @Column({ unique: true })
  publicKey: string;

  // پاسخ خام دریافتی از endpoint ساخت (مثلا محتوای فایل کانفیگ)
  @Column({ type: 'text', nullable: true })
  rawConfig?: string;

  @Column({ type: 'enum', enum: VpnConfigStatus, default: VpnConfigStatus.ACTIVE })
  status: VpnConfigStatus;

  @Column('bigint')
  pricePaid: string;

  @Column({ nullable: true })
  expiresAt?: Date;

  @CreateDateColumn()
  createdAt: Date;
}
