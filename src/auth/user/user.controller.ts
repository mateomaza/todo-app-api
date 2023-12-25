import { Controller, Param, Delete, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt.auth.guard';
import { UserService } from './user.service';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Delete(':id/delete')
  @UseGuards(JwtAuthGuard)
  async deleteUser(@Param('id') id: string): Promise<void> {
    await this.userService.deleteUser(id);
    return;
  }
}
