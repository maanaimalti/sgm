import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
// biome-ignore lint/style/useImportType: <explanation>
import { DepartmentService } from "./department.service";

@Controller("department")
@UseGuards(AuthGuard("jwt"))
export class DepartmentController {
  constructor(private readonly departmentService: DepartmentService) {}

  @Get()
  findAll() {
    return this.departmentService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.departmentService.findOne(id);
  }
}
