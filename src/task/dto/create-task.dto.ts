import { IsString, IsBoolean, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateTaskDto {
  @IsNotEmpty()
  @IsString({ message: 'Title must be a string' })
  title: string;

  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  description?: string;

  @IsNotEmpty()
  @IsBoolean({ message: 'Completed must be a boolean' })
  completed: boolean;

  @IsNotEmpty()
  @IsString({ message: 'Time must be an ISO date string' })
  time: string;

  @IsNotEmpty()
  @IsString({ message: 'UserId must be a string' })
  userId: string;
}
