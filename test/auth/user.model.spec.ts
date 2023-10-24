import { getModelForClass } from '@typegoose/typegoose';
import { User } from 'src/auth/user/user.model';

describe('User Model', () => {
  it('should create a user instance', () => {
    const UserModel = getModelForClass(User);
    const user = new UserModel({ username: 'testuser' });
    expect(user.username).toEqual('testuser');
  });
});
