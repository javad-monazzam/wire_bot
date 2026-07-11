import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { VpnConfigsService } from './vpn-configs.service';
@Controller('config')
export class VpnConfigsController {
  constructor(private readonly vpnConfigsService: VpnConfigsService) { }

  @Post('renew')
  renewConfig(
    @Body() body: { userId: number; configId: number }
  ) {
    console.log(body);

    return this.vpnConfigsService.renewConfig(
      body.userId,
      body.configId
    );
  }
  @Get(':id')
  findUserConfigs(@Param('id') id: string) {
    return this.vpnConfigsService.findUserConfigs(+id);
  }
   @Delete(':id')
  remove(@Param('id') id: string) {
    return this.vpnConfigsService.removeConfig(+id)
  }
}