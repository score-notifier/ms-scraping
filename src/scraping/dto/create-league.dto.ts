import { IsString } from 'class-validator';

export class CreateLeagueDto {
  @IsString()
  name: string;

  @IsString()
  url: string;

  @IsString()
  country: string;
}
