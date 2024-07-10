import { IsInt, IsNumber, IsString, IsUUID } from 'class-validator';

export class CreateTeamDto {
  @IsString()
  name: string;
  @IsUUID()
  leagueId: string;
  @IsNumber()
  @IsInt()
  liveScoreId: number;
}
