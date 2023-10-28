import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { getModelForClass } from '@typegoose/typegoose';
import { UserSchema } from './user.model';
import { User } from './user.model';
import { UserService } from './user.service';

const UserModel = getModelForClass(User);

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: User.name,
        schema: UserSchema,
      },
    ]),
  ],
  providers: [UserService, UserModel],
  exports: [UserModel],
})
export class UserModule {}
