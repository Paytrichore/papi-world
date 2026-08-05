import { Controller, Get } from '@nestjs/common';
import { WorldService } from './world.service';
import { Cell } from './schemas/cell.schema';

@Controller('world')
export class WorldController {
  constructor(private readonly worldService: WorldService) {}

  @Get('snapshot')
  async getSnapshot(): Promise<Cell[]> {
    return this.worldService.getSnapshot();
  }
}
