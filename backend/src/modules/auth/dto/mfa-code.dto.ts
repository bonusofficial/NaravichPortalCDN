import { Matches } from 'class-validator';

export class MfaCodeDto {
  @Matches(/^\d{6}$/)
  code: string;
}
