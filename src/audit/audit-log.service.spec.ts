import { Test, TestingModule } from '@nestjs/testing';
import { AuditLogService } from './audit-log.service';
import { getModelToken } from '@nestjs/mongoose';
import { AuditLog } from './audit-log.model';
import { Model } from 'mongoose';

describe('AuditLogService', () => {
  let service: AuditLogService;
  let mockAuditLogModel: Partial<Model<AuditLog>>;

  beforeEach(async () => {
    mockAuditLogModel = {
      insertMany: jest.fn(),
      create: jest.fn().mockImplementation((entry) => entry),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogService,
        { provide: getModelToken(AuditLog.name), useValue: mockAuditLogModel },
      ],
    }).compile();

    service = module.get<AuditLogService>(AuditLogService);
  });

  it('should add a new log entry to the buffer', async () => {
    const mockLogEntry = {
      level: 'info',
      userId: '123',
      action: 'testAction',
      status: 'success',
      details: 'Test details',
    };
    await service.logEntry({
      level: mockLogEntry.level,
      userId: mockLogEntry.userId,
      action: mockLogEntry.action,
      outcome: mockLogEntry.status,
      details: mockLogEntry.details,
    });
    expect(service.logBufferForTesting).toContainEqual(
      expect.objectContaining(mockLogEntry),
    );
  });

  it('should flush the buffer when maximum size is reached', async () => {
    for (let i = 0; i < service.maxBufferSizeForTesting; i++) {
      await service.logEntry({
        level: 'info',
        userId: `user${i}`,
        action: 'testAction',
        outcome: 'success',
        details: 'Test details',
      });
    }
    expect(service.logBufferForTesting.length).toBe(0);
    expect(mockAuditLogModel.insertMany).toHaveBeenCalled();
  });

  it('should correctly flush logs when the cron method is invoked', async () => {
    for (let i = 0; i < 5; i++) {
      await service.logEntry({
        level: 'info',
        userId: `user${i}`,
        action: 'testAction',
        outcome: 'success',
        details: 'Test details',
      });
    }
    await service.handleCron();
    expect(service.logBufferForTesting.length).toBe(0);
    expect(mockAuditLogModel.insertMany).toHaveBeenCalled();
  });

  it('should flush the buffer on module destroy', async () => {
    await service.logEntry({
      level: 'info',
      userId: `123`,
      action: 'testAction',
      outcome: 'success',
      details: 'Test details',
    });
    await service.onModuleDestroy();
    expect(service.logBufferForTesting.length).toBe(0);
    expect(mockAuditLogModel.insertMany).toHaveBeenCalled();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
});
