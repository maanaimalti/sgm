import { PartialType } from '@nestjs/mapped-types';
import { CreateUnityDto } from './create-unity.dto';

export class UpdateUnityDto extends PartialType(CreateUnityDto) {}
