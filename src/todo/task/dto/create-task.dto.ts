import {
  IsString,
  IsBoolean,
  IsDate,
  IsNotEmpty,
  IsOptional,
} from 'class-validator';

export class CreateTaskDto {
  @IsNotEmpty()
  @IsString({ message: 'Title must be a string' })
  title: string;

  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  description: string;

  @IsNotEmpty()
  @IsBoolean({ message: 'Completed must be a boolean' })
  completed: boolean;

  @IsNotEmpty()
  @IsDate({ message: 'Time must be a valid date' })
  time: Date;
}
