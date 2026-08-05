import { Test, TestingModule } from '@nestjs/testing';
import { WorldService } from './world.service';
import { getModelToken } from '@nestjs/mongoose';
import { Cell } from './schemas/cell.schema';
import { Server } from 'socket.io';

describe('WorldService', () => {
  let service: WorldService;

  const mockCell = { x: 1, y: 2, occupants: ['peblob-1'] };

  const mockCellModel = {
    find: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue([mockCell]),
    }),
    findOneAndUpdate: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockCell),
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorldService,
        {
          provide: getModelToken(Cell.name),
          useValue: mockCellModel,
        },
      ],
    }).compile();

    service = module.get<WorldService>(WorldService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getSnapshot', () => {
    it('returns occupied cells', async () => {
      const result = await service.getSnapshot();
      expect(result).toEqual([mockCell]);
      expect(mockCellModel.find).toHaveBeenCalledWith({
        'occupants.0': { $exists: true },
      });
    });
  });

  describe('placeOnCell', () => {
    it('upserts cell and returns it', async () => {
      const result = await service.placeOnCell(1, 2, 'peblob-1');
      expect(result).toEqual(mockCell);
      expect(mockCellModel.findOneAndUpdate).toHaveBeenCalledWith(
        { x: 1, y: 2 },
        { $addToSet: { occupants: 'peblob-1' } },
        { new: true, upsert: true },
      );
    });

    it('broadcasts cell:update when server is set', async () => {
      const mockEmit = jest.fn();
      service.setServer({ emit: mockEmit } as unknown as Server);

      await service.placeOnCell(1, 2, 'peblob-1');

      expect(mockEmit).toHaveBeenCalledWith('cell:update', mockCell);
    });
  });

  describe('removeFromCell', () => {
    it('pulls peblobId from cell and returns updated cell', async () => {
      const result = await service.removeFromCell(1, 2, 'peblob-1');
      expect(result).toEqual(mockCell);
      expect(mockCellModel.findOneAndUpdate).toHaveBeenCalledWith(
        { x: 1, y: 2 },
        { $pull: { occupants: 'peblob-1' } },
        { new: true },
      );
    });

    it('broadcasts cell:update when server is set', async () => {
      const mockEmit = jest.fn();
      service.setServer({ emit: mockEmit } as unknown as Server);

      await service.removeFromCell(1, 2, 'peblob-1');

      expect(mockEmit).toHaveBeenCalledWith('cell:update', mockCell);
    });
  });
});
