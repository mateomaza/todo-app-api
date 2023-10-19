/* eslint-disable prettier/prettier */
import { Document } from 'mongoose';

export interface Task extends Document {
  title: string;
  description: string;
  completed: boolean;
}
