import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { orderStatus } from '@prisma/client';
import { PDFDocument, StandardFonts } from 'pdf-lib';
// biome-ignore lint/style/useImportType: <explanation>
import { PrismaService } from 'src/shared/db/prisma.service';
// biome-ignore lint/style/useImportType: <explanation>
import { HelpersService } from 'src/shared/helpers/helpers.service';
// biome-ignore lint/style/useImportType: <explanation>
import { UploadFileService } from 'src/shared/upload/upload-file.service';
// biome-ignore lint/style/useImportType: <explanation>
import { NotificationService } from '../notification/notification.service';
import type { CreateOrderDto } from './dto/create-order.dto';
import type { FindAllOrdersDto } from './dto/find-all-orders.dto';

@Injectable()
export class OrdersService {
  constructor(
    private readonly helpersService: HelpersService,
    private readonly prismaService: PrismaService,
    private readonly uploadFileService: UploadFileService,
    private readonly notificationService: NotificationService,
  ) {}

  async create(createOrderDto: CreateOrderDto) {
    const { items, userId, observation, event } = createOrderDto;
    const id = this.helpersService.generateId();
    Logger.log(`Creating order with id: ${id} and user id: ${userId}`);
    const result = await this.prismaService.orders.create({
      data: {
        id,
        user: {
          connect: {
            id: userId,
          },
        },
        orderItem: {
          create: items.map((item) => ({
            id: this.helpersService.generateId(),
            product: {
              connect: {
                id: item.productId,
              },
            },
            quantity: item.quantity,
          })),
        },
        observation,
        event,
      },
    });
    return result;
  }

