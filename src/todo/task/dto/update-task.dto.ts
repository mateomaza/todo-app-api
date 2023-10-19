import { IsOptional, IsString, IsBoolean, IsDate } from 'class-validator';

export class UpdateTaskDto {
  @IsOptional()
  @IsString({ message: 'Title must be a string' })
  title: string;

  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  description: string;

  @IsOptional()
  @IsBoolean({ message: 'Completed must be a boolean' })
  completed: boolean;

  @IsOptional()
  @IsDate({ message: 'Time must be a valid date' })
  time: Date;
}
