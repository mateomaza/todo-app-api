import { User } from '../user/user.model';

export class UserResponseDto {
  username: string;
  email: string;
  createdAt: Date;

  constructor(user: User) {
    this.username = user.username;
    this.email = user.email;
    this.createdAt = user.createdAt;
  }
}
