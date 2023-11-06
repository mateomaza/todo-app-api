import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsNotEmpty()
  @IsString({ message: 'Username must be a string' })
  username: string;

  @IsNotEmpty()
  @IsString({ message: 'Password must be a string' })
  password: string;
}
