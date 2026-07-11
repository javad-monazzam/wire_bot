import { UseGuards } from '@nestjs/common';
import { Action, Command, Ctx, Hears, Start, Update } from 'nestjs-telegraf';
import { Context, Markup } from 'telegraf';
import { UsersService } from '../users/users.service';
import { PlansService } from '../plans/plans.service';
import { VpnConfigsService } from '../vpn-configs/vpn-configs.service';
import { WalletService } from '../wallet/wallet.service';
import { AdminGuard } from '../common/guards/admin.guard';
import { VpnConfigStatus } from '../vpn-configs/vpn-config.entity';
import QRCode from 'qrcode';
const fmt = (n: number | string) => Number(n).toLocaleString('fa-IR');

const MAIN_MENU = Markup.keyboard([
  ['🛒 خرید کانفیگ', '📂 کانفیگ‌های من'],
  ['👤 حساب من', '📞 ارتباط با ادمین'],
]).resize();

@Update()
export class BotUpdate {
  constructor(
    private readonly usersService: UsersService,
    private readonly plansService: PlansService,
    private readonly vpnConfigsService: VpnConfigsService,
    private readonly walletService: WalletService,
  ) { }

  // ===================== کاربر عادی =====================

  @Start()
  async onStart(@Ctx() ctx: Context) {
    const tgUser = ctx.from!;
    await this.usersService.findOrCreate(
      tgUser.id,
      tgUser.username,
      tgUser.first_name,
    );
    await ctx.reply(
      `سلام ${tgUser.first_name || ''} 👋\n` +
      `به ربات فروش کانفیگ خوش آمدید.\n\n` +
      `🆔 شناسه عددی شما: ${tgUser.id}\n` +
      `برای شارژ کیف پول، این شناسه را برای ادمین ارسال کنید.`,
      MAIN_MENU,
    );
  }

  @Hears('👤 حساب من')
  async myAccount(@Ctx() ctx: Context) {
    const user = await this.usersService.findByTelegramId(ctx.from!.id);
    if (!user) return ctx.reply('لطفا ابتدا دستور /start را ارسال کنید.');

    await ctx.reply(
      `👤 حساب کاربری\n` +
      `🆔 شناسه عددی: ${user.telegramId}\n` +
      `💰 موجودی کیف پول: ${fmt(user.balance)} تومان`,
    );
  }

  @Hears('🛒 خرید کانفیگ')
  async showPlans(@Ctx() ctx: Context) {
    const plans = await this.plansService.findAllActive();
    if (!plans.length) {
      return ctx.reply('در حال حاضر هیچ پلنی برای فروش موجود نیست.');
    }
    const buttons = plans.map((p) => [
      Markup.button.callback(`${p.name} — ${fmt(p.price)} تومان`, `buy_plan:${p.id}`),
    ]);
    await ctx.reply('یک پلن را انتخاب کنید:', Markup.inlineKeyboard(buttons));
  }

  @Action(/^buy_plan:(.+)$/)
  async confirmPurchase(@Ctx() ctx: any) {
    const planId = ctx.match[1];
    const plan = await this.plansService.findActiveById(planId);
    if (!plan) {
      return ctx.answerCbQuery('این پلن دیگر موجود نیست.');
    }
    await ctx.answerCbQuery();
    await ctx.reply(
      `پلن «${plan.name}» به قیمت ${fmt(plan.price)} تومان.\nآیا خرید را تایید می‌کنید؟`,
      Markup.inlineKeyboard([
        Markup.button.callback('✅ تایید و خرید', `confirm_buy:${plan.id}`),
        Markup.button.callback('❌ انصراف', 'cancel_buy'),
      ]),
    );
  }

  @Action('cancel_buy')
  async cancelBuy(@Ctx() ctx: any) {
    await ctx.answerCbQuery('خرید لغو شد.');
    await ctx.editMessageText('خرید لغو شد.');
  }

