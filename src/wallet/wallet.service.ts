import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { Transaction, TransactionType } from './transaction.entity';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(Transaction)
    private readonly txRepo: Repository<Transaction>,
    private readonly dataSource: DataSource,
  ) { }

  /**
   * شارژ دستی کیف پول کاربر توسط ادمین (تنها روش شارژ در این نسخه؛ بدون درگاه پرداخت آنلاین)
   */
  async adminTopUp(
    userId: number,
    amount: number,
    adminTelegramId: number,
    description?: string,
  ): Promise<User> {
    if (amount <= 0) {
      throw new BadRequestException('مقدار شارژ باید مثبت باشد.');
    }
    return this.dataSource.transaction(async (manager) => {
      const user = await manager.findOneOrFail(User, { where: { id: userId } });
      const newBalance = BigInt(user.balance) + BigInt(amount);
      user.balance = newBalance.toString();
      await manager.save(user);

      const tx = new Transaction();

      tx.userId = user.id;
      tx.type = TransactionType.ADMIN_TOPUP;
      tx.amount = amount.toString();
      tx.balanceAfter = user.balance;
      tx.adminTelegramId = adminTelegramId.toString();
      tx.description = description;

      await manager.save(tx);

      return user;
    });
  }

  /**
   * کسر مقدار از موجودی کاربر (برای خرید). در صورت ناکافی بودن موجودی خطا می‌دهد.
   * اگر manager از بیرون پاس داده شود (مثلاً در یک تراکنش بزرگ‌تر هنگام خرید کانفیگ)،
   * از همان manager استفاده می‌شود تا اتمیک بماند.
   */
  async debit(
    userId: number,
    amount: number,
    description?: string,
    manager?: EntityManager,
  ): Promise<User> {
    const run = async (m: EntityManager): Promise<User> => {
      const user = await m.findOneOrFail(User, { where: { id: userId } });
      const currentBalance = BigInt(user.balance);
      const amt = BigInt(amount);
      if (currentBalance < amt) {
        throw new BadRequestException('موجودی کیف پول کافی نیست. لطفا ابتدا کیف پول خود را شارژ کنید.');
      }
      user.balance = (currentBalance - amt).toString();
      await m.save(user);

      const tx = m.create(Transaction, {
        userId: user.id,
        type: TransactionType.PURCHASE,
        amount: (-amount).toString(),
        balanceAfter: user.balance,
        description,
      });
      await m.save(tx);

      return user;
    };

    if (manager) {
      return run(manager);
    }
    return this.dataSource.transaction(run);
  }
}
