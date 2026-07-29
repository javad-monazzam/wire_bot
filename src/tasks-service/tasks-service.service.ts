import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, Interval, Timeout } from '@nestjs/schedule';
import axios from 'axios';
import { PlansService } from 'src/plans/plans.service';
import { VpnConfigsService } from 'src/vpn-configs/vpn-configs.service';
@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);
  constructor(
    private readonly vpnConfigsService: VpnConfigsService,
    private readonly planService: PlansService,
  ) { }
  @Cron('0 47 * * * *', {
    timeZone: 'Asia/Tehran',
  })
  async handleCron() {
    this.logger.debug('Checking expired VPN configs');

    const services = await this.vpnConfigsService.findAllActive();

    for (let index = 0; index < services.length; index++) {
      const config = services[index];

      if (!config.expiresAt || !config.planId) {
        return
      }
      const today = new Date()
      if (config.expiresAt < today) {
        
        const plan = await this.planService.findPlanById(config?.planId)
        console.log(plan?.ip);
        const res = await axios.get(
          `http://${plan?.ip}:5500/disable?publicKey=${config.publicKey}`,
        );
        console.log(res);
        const delete_service = await axios.get(
          `http://${plan?.ip}:5500/vpn/remove?publicKey=${config.publicKey}`,
        );

        console.log('Expired:', config.expiresAt, today, config.publicKey);

      }
    }
  }
}
