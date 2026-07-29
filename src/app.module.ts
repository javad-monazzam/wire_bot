import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { UsersModule } from './users/users.module';
import { WalletModule } from './wallet/wallet.module';
import { PlansModule } from './plans/plans.module';
import { VpnConfigsModule } from './vpn-configs/vpn-configs.module';
import { BotModule } from './bot/bot.module';
import { TasksServiceModule } from './tasks-service/tasks-service.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: '79.133.46.86',
        port: 5432,
        username: 'wire_user',
        password: 'postgres123',
        database: 'wire_bot',
        autoLoadEntities: true,
        // فقط برای محیط توسعه؛ در پروداکشن از migration استفاده کنید
        synchronize: false,
      }),
    }),
    UsersModule,
    WalletModule,
    PlansModule,
    TasksServiceModule,
    VpnConfigsModule,
    BotModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
