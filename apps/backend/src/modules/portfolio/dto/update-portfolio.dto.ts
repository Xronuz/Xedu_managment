import { PartialType, OmitType } from '@nestjs/swagger';
import { CreatePortfolioDto } from './create-portfolio.dto';

// studentId o'zgartirib bo'lmaydi — faqat qolgan maydonlar
export class UpdatePortfolioDto extends PartialType(
  OmitType(CreatePortfolioDto, ['studentId'] as const),
) {}
