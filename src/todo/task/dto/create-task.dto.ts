import { IsString, IsBoolean, IsDate } from 'class-validator';

export class CreateTaskDto {
  @IsString({ message: 'Title must be a string' })
  title: string;

  @IsString({ message: 'Description must be a string' })
  description: string;

  @IsBoolean({ message: 'Completed must be a boolean' })
  completed: boolean;

  @IsDate({ message: 'Time must be a valid date' })
  time: Date;
}
