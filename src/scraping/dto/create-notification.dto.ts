import { IsString, ValidateNested } from 'class-validator';
import { EventDto } from './event-dto';
import { Type } from 'class-transformer';

export class CreateNotificationDto {
  @IsString()
  homeTeamLiveScoreURL: string;

  @IsString()
  awayTeamLiveScoreURL: string;

  @IsString()
  leagueLiveScoreURL: string;

  @IsString()
  matchLiveScoreURL: string;

  @ValidateNested()
  @Type(() => EventDto)
  event: EventDto;
}
