import { Module } from '@nestjs/common';
import { TasksService } from './tasks-service.service';
import { VpnConfigsService } from 'src/vpn-configs/vpn-configs.service';
import { VpnConfigsModule } from 'src/vpn-configs/vpn-configs.module';
import { PlansModule } from 'src/plans/plans.module';

@Module({
  imports: [VpnConfigsModule,PlansModule],
  exports: [TasksService],
  providers: [TasksService],
})
export class TasksServiceModule {}
