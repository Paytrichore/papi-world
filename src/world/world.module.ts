import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WorldController } from './world.controller';
import { WorldGateway } from './world.gateway';
import { WorldService } from './world.service';
import { Cell, CellSchema } from './schemas/cell.schema';
import { HttpJwtGuard } from '../auth/http-jwt.guard';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Cell.name, schema: CellSchema }]),
  ],
  controllers: [WorldController],
  providers: [WorldGateway, WorldService, HttpJwtGuard],
})
export class WorldModule {}
