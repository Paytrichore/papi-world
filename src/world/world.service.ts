import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cell, CellDocument } from './schemas/cell.schema';
import { Server } from 'socket.io';

@Injectable()
export class WorldService {
  private server: Server | null = null;

  constructor(
    @InjectModel(Cell.name)
    private readonly cellModel: Model<CellDocument>,
  ) {}

  setServer(server: Server): void {
    this.server = server;
  }

  async getSnapshot(): Promise<Cell[]> {
    return this.cellModel.find({ 'occupants.0': { $exists: true } }).exec();
  }

  async placeOnCell(x: number, y: number, peblobId: string): Promise<Cell> {
    const cell = await this.cellModel
      .findOneAndUpdate(
        { x, y },
        { $addToSet: { occupants: peblobId } },
        { new: true, upsert: true },
      )
      .exec();

    if (this.server) {
      this.server.emit('cell:update', cell);
    }

    return cell;
  }

  async removeFromCell(
    x: number,
    y: number,
    peblobId: string,
  ): Promise<Cell | null> {
    const cell = await this.cellModel
      .findOneAndUpdate(
        { x, y },
        { $pull: { occupants: peblobId } },
        { new: true },
      )
      .exec();

    if (this.server) {
      this.server.emit('cell:update', cell);
    }

    return cell;
  }
}
