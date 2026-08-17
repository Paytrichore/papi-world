import { IsInt, IsNotEmpty, IsString, Max, Min } from 'class-validator';

export class PlaceOnCellDto {
  @IsInt()
  @Min(-1000000)
  @Max(1000000)
  x: number;

  @IsInt()
  @Min(-1000000)
  @Max(1000000)
  y: number;

  @IsNotEmpty()
  @IsString()
  peblobId: string;
}

export interface PeblobPlacementEvent {
  eventType: 'peblob-placement-requested';
  eventId: string;
  occurredAt: string;
  userId: string;
  peblobId: string;
  x: number;
  y: number;
  correlationId: string;
}

export interface PointsSpentEvent {
  eventType: 'world-placement-points-spent';
  eventId: string;
  occurredAt: string;
  userId: string;
  points: 2;
  peblobId: string;
  x: number;
  y: number;
  correlationId: string;
}

export interface PlacementCompensationEvent {
  eventType: 'peblob-placement-compensation';
  eventId: string;
  occurredAt: string;
  userId: string;
  peblobId: string;
  x: number;
  y: number;
  correlationId: string;
}

export interface PointsRefundedEvent {
  eventType: 'world-placement-points-refunded';
  eventId: string;
  occurredAt: string;
  userId: string;
  points: 2;
  peblobId: string;
  x: number;
  y: number;
  correlationId: string;
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
