import { IsInt, IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class UpdateTeamStatsDto {
  @IsUUID()
  @IsNotEmpty()
  leagueId: string;

  @IsInt()
  position: number;

  @IsInt()
  matchesPlayed: number;

  @IsInt()
  wins: number;

  @IsInt()
  draws: number;

  @IsInt()
  losses: number;

  @IsInt()
  goalsFor: number;

  @IsInt()
  goalsAgainst: number;

  @IsInt()
  goalDifference: number;

  @IsInt()
  points: number;

  @IsString()
  teamName: string;

  @IsString()
  liveScoreURL: string;
}
