import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { UsersModule } from './users/users.module';
import { WalletModule } from './wallet/wallet.module';
import { PlansModule } from './plans/plans.module';
import { VpnConfigsModule } from './vpn-configs/vpn-configs.module';
import { BotModule } from './bot/bot.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get('DB_USERNAME', 'postgres'),
        password: config.get('DB_PASSWORD', 'postgres'),
        database: config.get('DB_NAME', 'vpn_bot'),
        autoLoadEntities: true,
        // فقط برای محیط توسعه؛ در پروداکشن از migration استفاده کنید
        synchronize: config.get('DB_SYNCHRONIZE', 'true') === 'true',
      }),
    }),
    UsersModule,
    WalletModule,
    PlansModule,
    VpnConfigsModule,
    BotModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
