import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { WorldService } from './world.service';
import { Cell } from './schemas/cell.schema';
import { PlaceOnCellDto } from './dto/place-on-cell.dto';
import { HttpJwtGuard } from '../auth/http-jwt.guard';

interface AuthenticatedRequest extends Request {
  user: { sub: string };
}

@Controller('world')
export class WorldController {
  constructor(private readonly worldService: WorldService) {}

  @Get('snapshot')
  async getSnapshot(): Promise<Cell[]> {
    return this.worldService.getSnapshot();
  }

  @UseGuards(HttpJwtGuard)
  @Post('place-on-cell')
  async placeOnCell(
    @Body() dto: PlaceOnCellDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<Cell> {
    return this.worldService.placeOnCellForUser(
      dto.x,
      dto.y,
      dto.peblobId,
      request.user.sub,
    );
  }
}
