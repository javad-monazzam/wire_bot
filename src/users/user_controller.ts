import{Controller, Get, Param, Query} from '@nestjs/common';
import { UsersService } from './users.service';
@Controller('user')
export class USerController {
  constructor(private readonly userService: UsersService) {}

@Get(':telegramId')
findUserConfigs(
  @Param('telegramId') telegramId: string,
) {
  return this.userService.findByTelegramId(+telegramId);
}   
}