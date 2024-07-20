import { IsEnum, IsString } from 'class-validator';
import { EventType } from '../enums';

export class EventDto {
  @IsString()
  minute: string;

  @IsString()
  homePlayer: string;

  @IsString()
  awayPlayer: string;

  @IsEnum(EventType)
  eventType: EventType;
}
