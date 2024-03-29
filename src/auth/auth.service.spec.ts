import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UserService } from './user/user.service';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import { v4 as uuidv4 } from 'uuid';
import { User } from './user/user.model';
import { RedisService } from 'src/common/redis.service';
import { AuditLogService } from 'src/audit/audit-log.service';

describe('AuthService', () => {
  let authService: AuthService;
  let userService: jest.Mocked<UserService>;
  let jwtService: jest.Mocked<JwtService>;
  let mockRedisService: jest.Mocked<RedisService>;

  const mockCreatedUser: Partial<User> = {
    id: uuidv4(),
    username: 'new_user',
    email: 'new_email@example.com',
    createdAt: new Date(),
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
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserService,
          useValue: {
            findOneByUsername: jest.fn().mockResolvedValue(null),
            findOneByEmail: jest.fn().mockResolvedValue(null),
            create: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn(),
          },
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: AuditLogService,
          useValue: mockAuditLogService,
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    userService = module.get(UserService);
    jwtService = module.get(JwtService);
  });

  it('should successfully register a new user and return token details', async () => {
    userService.create.mockResolvedValue(mockCreatedUser as User);
    jwtService.sign.mockReturnValueOnce('mock-access-token');
    jwtService.sign.mockReturnValueOnce('mock-refresh-token');
    const result = await authService.register({
      username: 'new_user',
      email: 'new_email@example.com',
      password: 'new_password',
    });
    expect(result).toBeDefined();
    expect(result.newUser).toBeDefined();
    expect(result.newUser.username).toEqual('new_user');
    expect(result.access_token).toEqual('mock-access-token');
    expect(result.refresh_token).toEqual('mock-refresh-token');
    expect(result.message).toEqual('Registration successful');
    expect(userService.create).toHaveBeenCalledWith({
      username: 'new_user',
      email: 'new_email@example.com',
      password: 'new_password',
    });
    expect(jwtService.sign).toHaveBeenCalledWith(
      { username: 'new_user', sub: mockCreatedUser.id },
      { expiresIn: '15m' },
    );
    expect(jwtService.sign).toHaveBeenCalledWith(
      { username: 'new_user', sub: mockCreatedUser.id },
      { expiresIn: '7d' },
    );
  });

  it('should return a JWT access token and refresh token for a valid login', async () => {
    const mockUser = mockCreatedUser as User;
    userService.findOneByUsername.mockResolvedValue(mockUser);
    jwtService.sign.mockReturnValueOnce('mock-access-token');
    jwtService.sign.mockReturnValueOnce('mock-refresh-token');
    const loginDto: LoginDto = {
      username: 'new_user',
      password: 'correct_password',
    };
    const result = await authService.login(loginDto);
    expect(result).toBeDefined();
    expect(result.message).toEqual('Login successful');
    expect(result.access_token).toEqual('mock-access-token');
    expect(result.refresh_token).toEqual('mock-refresh-token');
    expect(userService.findOneByUsername).toHaveBeenCalledWith('new_user');
    expect(jwtService.sign).toHaveBeenCalledWith(
      { username: mockUser.username, sub: mockUser.id },
      { expiresIn: '15m' },
    );
    expect(jwtService.sign).toHaveBeenCalledWith(
      { username: mockUser.username, sub: mockUser.id },
      { expiresIn: '7d' },
    );
  });

  it('should throw an error if login is attempted with a non-existing username', async () => {
    userService.findOneByUsername.mockResolvedValue(null);
    const loginDto: LoginDto = {
      username: 'non_user',
      password: 'password',
    };
    await expect(authService.login(loginDto)).rejects.toThrow();
  });

  it('should check if username is not in use', async () => {
    const usernameInUse = await authService.isUsernameInUse('nonexistent');
    expect(userService.findOneByUsername).toHaveBeenCalledWith('nonexistent');
    expect(usernameInUse).toBeFalsy();
  });

  it('should check if username is in use', async () => {
    userService.findOneByUsername.mockResolvedValueOnce(
      mockCreatedUser as User,
    );
    const usernameInUse = await authService.isUsernameInUse('existent');
    expect(userService.findOneByUsername).toHaveBeenCalledWith('existent');
    expect(usernameInUse).toBeTruthy();
  });

  it('should check if email is not in use', async () => {
    const emailInUse = await authService.isEmailInUse(
      'nonexistent@example.com',
    );
    expect(userService.findOneByEmail).toHaveBeenCalledWith(
      'nonexistent@example.com',
    );
    expect(emailInUse).toBeFalsy();
  });

  it('should check if email is in use', async () => {
    userService.findOneByEmail.mockResolvedValueOnce(mockCreatedUser as User);
    const emailInUse = await authService.isEmailInUse('existent@example.com');
    expect(userService.findOneByEmail).toHaveBeenCalledWith(
      'existent@example.com',
    );
    expect(emailInUse).toBeTruthy();
  });

  it('should store and retrieve token details in the cache', async () => {
    const user_id = 'user123';
    const ip = '192.168.1.1';
    const user_agent = 'test-agent';
    const ttl = 3600;
    await authService.storeTokenDetails(user_id, ip, user_agent, ttl);
    expect(mockRedisService.setex).toHaveBeenCalledWith(
      `token_details:${user_id}`,
      ttl,
      JSON.stringify({ ip, user_agent }),
    );
    mockRedisService.get.mockResolvedValue(JSON.stringify({ ip, user_agent }));
    const retrievedDetails = await authService.getTokenDetails(user_id);
    expect(mockRedisService.get).toHaveBeenCalledWith(
      `token_details:${user_id}`,
    );
    expect(retrievedDetails).toEqual({
      stored_ip: ip,
      stored_user_agent: user_agent,
    });
  });

  it('should identify a revoked refresh token', async () => {
    const refresh_token = 'revokedToken123';
    mockRedisService.get.mockResolvedValue('blocked');
    const req = {
      ip: '127.0.0.1',
      headers: { 'user-agent': 'test-agent' },
    } as any;
    const result = await authService.checkRefreshToken(refresh_token, req);
    expect(result).toBeNull();
    expect(mockRedisService.get).toHaveBeenCalledWith(
      `blocklist:${refresh_token}`,
    );
    expect(mockAuditLogService.logEntry).toHaveBeenCalledWith({
      level: 'warn',
      action: 'Blocked Token Attempt',
      details: expect.stringContaining('Attempt to use a revoked token'),
    });
  });

  it('should return { result: true } if the refresh token is valid', async () => {
    const refresh_token = 'validToken123';
    const payload = { username: mockCreatedUser.username };
    mockRedisService.get.mockResolvedValue(null);
    jwtService.verify.mockReturnValue(payload);
    userService.findOneByUsername.mockResolvedValue(mockCreatedUser as User);

    const req = {
      ip: '127.0.0.1',
      headers: { 'user-agent': 'test-agent' },
    } as any;
    const res = await authService.checkRefreshToken(refresh_token, req);

    expect(res).toEqual({ result: true });
    expect(jwtService.verify).toHaveBeenCalledWith(refresh_token);
    expect(userService.findOneByUsername).toHaveBeenCalledWith(
      payload.username,
    );
  });

  it('should return null and log an entry if no user is found for the token', async () => {
    const refresh_token = 'validTokenButNoUser123';
    const payload = { username: 'nonexistent_user' };
    mockRedisService.get.mockResolvedValue(null);
    jwtService.verify.mockReturnValue(payload);
    userService.findOneByUsername.mockResolvedValue(null);

    const req = {
      ip: '127.0.0.1',
      headers: { 'user-agent': 'test-agent' },
    } as any;
    const result = await authService.checkRefreshToken(refresh_token, req);

    expect(result).toBeNull();
    expect(mockAuditLogService.logEntry).toHaveBeenCalledWith({
      level: 'warn',
      action: 'Blocked Token Attempt',
      details: 'Attempt to check the refresh token with no valid user.',
    });
  });

  it('should invalidate a refresh token and add it to the blocklist', async () => {
    const refresh_token = 'validToken123';
    const payload = {
      username: 'user123',
      exp: Math.floor(Date.now() / 1000) + 3600,
    };
    jwtService.verify.mockReturnValue(payload);
    await authService.invalidateToken(refresh_token);
    expect(mockRedisService.setex).toHaveBeenCalledWith(
      `blocklist:${refresh_token}`,
      expect.any(Number),
      'blocked',
    );
  });

  it('should increment failed login attempts and log warning after threshold', async () => {
    const username = 'testuser';
    mockRedisService.get.mockResolvedValue('11');
    mockRedisService.increment.mockResolvedValue(12);
    await authService.incrementFailedLoginAttempts(username);
    expect(mockRedisService.increment).toHaveBeenCalledWith(
      `failedLoginAttempts:${username}`,
    );
    expect(mockRedisService.expire).toHaveBeenCalledWith(
      `failedLoginAttempts:${username}`,
      3600,
    );
    expect(mockAuditLogService.logEntry).toHaveBeenCalledWith({
      level: 'warn',
      action: 'Failed Login Attempt',
      details: `Multiple failed login attempts for user ${username}.`,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
});
