import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { Plan } from 'src/plans/plan.entity';

/**
 *
 * ⚠️ نکته: پاسخ /vpn/create متن خام کانفیگ (Content-Type: text/plain) است.
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
    const url = `http://${ip}:4500/vpn/create`;
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
    const url = `http://${ip}:5500/vpn/remove`;
    this.logger.log(`Calling remove API => ${url}?publicKey=${publicKey}`);
    await firstValueFrom(this.http.get(url, { params: { publicKey } }));

    return
  }

  // غیرفعال کردن کاربر روی سرور (comment کردن بلاک پیر در wg0.conf) — بدون حذف کامل
  async deactivatePeer(publicKey: string, ip: string): Promise<void> {
    const url = `http://${ip}:4500/vpn/deactivate`;
    this.logger.log(`Calling deactivate API => ${url}?publicKey=${publicKey}`);
    await firstValueFrom(this.http.get(url, { params: { publicKey } }));
  }

  // فعال کردن دوباره کاربر روی سرور (uncomment کردن بلاک پیر) — مثلا بعد از تمدید
  async activatePeer(publicKey: string, ip: string): Promise<void> {
    const url = `http://${ip}:4500/vpn/activate`;
    this.logger.log(`Calling activate API => ${url}?publicKey=${publicKey}`);
    await firstValueFrom(this.http.get(url, { params: { publicKey } }));
  }
}
