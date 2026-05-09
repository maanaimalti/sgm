import { Controller, Get, Param } from "@nestjs/common";
// biome-ignore lint/style/useImportType: <explanation>
import { DepartmentService } from "./department.service";

@Controller("department")
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
