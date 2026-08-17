import { Test, TestingModule } from '@nestjs/testing';
import { WorldController } from './world.controller';
import { WorldService } from './world.service';
import { HttpJwtGuard } from '../auth/http-jwt.guard';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

describe('WorldController', () => {
  let controller: WorldController;

  const mockCells = [
    { x: 0, y: 0, occupants: ['peblob-1'] },
    { x: 3, y: -2, occupants: ['peblob-2', 'peblob-3'] },
  ];

  const mockWorldService = {
    getSnapshot: jest.fn().mockResolvedValue(mockCells),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WorldController],
      providers: [
        {
          provide: WorldService,
          useValue: mockWorldService,
        },
        {
          provide: HttpJwtGuard,
          useValue: { canActivate: jest.fn().mockReturnValue(true) },
        },
        { provide: JwtService, useValue: {} },
        { provide: ConfigService, useValue: {} },
      ],
    }).compile();

    controller = module.get<WorldController>(WorldController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getSnapshot', () => {
    it('returns snapshot from service', async () => {
      const result = await controller.getSnapshot();
      expect(result).toEqual(mockCells);
      expect(mockWorldService.getSnapshot).toHaveBeenCalledTimes(1);
    });

    it('returns empty array on empty world', async () => {
      mockWorldService.getSnapshot.mockResolvedValueOnce([]);
      const result = await controller.getSnapshot();
      expect(result).toEqual([]);
    });
  });
});
