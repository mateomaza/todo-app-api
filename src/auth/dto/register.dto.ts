import { IsNotEmpty, IsString } from 'class-validator';
export class RegisterDto {
  @IsNotEmpty()
  @IsString({ message: 'Username must be a string' })
  username: string;

  @IsNotEmpty()
  @IsString({ message: 'Password must be a string' })
  password: string;

  @IsNotEmpty()
  @IsString({ message: 'Email must be a string' })
  email: string;
}
