import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf, Markup, Context } from 'telegraf';
import { VpnConfigsService } from '../vpn-configs/vpn-configs.service';

@Injectable()
export class VpnExpiryNotifierCron {
  private readonly logger = new Logger(VpnExpiryNotifierCron.name);

  constructor(
    @InjectBot() private readonly bot: Telegraf<Context>,
    private readonly vpnConfigsService: VpnConfigsService,
  ) {}

  // هر ساعت: اکانت‌های منقضی را غیرفعال می‌کند و به کاربرشان پیام + دکمه‌ی تمدید می‌فرستد
  @Cron(CronExpression.EVERY_HOUR)
  async notifyDeactivatedUsers(): Promise<void> {
    const deactivated = await this.vpnConfigsService.findAndDeactivateExpired();

    for (const config of deactivated) {
      if (!config.user) {
        this.logger.warn(`کانفیگ #${config.id} کاربر مرتبط ندارد، پیام ارسال نشد`);
        continue;
      }

      try {
        await this.bot.telegram.sendMessage(
          config.user.telegramId,
          `⛔️ اکانت شما (${config.publicKey}) منقضی شد و به همین دلیل غیرفعال گردید.\n\n` +
            `در صورت تمایل می‌توانید با دکمه‌ی زیر آن را تمدید کنید. اگر تا ۵ روز دیگر تمدید نشود، اکانت کاملا حذف خواهد شد.`,
          Markup.inlineKeyboard([
            Markup.button.callback('🔄 تمدید اکانت', `renewal_config:${config.id}`),
          ]),
        );
      } catch (err) {
        // مثلا کاربر بات را بلاک کرده؛ نباید مانع ارسال پیام به بقیه‌ی کاربران شود
        this.logger.warn(
          `ارسال پیام غیرفعال‌سازی به کاربر ${config.user.telegramId} (کانفیگ #${config.id}) ناموفق بود`,
          err as any,
        );
      }
    }
  }

  // هر ساعت: اکانت‌هایی که بیش از ۵ روز از انقضایشان گذشته را کامل حذف می‌کند
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupLongExpired(): Promise<void> {
    await this.vpnConfigsService.findAndDeleteLongExpired();
  }
}
