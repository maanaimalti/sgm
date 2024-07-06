import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';


export class CreateUnityDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  
  @IsOptional()
  @IsString()
  description?: string;
}
