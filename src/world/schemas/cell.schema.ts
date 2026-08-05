import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CellDocument = Cell & Document;

@Schema({ timestamps: true })
export class Cell {
  @Prop({ required: true })
  x: number;

  @Prop({ required: true })
  y: number;

  @Prop({ type: [String], default: [] })
  occupants: string[];
}

export const CellSchema = SchemaFactory.createForClass(Cell);

CellSchema.index({ x: 1, y: 1 }, { unique: true });
