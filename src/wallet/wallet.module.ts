import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from './transaction.entity';
import { User } from '../users/user.entity';
import { WalletService } from './wallet.service';

@Module({
  imports: [TypeOrmModule.forFeature([Transaction, User])],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}