  @Action(/^confirm_buy:(.+)$/)
  async doPurchase(@Ctx() ctx: any) {
    const planId = ctx.match[1];
    const user = await this.usersService.findByTelegramId(ctx.from.id.toString());
    if (!user) {
      return ctx.answerCbQuery('ابتدا دستور /start را ارسال کنید.');
    }

    await ctx.answerCbQuery('در حال پردازش...');
    try {
      const config = await this.vpnConfigsService.purchase(user.id, planId);
      await ctx.editMessageText('✅ خرید با موفقیت انجام شد!');

      if (config.rawConfig) {
        await ctx.replyWithDocument(
          { source: Buffer.from(config.rawConfig, 'utf-8'), filename: `${config.publicKey}.conf` },
          { caption: `کانفیگ شما (${config.publicKey}) آماده است.` },
        );
        const qrBuffer = await QRCode.toBuffer(config.rawConfig);

        await ctx.replyWithPhoto(
          { source: qrBuffer },
          {
            caption: `QR Code کانفیگ ${config.publicKey}`,
          },
        );
      } else {
        await ctx.reply(`کانفیگ شما با شناسه ${config.publicKey} ساخته شد.`);
      }
    } catch (err: any) {
      await ctx.editMessageText(`❌ خطا در خرید: ${err?.message || 'لطفا بعدا تلاش کنید.'}`);
    }
  }

  @Hears('📂 کانفیگ‌های من')
  async myConfigs(@Ctx() ctx: Context) {
    const user = await this.usersService.findByTelegramId(ctx.from!.id);
    if (!user) return ctx.reply('لطفا ابتدا دستور /start را ارسال کنید.');

    const configs = await this.vpnConfigsService.findUserConfigs(user.id);


    if (!configs.length) {
      return ctx.reply('شما هنوز هیچ کانفیگی نخریده‌اید.');
    }

    for (const c of configs) {
      const statusEmoji = c.status === VpnConfigStatus.ACTIVE ? '🟢 فعال' : '🔴 حذف‌شده';

      const now = new Date();
      if (!c.expiresAt) {
        return
      }
      const expiresAt = new Date(c.expiresAt);

      const remainingDays = Math.max(
        0,
        Math.ceil(
          (expiresAt.getTime() - now.getTime()) /
          (1000 * 60 * 60 * 24)
        )
      );

      const createdAt = new Date(c.createdAt);
      const expireDate = new Date(createdAt);
      const buttons =
        c.status === VpnConfigStatus.ACTIVE
          ? Markup.inlineKeyboard([
            Markup.button.callback('🗑 حذف   کانفیگ', `remove_config:${c.id}`),
            Markup.button.callback(' تمدید  کانفیگ', `renewal_config:${c.id}`),
            Markup.button.callback('📱 QR Code', `qr_config:${c.id}`)
          ])
          : undefined;

      await ctx.reply(
        `${statusEmoji}                               شناسه: ${c.publicKey}\n` +
        `تاریخ خرید: ${c.createdAt.toLocaleDateString('fa-IR')}           روزهای باقی‌مانده: ${remainingDays}\n`,
        buttons,
      );
    }
  }

  @Action(/^remove_config:(.+)$/)
  async removeConfigHandler(@Ctx() ctx: any) {
    const configId = ctx.match[1];
    const user = await this.usersService.findByTelegramId(ctx.from.id.toString());
    if (!user) return ctx.answerCbQuery('ابتدا دستور /start را ارسال کنید.');

    try {
      await this.vpnConfigsService.removeConfig(configId);
      await ctx.answerCbQuery('کانفیگ حذف شد.');
      await ctx.editMessageText('🗑 این کانفیگ حذف شد.');
    } catch (err: any) {
      await ctx.answerCbQuery('خطا در حذف کانفیگ.');
    }
  }
  // تمدید
  @Action(/^renewal_config:(.+)$/)
  async renewalConfigHandler(@Ctx() ctx: any) {
    const configId = Number(ctx.match[1]);

    const user = await this.usersService.findByTelegramId(
      ctx.from.id.toString(),
    );

    if (!user) {
      return ctx.answerCbQuery('ابتدا دستور /start را ارسال کنید.');
    }

    try {
      const config = await this.vpnConfigsService.renewConfig(
        user.id,
        configId,
      );

      await ctx.answerCbQuery('کانفیگ تمدید شد.');

      await ctx.editMessageText(
        `✅ کانفیگ تمدید شد

📅 تاریخ انقضای جدید:
${config.expiresAt?.toLocaleDateString('fa-IR')}`
      );

    } catch (err: any) {
      await ctx.answerCbQuery(
        err?.message || 'خطا در تمدید کانفیگ'
      );
    }
  }

  // بارکد
  @Action(/^qr_config:(.+)$/)
  async qrConfig(@Ctx() ctx: any) {

    const configId = Number(ctx.match[1]);

    const config = await this.vpnConfigsService.findConfig(configId);

    if (!config) {
      return ctx.answerCbQuery('کانفیگ پیدا نشد');
    }

    const qrBuffer = await QRCode.toBuffer(config.rawConfig);

    await ctx.replyWithPhoto(
      { source: qrBuffer },
      {
        caption: `QR Code کانفیگ ${config.publicKey}`,
      },
    );

    await ctx.answerCbQuery();
  }

