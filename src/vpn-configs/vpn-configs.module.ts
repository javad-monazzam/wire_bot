import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { VpnConfig } from './vpn-config.entity';
import { VpnConfigsService } from './vpn-configs.service';
import { VpnApiClient } from './vpn-api.client';
import { PlansModule } from '../plans/plans.module';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([VpnConfig]),
    HttpModule.register({ timeout: 10000, maxRedirects: 3 }),
    PlansModule,
    WalletModule,
  ],
  providers: [VpnConfigsService, VpnApiClient],
  exports: [VpnConfigsService],
})
export class VpnConfigsModule {}
