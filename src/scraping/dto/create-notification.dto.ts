import { IsString, IsUUID } from 'class-validator';

export class CreateNotificationDto {
  @IsUUID()
  teamId: string;
  @IsUUID()
  leagueId: string;
  @IsString()
  eventType: string;
  @IsString()
  message: string;
}