  // ===================== دستورات ادمین =====================

  @Command('charge')
  @UseGuards(AdminGuard)
  async chargeUser(@Ctx() ctx: any) {
    const text = ctx.message.text;
    const parts = text.split(' ').filter(Boolean);
    // فرمت: /charge <شناسه_عددی_کاربر> <مقدار_تومان> [توضیح]
    if (parts.length < 3) {
      return ctx.reply('فرمت صحیح:\n/charge <شناسه_عددی_کاربر> <مقدار_تومان> [توضیح]');
    }

    const [, telegramId, amountStr, ...descParts] = parts;
    const amount = parseInt(amountStr, 10);
    if (!telegramId || isNaN(amount) || amount <= 0) {
      return ctx.reply('مقدار وارد شده نامعتبر است.');
    }

    const user = await this.usersService.findByTelegramId(telegramId);
    if (!user) {
      return ctx.reply('کاربری با این شناسه یافت نشد. کاربر باید حداقل یک‌بار /start را زده باشد.');
    }

    const description = descParts.join(' ') || 'شارژ دستی توسط ادمین';
    const updated = await this.walletService.adminTopUp(
      user.id,
      amount,
      ctx.from.id.toString(),
      description,
    );

    await ctx.reply(
      `✅ کیف پول کاربر ${telegramId} به مقدار ${fmt(amount)} تومان شارژ شد.\n` +
      `موجودی جدید: ${fmt(updated.balance)} تومان`,
    );
  }

  @Command('addplan')
  @UseGuards(AdminGuard)
  async addPlan(@Ctx() ctx: any) {
    const text = ctx.message.text as string;
    const args = text.replace('/addplan', '').trim();
    // فرمت: نام|قیمت|روزاعتبار|توضیح
    const [name, price, validityDays, ip] = args.split('|').map((s) => s?.trim());

    if (!name || !price || isNaN(Number(price))) {
      return ctx.reply(
        'فرمت صحیح:\n/addplan نام پلن|قیمت|روز اعتبار|توضیحات\n' +
        'مثال:\n/addplan یک ماهه|80000|30|کانفیگ یک ماهه پرسرعت',
      );
    }

    const plan = await this.plansService.create({
      name,
      price: Number(price),
      validityDays: validityDays ? Number(validityDays) : undefined,
      ip,
    });

    await ctx.reply(`✅ پلن «${plan.name}» با قیمت ${fmt(plan.price)} تومان ساخته شد.`);
  }

  @Command('plans')
  @UseGuards(AdminGuard)
  async listPlansAdmin(@Ctx() ctx: Context) {
    const plans = await this.plansService.findAll();
    if (!plans.length) return ctx.reply('هیچ پلنی ثبت نشده است.');

    const text = plans
      .map(
        (p) =>
          `${p.isActive ? '🟢' : '🔴'} ${p.name}\n` +
          `شناسه: ${p.id}\n` +
          `قیمت: ${fmt(p.price)} تومان\n` +
          `اعتبار: ${p.validityDays ?? '∞'} روز`,
      )
      .join('\n\n');

    await ctx.reply(text);
  }

  @Command('deactivateplan')
  @UseGuards(AdminGuard)
  async deactivatePlan(@Ctx() ctx: any) {
    const text = ctx.message.text as string;
    const planId = text.split(' ')[1];
    if (!planId) return ctx.reply('فرمت صحیح: /deactivateplan <شناسه پلن>');

    await this.plansService.deactivate(+planId);
    await ctx.reply('پلن غیرفعال شد.');
  }

  @Command('finduser')
  @UseGuards(AdminGuard)
  async findUser(@Ctx() ctx: any) {
    const id = ctx.message.text;
    const telegramId = id.split(' ')[1];
    if (!telegramId) return ctx.reply('فرمت صحیح: /finduser <شناسه عددی>');

    const user = await this.usersService.findByTelegramId(telegramId);
    if (!user) return ctx.reply('کاربر یافت نشد.');

    const configs = await this.vpnConfigsService.findUserConfigs(user.id);
    await ctx.reply(
      `👤 ${user.username ? '@' + user.username : telegramId}\n` +
      `موجودی: ${fmt(user.balance)} تومان\n` +
      `تعداد کانفیگ‌ها: ${configs.length}`,
    );
  }
}
