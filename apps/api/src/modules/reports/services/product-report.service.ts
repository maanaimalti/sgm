import { ForbiddenException, Injectable, Logger } from "@nestjs/common";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { PrismaService } from "src/shared/db/prisma.service";
import { UploadFileService } from "src/shared/upload/upload-file.service";

@Injectable()
export class ProductReportService {
  private readonly logger = new Logger(ProductReportService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly uploadService: UploadFileService,
  ) {}

  async generateProductReport(
    reportId: string,
    userId: string,
    departmentId?: string,
    parameters: any = {},
  ): Promise<string> {
    this.logger.log(
      `Gerando relatório de produtos ${reportId} para usuário ${userId}`,
    );

    // Verificar se o usuário pertence ao departamento solicitado
    await this.validateUserDepartmentAccess(userId, departmentId);

    // Buscar dados dos produtos com relações
    const products = await this.fetchProductsData(departmentId, parameters);

    // Gerar PDF
    const pdfBytes = await this.createProductsPDF(products, departmentId);

    // Upload para R2. Guardamos a chave, não a URL: o link de download é
    // assinado a cada requisição e expira.
    const fileName = `relatorio_produtos_${reportId}_${Date.now()}.pdf`;
    await this.uploadService.uploadFile(fileName, pdfBytes, "application/pdf");

    this.logger.log(
      `Relatório de produtos ${reportId} enviado para ${fileName}`,
    );
    return fileName;
  }

  private async validateUserDepartmentAccess(
    userId: string,
    departmentId?: string,
  ) {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      include: {
        department: {
          select: { id: true, name: true },
        },
      },
    });

    if (!user) {
      throw new ForbiddenException("Usuário não encontrado");
    }

    // Se um departmentId específico foi solicitado, verificar se o usuário pertence a ele
    if (departmentId) {
      const userBelongsToDepartment = user.department.some(
        (dept) => dept.id === departmentId,
      );
      if (!userBelongsToDepartment) {
        throw new ForbiddenException("Você não tem acesso a este departamento");
      }
    }
  }

  private async fetchProductsData(departmentId?: string, parameters: any = {}) {
    const where: any = {
      status: "active",
    };

    if (departmentId) {
      where.department = { id: departmentId };
    }

    // Adicionar filtros adicionais dos parâmetros se necessário
    if (parameters.categoryId) {
      where.categoryId = parameters.categoryId;
    }

    if (parameters.search) {
      where.OR = [
        { name: { contains: parameters.search } },
        { description: { contains: parameters.search } },
      ];
    }

    return this.prismaService.product.findMany({
      where,
      include: {
        category: {
          select: { name: true },
        },
        unity: {
          select: { name: true },
        },
        department: {
          select: { name: true },
        },
      },
      orderBy: {
        name: "asc",
      },
    });
  }

  private async createProductsPDF(
    products: any[],
    departmentId?: string,
  ): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let page = pdfDoc.addPage([612, 792]); // Tamanho carta
    const { width, height } = page.getSize();
    let yPosition = height - 50;

    // Título
    page.drawText("Relatório de Produtos Cadastrados", {
      x: 50,
      y: yPosition,
      size: 20,
      font: boldFont,
      color: rgb(0, 0, 0),
    });

    yPosition -= 30;

    // Data de geração
    const today = new Date();
    const dateStr = today.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    page.drawText(`Gerado em: ${dateStr}`, {
      x: 50,
      y: yPosition,
      size: 12,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });

    yPosition -= 20;

    // Informação do departamento se especificado
    if (departmentId && products.length > 0) {
      const deptName = products[0].department?.name || "N/A";
      page.drawText(`Departamento: ${deptName}`, {
        x: 50,
        y: yPosition,
        size: 12,
        font,
        color: rgb(0.3, 0.3, 0.3),
      });
      yPosition -= 30;
    } else {
      yPosition -= 20;
    }

    // Cabeçalhos da tabela
    const headers = [
      "Código",
      "Nome",
      "Descrição",
      "Categoria",
      "Unidade",
      "Departamento",
      "Preço Custo",
      "Preço Venda",
      "Data Cadastro",
    ];
    const columnWidths = [50, 90, 80, 70, 50, 80, 65, 65, 75];
    let xPosition = 25;

    // Desenhar cabeçalhos
    headers.forEach((header, index) => {
      page.drawText(header, {
        x: xPosition,
        y: yPosition,
        size: 9,
        font: boldFont,
        color: rgb(0, 0, 0),
      });
      xPosition += columnWidths[index];
    });

    yPosition -= 18;

    // Desenhar linha sob os cabeçalhos
    page.drawLine({
      start: { x: 25, y: yPosition },
      end: { x: width - 25, y: yPosition },
      thickness: 1,
      color: rgb(0, 0, 0),
    });

    yPosition -= 15;

    // Desenhar dados dos produtos
    for (const product of products) {
      // Verificar se precisa de nova página
      if (yPosition < 100) {
        page = pdfDoc.addPage([612, 792]);
        yPosition = height - 50;
      }

      xPosition = 25;
      const rowData = [
        product.id.substring(0, 6) + "...", // ID truncado
        this.truncateText(product.name, 12),
        this.truncateText(product.description || "N/A", 10),
        this.truncateText(product.category?.name || "N/A", 9),
        product.unity?.name || "N/A",
        this.truncateText(product.department?.name || "N/A", 10),
        `R$ ${product.costValue.toFixed(2)}`,
        product.saleValue ? `R$ ${product.saleValue.toFixed(2)}` : "N/A",
        new Date(product.createdAt).toLocaleDateString("pt-BR"),
      ];

      rowData.forEach((data, index) => {
        page.drawText(data, {
          x: xPosition,
          y: yPosition,
          size: 8,
          font,
          color: rgb(0, 0, 0),
        });
        xPosition += columnWidths[index];
      });

      yPosition -= 16;
    }

    // Adicionar rodapé com contagem total
    if (yPosition < 80) {
      page = pdfDoc.addPage([612, 792]);
      yPosition = height - 50;
    }

    yPosition = 50;
    page.drawText(`Total de Produtos: ${products.length}`, {
      x: 50,
      y: yPosition,
      size: 12,
      font: boldFont,
      color: rgb(0, 0, 0),
    });

    // Linha de rodapé
    page.drawText("Sistema de Gerenciamento - SGM", {
      x: 50,
      y: yPosition - 20,
      size: 10,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });

    return pdfDoc.save();
  }

  private truncateText(text: string, maxLength: number): string {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + "...";
  }
}
