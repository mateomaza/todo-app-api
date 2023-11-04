import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UserService } from './user/user.service';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import { v4 as uuidv4 } from 'uuid';
import { User } from './user/user.model';

interface UserResponse {
  id: string;
  username: string;
  email: string;
  createdAt: string;
}

const mockCreatedUser: UserResponse = {
  id: uuidv4(),
  username: 'new_user',
  email: 'new_email@example.com',
  createdAt: new Date().toISOString(),
};

describe('AuthService (Unit Tests)', () => {
  let authService: AuthService;
  let userService: jest.Mocked<UserService>;
  let jwtService: jest.Mocked<JwtService>;

  beforeEach(async () => {
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
          },
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    userService = module.get(UserService);
    jwtService = module.get(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return a JWT token for a valid user', async () => {
    userService.findOneByUsername.mockResolvedValue(
      mockCreatedUser as any as User,
    );
    jwtService.sign.mockReturnValue('mocked-jwt-token');

    const loginDto: LoginDto = {
      username: 'new_user',
      password: 'correct_password',
    };
    const result = await authService.login(loginDto);

    expect(result).toBeDefined();
    expect(result.access_token).toEqual('mocked-jwt-token');
    expect(result.message).toEqual('Login successful');
  });
  it('should check if username is not in use when user not found', async () => {
    const usernameInUse = await authService.isUsernameInUse('nonexistent');
    expect(userService.findOneByUsername).toHaveBeenCalledWith('nonexistent');
    expect(usernameInUse).toBeFalsy();
  });

  it('should check if username is in use when user is found', async () => {
    userService.findOneByUsername.mockResolvedValueOnce(
      mockCreatedUser as any as User,
    );
    const usernameInUse = await authService.isUsernameInUse('existent');
    expect(userService.findOneByUsername).toHaveBeenCalledWith('existent');
    expect(usernameInUse).toBeTruthy();
  });

  it('should check if email is not in use when user not found', async () => {
    const emailInUse = await authService.isEmailInUse(
      'nonexistent@example.com',
    );
    expect(userService.findOneByEmail).toHaveBeenCalledWith(
      'nonexistent@example.com',
    );
    expect(emailInUse).toBeFalsy();
  });

  it('should check if email is in use when user is found', async () => {
    userService.findOneByEmail.mockResolvedValueOnce(
      mockCreatedUser as any as User,
    );
    const emailInUse = await authService.isEmailInUse('existent@example.com');
    expect(userService.findOneByEmail).toHaveBeenCalledWith(
      'existent@example.com',
    );
    expect(emailInUse).toBeTruthy();
  });
});
