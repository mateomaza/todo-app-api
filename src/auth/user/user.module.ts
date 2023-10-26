import { Module } from '@nestjs/common';
import { getModelForClass } from '@typegoose/typegoose';
import { User } from './user.model';
import { UserService } from './user.service';

@Module({
  providers: [
    {
      provide: 'UserModelToken',
      useFactory: () => getModelForClass(User),
    },
    UserService,
  ],
  exports: ['UserModelToken', UserService],
})
export class UserModule {}
