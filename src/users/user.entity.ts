import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
} from 'typeorm';
import { Transaction } from '../wallet/transaction.entity';
import { VpnConfig } from '../vpn-configs/vpn-config.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn({ type: 'int' })
  id: number;

  // شناسه عددی تلگرام کاربر (به‌صورت رشته ذخیره می‌شود تا از مشکلات دقت عددی جلوگیری شود)
  @Column({ unique: true })
  telegramId: number;

  @Column({ nullable: true })
  username?: string;

  @Column({ nullable: true })
  firstName?: string;

  // موجودی کیف پول به تومان، بدون اعشار
  @Column('bigint', { default: 0 })
  balance: string;

  @Column({ default: false })
  isBlocked: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => Transaction, (t) => t.user)
  transactions: Transaction[];

  @OneToMany(() => VpnConfig, (c) => c.user)
  vpnConfigs: VpnConfig[];
}
