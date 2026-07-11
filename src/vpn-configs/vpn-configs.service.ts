import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { VpnConfig, VpnConfigStatus } from './vpn-config.entity';
import { PlansService } from '../plans/plans.service';
import { WalletService } from '../wallet/wallet.service';
import { VpnApiClient } from './vpn-api.client';

@Injectable()
export class VpnConfigsService {
  constructor(
    @InjectRepository(VpnConfig) private readonly repo: Repository<VpnConfig>,
    private readonly plansService: PlansService,
    private readonly walletService: WalletService,
    private readonly vpnApiClient: VpnApiClient,
    private readonly dataSource: DataSource,
  ) { }

  /**
   * فرایند کامل خرید: کسر موجودی + فراخوانی API ساخت + ذخیره رکورد، همه در یک تراکنش دیتابیس.
   * اگر فراخوانی API سرور خارجی شکست بخورد، کسر موجودی هم rollback می‌شود.
   */
  async purchase(userId: number, planId: number): Promise<VpnConfig> {
    const plan = await this.plansService.findActiveById(planId);
    if (!plan) {
      throw new NotFoundException('این پلن دیگر موجود نیست.');
    }

    return this.dataSource.transaction(async (manager) => {
      await this.walletService.debit(
        userId,
        Number(plan.price),
        `خرید پلن ${plan.name}`,
        manager,
      );

      const publicKey = this.generatePublicKey();

      let rawConfig: string;
      const ip = plan.ip
      const domein = plan.domain
      if (!ip || !domein) {
        throw new InternalServerErrorException(
          'برای این پلن IP سرور وایرگارد تنظیم نشده است.',
        );
      }
      try {
        const conf = await this.vpnApiClient.createPeer(publicKey, ip);
        function modifyConfig(config: any, domain: string) {
          let lines = config.split('\n');

          let interfaceIndex = lines.findIndex((line) =>
            line.startsWith('[Interface]')
          );

          let peerIndex = lines.findIndex((line) =>
            line.startsWith('[Peer]')
          );

          // Add MTU
          let mtuLine = 'MTU = 1280';
          if (!lines.includes(mtuLine)) {
            lines.splice(interfaceIndex + 4, 0, mtuLine);
          }

          // Add PersistentKeepalive
          let keepaliveLine = 'PersistentKeepalive = 21';
          if (!lines.includes(keepaliveLine)) {
            lines.splice(peerIndex + 4, 0, keepaliveLine);
          }

          // Replace Endpoint IP with Domain
          let endpointIndex = lines.findIndex((line) =>
            line.startsWith('Endpoint =')
          );

          if (endpointIndex !== -1) {
            let oldEndpoint = lines[endpointIndex];

            // نگه داشتن پورت قبلی
            let port = oldEndpoint.split(':').pop();

            lines[endpointIndex] = `Endpoint = ${domain}:${port}`;
          }

          return lines.join('\n');
        }
        const newConfig = modifyConfig(conf, domein);
        rawConfig = newConfig

      } catch (err) {
        throw new InternalServerErrorException(
          'خطا در ارتباط با سرور وایرگارد. لطفا چند دقیقه دیگر دوباره تلاش کنید یا با ادمین تماس بگیرید.',
        );
      }

      const expiresAt = plan.validityDays
        ? new Date(Date.now() + plan.validityDays * 24 * 60 * 60 * 1000)
        : undefined;

      const config = manager.create(VpnConfig, {
        userId,
        planId: plan.id,
        publicKey,
        rawConfig,
        pricePaid: plan.price,
        expiresAt,
      });

      return manager.save(config);
    });
  }

  // تمدید سرویس
  async renewConfig(userId: number, configId: number): Promise<VpnConfig> {
    console.log(userId,configId);
    
    return this.dataSource.transaction(async (manager) => {

      // پیدا کردن کانفیگ کاربر
      const config = await manager.findOne(VpnConfig, {
        where: {
          id: configId,
          userId,
        },
      });

      if (!config?.planId) {
        throw new NotFoundException('کانفیگ پیدا نشد.');
      }


      // پیدا کردن پلن
      const plan = await this.plansService.findActiveById(config.planId);

      if (!plan) {
        throw new NotFoundException('پلن این کانفیگ موجود نیست.');
      }


      // کم کردن مبلغ از کیف پول
      await this.walletService.debit(
        userId,
        Number(plan.price),
        `تمدید پلن ${plan.name}`,
        manager,
      );


      // افزایش تاریخ انقضا
      const oldExpire =
        config.expiresAt && config.expiresAt > new Date()
          ? new Date(config.expiresAt)
          : new Date();

      if (plan.validityDays)
        oldExpire.setDate(
          oldExpire.getDate() + plan.validityDays
        );


      config.expiresAt = oldExpire;


      return await manager.save(VpnConfig, config);
    });
  }


  // delete config
  async removeConfig(Id: number): Promise<void> {
    const where: any = { id: Id };
    const config = await this.repo.findOne({ where });

    if (!config) {
      throw new NotFoundException('کانفیگ یافت نشد.');
    }

    if (config.status === VpnConfigStatus.REMOVED) {
      return;
    }

    const publicKey = config.publicKey;


    if (!config?.planId ){ throw new NotFoundException('کانفیگ یافت نشد.');} 
      const plan = await this.plansService.findActiveById(config.planId);

      const ip = plan?.ip
      if (!ip) {
       throw new NotFoundException('کانفیگ یافت نشد.');
      }
      await this.vpnApiClient.removePeer(publicKey, ip);
    

    config.status = VpnConfigStatus.REMOVED;
    await this.repo.save(config);
  }
  findUserConfigs(userId: number): Promise<VpnConfig[]> {
    return this.repo.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }
async findConfig(id: number): Promise<VpnConfig | null> {
  return this.repo.findOne({
    where: { id },
  });
}

  findAllActive(): Promise<VpnConfig[]> {
    return this.repo.find({
      where: { status: VpnConfigStatus.ACTIVE },
      order: { createdAt: 'DESC' },
    });
  }

  private generatePublicKey(): string {
    function randomTitle(length: number = 8): string {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let result = '';
      for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    }
    const rand = randomTitle();
    return `${rand}`;
  }
}
