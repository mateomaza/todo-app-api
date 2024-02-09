import { Controller, Param, Delete, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt.auth.guard';
import { UserService } from './user.service';

@Controller('api/users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * Deletes a user based on MongoDB's _id.
   * The `id` parameter should be the string representation of MongoDB's ObjectId.
   *
   * @param id The user's _id as a string.
   */

  @Delete(':id/delete')
  @UseGuards(JwtAuthGuard)
  async deleteUser(@Param('id') id: string): Promise<void> {
    await this.userService.deleteUser(id);
    return;
  }
}
