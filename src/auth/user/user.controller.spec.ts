import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { EventEmitterModule } from '@nestjs/event-emitter';

describe('UserController', () => {
  let userController: UserController;
  let userService: UserService;

  const mockUserModel = {
    findByIdAndRemove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      controllers: [UserController],
      providers: [
        UserService,
        {
          provide: getModelToken('User'),
          useValue: mockUserModel,
        },
      ],
    }).compile();

    userController = module.get<UserController>(UserController);
    userService = module.get<UserService>(UserService);
  });

  describe('deleteUser', () => {
    it('should delete a user successfully', async () => {
      const userId = 'test-id';
      jest
        .spyOn(userService, 'deleteUser')
        .mockImplementation(async () => null);

      const response = await userController.deleteUser(userId);

      expect(userService.deleteUser).toHaveBeenCalledWith(userId);
      expect(response).toBeUndefined();
    });

    it('should throw an error if the user does not exist', async () => {
      const userId = 'nonExistingUserId';
      jest
        .spyOn(userService, 'deleteUser')
        .mockRejectedValue(new NotFoundException());

      await expect(userController.deleteUser(userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
