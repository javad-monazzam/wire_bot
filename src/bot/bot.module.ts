import { Module } from '@nestjs/common';
import { TelegrafModule } from 'nestjs-telegraf';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BotUpdate } from './bot.update';
import { UsersModule } from '../users/users.module';
import { PlansModule } from '../plans/plans.module';
import { VpnConfigsModule } from '../vpn-configs/vpn-configs.module';
import { WalletModule } from '../wallet/wallet.module';
import { AdminGuard } from 'src/common/guards/admin.guard';

@Module({
  imports: [
    TelegrafModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        token: config.get<string>('BOT_TOKEN') as string,
      }),
    }),
    UsersModule,
    PlansModule,

    VpnConfigsModule,
    WalletModule,
  ],
  providers: [
    BotUpdate,
    AdminGuard,
  ],
})
export class BotModule { }
