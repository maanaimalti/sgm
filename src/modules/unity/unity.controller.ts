import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from 'src/shared/auth/roles.decorator';
import { RolesGuard } from 'src/shared/auth/roles.guard';
import type { CreateUnityDto } from './dto/create-unity.dto';
import type { UpdateUnityDto } from './dto/update-unity.dto';
// biome-ignore lint/style/useImportType: <explanation>
import { UnityService } from './unity.service';

@Controller('unity')
export class UnityController {
  constructor(private readonly unityService: UnityService) {}

  @Post()
  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'kitchen')
  create(@Body() createUnityDto: CreateUnityDto) {
    return this.unityService.create(createUnityDto);
  }

  @Get()
  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'kitchen')
  findAll() {
    return this.unityService.findAll();
  }

  @Get(':id')
  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'kitchen')
  findOne(@Param('id') id: string) {
    return this.unityService.findOne(id);
  }

  @Patch(':id')
  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'kitchen')
  update(@Param('id') id: string, @Body() updateUnityDto: UpdateUnityDto) {
    return this.unityService.update(id, updateUnityDto);
  }

  @Delete(':id')
  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'kitchen')
  remove(@Param('id') id: string) {
    return this.unityService.remove(id);
  }
}
