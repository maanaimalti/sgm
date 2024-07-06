import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { UnityService } from './unity.service';
import { CreateUnityDto } from './dto/create-unity.dto';
import { UpdateUnityDto } from './dto/update-unity.dto';

@Controller('unity')
export class UnityController {
  constructor(private readonly unityService: UnityService) {}

  @Post()
  create(@Body() createUnityDto: CreateUnityDto) {
    return this.unityService.create(createUnityDto);
  }

  @Get()
  findAll() {
    return this.unityService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.unityService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUnityDto: UpdateUnityDto) {
    return this.unityService.update(id, updateUnityDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.unityService.remove(id);
  }
}
