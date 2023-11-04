import { LocalStrategy } from './local.strategy';
import { UserService } from './user/user.service';
import { Test, TestingModule } from '@nestjs/testing';
import { User } from './user/user.model';
import { v4 as uuidv4 } from 'uuid';

const mockCreatedUser: Partial<User> = {
  id: uuidv4(),
  username: 'new_user',
  password: 'correct_password',
  email: 'new_email@example.com',
  createdAt: new Date(),
};

describe('LocalStrategy', () => {
  let localStrategy: LocalStrategy;
  let userService: jest.Mocked<UserService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocalStrategy,
        {
          provide: UserService,
          useValue: {
            findOneByUsername: jest.fn(),
          },
        },
      ],
    }).compile();
    localStrategy = module.get<LocalStrategy>(LocalStrategy);
    userService = module.get(UserService);
  });

  it('should validate and return a user for correct credentials', async () => {
    userService.findOneByUsername.mockResolvedValue(mockCreatedUser as User);
    const result = await localStrategy.validate('new_user', 'correct_password');
    expect(result).toBeDefined();
    expect(result).toEqual(mockCreatedUser);
  });

  it('should return null if user is not found', async () => {
    userService.findOneByUsername.mockResolvedValue(null);
    const result = await localStrategy.validate('non_existent', 'password');
    expect(result).toBeNull();
  });

  it('should return null if password is incorrect', async () => {
    userService.findOneByUsername.mockResolvedValue(mockCreatedUser as User);
    const result = await localStrategy.validate(
      'new_user',
      'incorrect_password',
    );
    expect(result).toBeNull();
  });
});
