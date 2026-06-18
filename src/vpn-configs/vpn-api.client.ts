import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { Plan } from 'src/plans/plan.entity';

/**
 * این کلاینت با دو endpoint سرور خارجی شما صحبت می‌کند:
 *   GET {VPN_API_BASE_URL}/create?publicKey=NAME
 *   GET {VPN_API_BASE_URL}/remove?publicKey=NAME
 *
 * ⚠️ نکته مهم: چون فرمت دقیق پاسخ این دو endpoint مشخص نبود، فعلاً فرض شده که:
 *   - پاسخ /create یا متن خام کانفیگ است یا JSON که در صورت نیاز باید این متد
 *     طبق فرمت واقعی اصلاح شود (مثلاً اگر پاسخ { config: "...", filePath: "..." } بود).
 *   - پاسخ /remove فقط برای موفقیت/خطا بررسی می‌شود و محتوایش استفاده نمی‌شود.
 * اگر بعد از تست فرمت واقعی را فهمیدید، فقط همین فایل را اصلاح کنید؛ بقیه پروژه
 * به این جزئیات وابسته نیست.
 */
@Injectable()
export class VpnApiClient {
  private readonly logger = new Logger(VpnApiClient.name);

  constructor(
    private readonly http: HttpService,
    private readonly configService: ConfigService,
  ) {
  }

  async createPeer(publicKey: string, ip: string): Promise<string> {
    const url = `http://${ip}:9800/create`;
    this.logger.log(`Calling create API => ${url}?publicKey=${publicKey}`);

    const response = await firstValueFrom(
      this.http.get(url, { params: { publicKey } }),
    );

    if (typeof response.data === 'string') {
      return response.data;
    }
    // اگر پاسخ JSON بود، کل آبجکت را به‌صورت متن ذخیره می‌کنیم تا چیزی از دست نرود
    return JSON.stringify(response.data);
  }

  async removePeer(publicKey: string ,ip:string
  ): Promise<void> {
    const url = `http://${ip}:9800/remove`;
    this.logger.log(`Calling remove API => ${url}?publicKey=${publicKey}`);
    await firstValueFrom(this.http.get(url, { params: { publicKey } }));

    return
  }
}