  async findAll(findAllOrdersDto: FindAllOrdersDto) {
    const { page = 1, pageSize = 10 } = findAllOrdersDto;
    const orders = await this.prismaService.orders.findMany({
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        status: true,
        createdAt: true,
      },
    });
    const total = await this.prismaService.orders.count();
    return {
      orders,
      total,
    };
  }

  async findOne(id: string) {
    const data = await this.prismaService.orders.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        status: true,
        createdAt: true,
        orderItem: {
          select: {
            id: true,
            quantity: true,
            product: {
              select: {
                id: true,
                name: true,
                unity: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
        observation: true,
        event: true,
      },
    });
    if (!data) {
      Logger.error(`Order with id: ${id} not found. Request by: ${id}`);
      throw new NotFoundException(`Order with id: ${id} not found`);
    }
    Logger.log(`Order with id: ${id} found. Request by: ${id}`);
    return data;
  }

  async approveOrder(id: string) {
    await this.prismaService.orders.update({
      where: {
        id,
      },
      data: {
        status: orderStatus.APPROVED,
      },
    });
  }

  async cancelOrder(id: string, observation?: string) {
    await this.prismaService.orders.update({
      where: {
        id,
      },
      data: {
        status: orderStatus.CANCELED,
        statusOberservation: observation,
      },
    });
  }

  async getReport(id: string) {
    const data = await this.prismaService.orderReports.findFirst({
      where: {
        orderId: id,
      },
      select: {
        url: true,
      },
    });
    if (!data) {
      Logger.error(`Order report with id: ${id} not found. Request by: ${id}`);
      throw new NotFoundException(`Order report with id: ${id} not found`);
    }
    Logger.log(`Order report with id: ${id} found. Request by: ${id}`);
    const url = this.uploadFileService.getFileUrl('sgm', data.url);
    return { url };
  }

  async generateReport(id: string, userId: string) {
    Logger.log(`getting order with id: ${id} by user: ${userId}`);
    try {
      const order = await this.prismaService.orders.findFirst({
        where: {
          id: id,
        },
        select: {
          id: true,
          user: {
            select: {
              id: true,
              name: true,
            },
          },
          status: true,
          createdAt: true,
          observation: true,
          orderItem: {
            select: {
              id: true,
              quantity: true,
              product: {
                select: {
                  id: true,
                  name: true,
                  unity: {
                    select: {
                      name: true,
                    },
                  },
                  category: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
      if (!order) {
        Logger.error(
          `Order with id: ${id} not found. Request by: ${id} for report generation`,
        );
        throw new NotFoundException(
          `Order with id: ${id} not found for report generation`,
        );
      }
      Logger.log(`Generating report for order ${JSON.stringify(order)}`);
      const result = await this.generatePdf(order);
      (async () => {
        try {
          const pdfBytes = await result.save();
          Logger.log('generated file');
          const filename = `/cozinha/pedidos/relatorio-pedido-${id.toLowerCase()}.pdf`;
          await this.uploadFileService.uploadFile(filename, pdfBytes);
          Logger.log(`uploaded file with key: ${filename}`);
          await this.prismaService.orderReports.create({
            data: {
              id: this.helpersService.generateId(),
              url: filename,
              order: {
                connect: {
                  id,
                },
              },
              user: {
                connect: {
                  id: userId,
                },
              },
            },
          });
          await this.notificationService.create({
            userId: order.user.id,
            text: 'Você tem um novo relatório de pedido disponível.',
            type: 'ORDER_REPORT',
          });
        } catch (error) {
          Logger.error(error?.message, { error: error });
        }
      })();
      return true;
    } catch (error) {
      Logger.error(error?.message, { details: error });
      throw new InternalServerErrorException('Error generating report');
    }
  }

  private async generatePdf(order: any) {
    const pdfDoc = await PDFDocument.create();
    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const timesRomanBoldFont = await pdfDoc.embedFont(
      StandardFonts.TimesRomanBold,
    );

    const pageMargin = 50;
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 size in points
    const { width, height } = page.getSize();
    const fontSize = 12;

    let yPosition = height - pageMargin;

    function addHeader(page) {
      page.drawText('Relatório de Pedido', {
        x: width / 2 - 95,
        y: yPosition - 20,
        size: 24,
        font: timesRomanBoldFont,
      });
      yPosition -= 40;
    }

    function addOrderDetails(page, order) {
      page.drawText(`Código do Pedido: ${order.id}`, {
        x: pageMargin,
        y: yPosition - 20,
        size: fontSize,
        font: timesRomanFont,
      });
      page.drawText(`Responsável: ${order.user.name}`, {
        x: pageMargin,
        y: yPosition - 40,
        size: fontSize,
        font: timesRomanFont,
      });
      page.drawText(
        `Data de Criação: ${new Date(order.createdAt).toLocaleDateString(
          'pt-BR',
          {
            timeZone: 'America/Sao_Paulo',
          },
        )}`,
        {
          x: pageMargin,
          y: yPosition - 60,
          size: fontSize,
          font: timesRomanFont,
        },
      );
      yPosition -= 80;
    }

    function addTableHeader(page) {
      const cellHeight = 20;
      const columns = [
        { name: 'Nome', x: 50 },
        { name: 'Categoria', x: 400 },
        { name: 'Quantidade', x: 500 },
      ];

      for (const column of columns) {
        page.drawText(column.name, {
          x: column.x,
          y: yPosition - 20,
          size: fontSize,
          font: timesRomanBoldFont,
        });
      }

      yPosition -= cellHeight;
    }

    // function splitTextToFitWidth(text, maxWidth, font, fontSize) {
    //   const words = text.split(' ');
    //   const lines = [];
    //   let currentLine = words[0];

    //   for (let i = 1; i < words.length; i++) {
    //     const word = words[i];
    //     const width = font.widthOfTextAtSize(
    //       `${currentLine} ${word}`,
    //       fontSize,
    //     );
    //     if (width < maxWidth) {
    //       currentLine += ` ${word}`;
    //     } else {
    //       lines.push(currentLine);
    //       currentLine = word;
    //     }
    //   }
    //   lines.push(currentLine);
    //   return lines;
    // }

    function addTableRows(page, items) {
      const cellHeight = 20;
      let currentPage = page;
      for (const item of items) {
        if (yPosition < pageMargin + 50) {
          currentPage = addNewPage();
        }
        currentPage.drawText(item.product.name, {
          x: 50,
          y: yPosition - 20,
          size: fontSize,
          font: timesRomanFont,
        });
        currentPage.drawText(item.product.category.name, {
          x: 300,
          y: yPosition - 20,
          size: fontSize,
          font: timesRomanFont,
        });
        currentPage.drawText(
          `${item.quantity.toString()} ${item.product.unity.name}`,
          {
            x: 500,
            y: yPosition - 20,
            size: fontSize,
            font: timesRomanFont,
          },
        );

        yPosition -= cellHeight;
      }
      return currentPage;
    }

    function addSignatureLine(page) {
      let currentPage = page;
      if (yPosition < pageMargin + 100) {
        currentPage = addNewPage();
      }
      currentPage.drawText(
        '______________________________________________________',
        {
          x: width / 2 - 150,
          y: yPosition - 100,
          size: fontSize,
          font: timesRomanFont,
        },
      );
      currentPage.drawText('Assinatura do pastor responsável', {
        x: width / 2 - 75,
        y: yPosition - 120,
        size: fontSize,
        font: timesRomanFont,
      });
    }

    function addNewPage() {
      const newPage = pdfDoc.addPage([595.28, 841.89]);
      yPosition = height - pageMargin;
      addHeader(newPage);
      addTableHeader(newPage);
      return newPage;
    }

    function addObservation(page, observation) {
      let newPage = page;
      if (yPosition < pageMargin + 100) {
        newPage = addNewPage();
      }
      newPage.drawText('Observações:', {
        x: pageMargin,
        y: yPosition - 20,
        size: fontSize,
        font: timesRomanBoldFont,
      });
      yPosition -= 40;
      const lines = observation.split('\n');
      for (const line of lines) {
        if (yPosition < pageMargin + 50) {
          newPage = addNewPage();
        }
        newPage.drawText(line, {
          x: pageMargin,
          y: yPosition - 20,
          size: fontSize,
          font: timesRomanFont,
        });
        yPosition -= 20;
      }
      return newPage;
    }

    // Start creating the document
    addHeader(page);
    addOrderDetails(page, order);
    addTableHeader(page);
    let lastPage = addTableRows(page, order.orderItem);
    lastPage = addObservation(lastPage, order?.observation);
    addSignatureLine(lastPage);

    return pdfDoc;
  }
}
