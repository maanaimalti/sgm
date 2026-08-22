import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Roles } from "src/shared/auth/roles.decorator";
import { RolesGuard } from "src/shared/auth/roles.guard";
import {
  GetDepartmentId,
  GetDepartmentIds,
} from "src/shared/decorators/get-department-id";
import { GetUserId } from "src/shared/decorators/get-user-id";
import { CreateReportDto } from "./dto/create-report.dto";
import { ReportsService } from "./reports.service";

@Controller("reports")
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  @UseGuards(AuthGuard("jwt"), RolesGuard)
  @Roles("admin", "kitchen")
  async createReport(
    @GetUserId() userId: string,
    @Body() createReportDto: CreateReportDto,
    @GetDepartmentId() departmentId: string,
    @GetDepartmentIds() allowedDepartmentIds: string[],
  ) {
    if (!createReportDto.departmentId) {
      createReportDto.departmentId = departmentId;
      return this.reportsService.createReport(userId, createReportDto);
    }

    // @GetDepartmentId only vets the header. A department named in the *body*
    // has never been checked against the caller — without this, anyone could
    // ask for a report on any department's products.
    if (!allowedDepartmentIds.includes(createReportDto.departmentId)) {
      throw new ForbiddenException("Você não tem acesso a este departamento");
    }

    return this.reportsService.createReport(userId, createReportDto);
  }

  @Get()
  @UseGuards(AuthGuard("jwt"))
  async getReports(
    @GetUserId() userId: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    const pageNum = page ? Number.parseInt(page) : 1;
    const pageSizeNum = pageSize ? Number.parseInt(pageSize) : 10;
    return this.reportsService.getReports(userId, pageNum, pageSizeNum);
  }

  @Get(":id")
  @UseGuards(AuthGuard("jwt"))
  async getReport(@Param("id") reportId: string, @GetUserId() userId: string) {
    return this.reportsService.getReport(reportId, userId);
  }
}
