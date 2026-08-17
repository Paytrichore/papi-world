import { Injectable } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cell, CellDocument } from './schemas/cell.schema';
import { Server } from 'socket.io';
import { createHmac, randomUUID } from 'node:crypto';
import {
  PeblobPlacementEvent,
  PointsSpentEvent,
  PlacementCompensationEvent,
  PointsRefundedEvent,
} from './dto/place-on-cell.dto';

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

  async placeOnCellForUser(
    x: number,
    y: number,
    peblobId: string,
    userId: string,
  ): Promise<Cell> {
    const occupiedCell = await this.cellModel
      .findOne({ x, y, 'occupants.0': { $exists: true } })
      .exec();
    if (occupiedCell) {
      throw new BadRequestException('Cette case est déjà occupée');
    }

    const correlationId = randomUUID();
    const peblobEvent: PeblobPlacementEvent = {
      eventType: 'peblob-placement-requested',
      eventId: randomUUID(),
      occurredAt: new Date().toISOString(),
      userId,
      peblobId,
      x,
      y,
      correlationId,
    };
    const pointsEvent: PointsSpentEvent = {
      eventType: 'world-placement-points-spent',
      eventId: randomUUID(),
      occurredAt: new Date().toISOString(),
      userId,
      points: 2,
      peblobId,
      x,
      y,
      correlationId,
    };

    await this.sendWebhook(
      this.webhookUrl('PEBLOB_API_URL', '/peblob/webhooks/placement'),
      peblobEvent,
    );

    try {
      await this.sendWebhook(
        this.webhookUrl('USER_API_URL', '/webhooks/world-placement-points'),
        pointsEvent,
      );
    } catch (error) {
      await this.tryCompensatePeblob(peblobEvent);
      throw error;
    }

    try {
      const cell = await this.placeOnCellIfFree(x, y, peblobId);
      if (!cell) {
        throw new BadRequestException('Cette case est déjà occupée');
      }
      return cell;
    } catch (error) {
      await Promise.allSettled([
        this.tryCompensatePeblob(peblobEvent),
        this.tryRefundPoints(pointsEvent),
      ]);
      throw error;
    }
  }

  private async placeOnCellIfFree(
    x: number,
    y: number,
    peblobId: string,
  ): Promise<Cell | null> {
    const cell = await this.cellModel
      .findOneAndUpdate(
        { x, y, occupants: { $size: 0 } },
        { $addToSet: { occupants: peblobId } },
        { new: true },
      )
      .exec();

    if (cell) {
      if (this.server) {
        this.server.emit('cell:update', cell);
      }
      return cell;
    }

    try {
      return await this.cellModel
        .create({ x, y, occupants: [peblobId] })
        .then((created) => {
          if (this.server) {
            this.server.emit('cell:update', created);
          }
          return created;
        });
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        return null;
      }
      throw error;
    }
  }

  private async tryCompensatePeblob(
    event: PeblobPlacementEvent,
  ): Promise<void> {
    const compensation: PlacementCompensationEvent = {
      eventType: 'peblob-placement-compensation',
      eventId: randomUUID(),
      occurredAt: new Date().toISOString(),
      userId: event.userId,
      peblobId: event.peblobId,
      x: event.x,
      y: event.y,
      correlationId: event.correlationId,
    };
    await this.sendWebhook(
      this.webhookUrl(
        'PEBLOB_API_URL',
        '/peblob/webhooks/placement/compensate',
      ),
      compensation,
    );
  }

  private async tryRefundPoints(event: PointsSpentEvent): Promise<void> {
    const refund: PointsRefundedEvent = {
      eventType: 'world-placement-points-refunded',
      eventId: randomUUID(),
      occurredAt: new Date().toISOString(),
      userId: event.userId,
      points: 2,
      peblobId: event.peblobId,
      x: event.x,
      y: event.y,
      correlationId: event.correlationId,
    };
    await this.sendWebhook(
      this.webhookUrl(
        'USER_API_URL',
        '/webhooks/world-placement-points/refund',
      ),
      refund,
    );
  }

  private webhookUrl(environmentName: string, path: string): string {
    const baseUrl = process.env[environmentName];
    if (!baseUrl) {
      throw new Error(`${environmentName} is not configured`);
    }
    return `${baseUrl.replace(/\/$/, '')}${path}`;
  }

  private async sendWebhook(url: string, event: object): Promise<void> {
    const secret = process.env.WEBHOOK_SHARED_SECRET;
    if (!secret) {
      throw new Error('WEBHOOK_SHARED_SECRET is not configured');
    }
    const timestamp = Date.now().toString();
    const body = JSON.stringify(event);
    const signature = createHmac('sha256', secret)
      .update(`${timestamp}.${body}`)
      .digest('hex');
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-timestamp': timestamp,
        'x-webhook-signature': `sha256=${signature}`,
      },
      body,
    });
    if (!response.ok) {
      throw new Error(`Webhook failed with status ${response.status}`);
    }
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
