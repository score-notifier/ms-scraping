import { IsDateString, IsObject, IsString, IsUUID } from 'class-validator';

export class CreateMatchDto {
  @IsString()
  homeTeam: string;

  @IsString()
  awayTeam: string;

  @IsString()
  date: string;

  @IsString()
  time: string;

  @IsDateString()
  UTCDate: string | Date;

  @IsString()
  liveScoreURL: string;

  @IsObject()
  result: {
    awayScore: number;
    homeScore: number;
  };

  @IsUUID()
  leagueId: string;
}
