import { LocalStrategy } from './local.strategy';
import { UserService } from './user/user.service';
import { Test, TestingModule } from '@nestjs/testing';
import { User, UserSchema } from './user/user.model';
import { v4 as uuidv4 } from 'uuid';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { AuditLogService } from 'src/audit/audit-log.service';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { RedisService } from 'src/common/redis.service';
import * as bcrypt from 'bcrypt';

const hashedPassword = bcrypt.hashSync('correct_password', 10);

const mockCreatedUser: Partial<User> = {
  id: uuidv4(),
  username: 'new_user',
  password: hashedPassword,
  email: 'new_email@example.com',
  createdAt: new Date(),
};

describe('LocalStrategy', () => {
  let localStrategy: LocalStrategy;
  let userService: jest.Mocked<UserService>;
  let mongoMemoryServer: MongoMemoryServer;
  let mockRedisService: jest.Mocked<RedisService>;

  const mockAuthService: Partial<AuthService> = {
    incrementFailedLoginAttempts: jest.fn(),
    resetFailedLoginAttempts: jest.fn(),
  };

  const mockAuditLogService: Partial<AuditLogService> = {
    logEntry: jest.fn(),
  };

  beforeEach(async () => {
    mockRedisService = {
      get: jest.fn(),
      setex: jest.fn(),
      getClient: jest.fn(),
      increment: jest.fn(),
      expire: jest.fn(),
      del: jest.fn(),
    } as any;
    mongoMemoryServer = await MongoMemoryServer.create();
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        MongooseModule.forRootAsync({
          useFactory: async () => ({
            uri: mongoMemoryServer.getUri(),
          }),
        }),
        MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
      ],
      providers: [
        LocalStrategy,
        JwtService,
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: UserService,
          useValue: {
            findOneByUsername: jest.fn(),
          },
        },
        {
          provide: AuditLogService,
          useValue: mockAuditLogService,
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

  it('should return null if user is not found and increment "failed login attempts"', async () => {
    userService.findOneByUsername.mockResolvedValue(null);
    const result = await localStrategy.validate('non_existent', 'password');
    expect(result).toBeNull();
    expect(mockAuthService.incrementFailedLoginAttempts).toHaveBeenCalledWith(
      'non_existent',
    );
  });

  it('should return null if password is incorrect and increment "failed login attempts"', async () => {
    userService.findOneByUsername.mockResolvedValue(mockCreatedUser as User);
    const result = await localStrategy.validate(
      'new_user',
      'incorrect_password',
    );
    expect(result).toBeNull();
    expect(mockAuthService.incrementFailedLoginAttempts).toHaveBeenCalledWith(
      'new_user',
    );
  });

  it('should reset "failed login attempts" on successful login', async () => {
    userService.findOneByUsername.mockResolvedValue(mockCreatedUser as User);
    await localStrategy.validate('new_user', 'correct_password');
    expect(mockAuthService.resetFailedLoginAttempts).toHaveBeenCalledWith(
      'new_user',
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
});
