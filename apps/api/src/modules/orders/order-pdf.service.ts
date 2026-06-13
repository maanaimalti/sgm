import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import { Injectable } from "@nestjs/common";
import * as fontkitNs from "@pdf-lib/fontkit";

const fontkit = (fontkitNs as { default?: unknown }).default ?? fontkitNs;
import { PDFDocument, type PDFFont, type PDFPage, rgb } from "pdf-lib";

type OrderForPdf = {
  id: string;
  friendlyCode?: string | null;
  event?: string | null;
  observation?: string | null;
  status: string;
  createdAt: Date | string;
  approvedAt?: Date | string | null;
  user: { id: string; name: string };
  approvedBy?: { id: string; name: string } | null;
  orderItem: Array<{
    quantity: number;
    product: {
      name: string;
      category?: { name?: string } | null;
      unity?: { name?: string } | null;
    };
  }>;
};

type Ctx = {
  pdf: PDFDocument;
  regular: PDFFont;
  bold: PDFFont;
  page: PDFPage;
  y: number;
  pageNumber: number;
  pageWidth: number;
  pageHeight: number;
  margin: number;
  generatedByName: string;
  generatedAt: Date;
};

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 50;
const COLOR_TEXT = rgb(0.13, 0.13, 0.13);
const COLOR_MUTED = rgb(0.45, 0.45, 0.45);
const COLOR_ACCENT = rgb(0.16, 0.36, 0.7);
const COLOR_ROW_ALT = rgb(0.97, 0.97, 0.97);
const COLOR_TABLE_HEADER_BG = rgb(0.93, 0.94, 0.97);
const COLOR_BORDER = rgb(0.85, 0.85, 0.85);

const STATUS_LABEL_PT: Record<string, string> = {
  PENDING: "Pendente",
  APPROVED: "Aprovado",
  REJECTED: "Rejeitado",
  PURCHASED: "Comprado",
  CANCELED: "Cancelado",
};

const STATUS_COLOR: Record<
  string,
  { fill: ReturnType<typeof rgb>; text: ReturnType<typeof rgb> }
> = {
  PENDING: { fill: rgb(0.99, 0.93, 0.78), text: rgb(0.55, 0.36, 0.05) },
  APPROVED: { fill: rgb(0.83, 0.94, 0.83), text: rgb(0.13, 0.5, 0.18) },
  REJECTED: { fill: rgb(0.97, 0.83, 0.83), text: rgb(0.66, 0.16, 0.16) },
  PURCHASED: { fill: rgb(0.83, 0.89, 0.97), text: rgb(0.14, 0.34, 0.65) },
  CANCELED: { fill: rgb(0.9, 0.9, 0.9), text: rgb(0.4, 0.4, 0.4) },
};

@Injectable()
export class OrderPdfService {
  private regularBytes?: Uint8Array;
  private boldBytes?: Uint8Array;

  async build(
    order: OrderForPdf,
    options: { generatedByName: string } = { generatedByName: "" },
  ): Promise<Uint8Array> {
    const pdf = await PDFDocument.create();
    pdf.registerFontkit(fontkit as Parameters<typeof pdf.registerFontkit>[0]);

    const [regularBytes, boldBytes] = await this.loadFonts();
    const regular = await pdf.embedFont(regularBytes);
    const bold = await pdf.embedFont(boldBytes);

    const ctx: Ctx = {
      pdf,
      regular,
      bold,
      page: pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]),
      y: PAGE_HEIGHT - MARGIN,
      pageNumber: 1,
      pageWidth: PAGE_WIDTH,
      pageHeight: PAGE_HEIGHT,
      margin: MARGIN,
      generatedByName: options.generatedByName ?? order.user.name,
      generatedAt: new Date(),
    };

    drawHeader(ctx, order);
    drawMetadata(ctx, order);
    drawItemsTable(ctx, order);
    drawObservation(ctx, order);
    drawSignature(ctx);
    drawFooters(ctx);

    return pdf.save();
  }

  private async loadFonts(): Promise<[Uint8Array, Uint8Array]> {
    if (this.regularBytes && this.boldBytes) {
      return [this.regularBytes, this.boldBytes];
    }
    const baseDir = await resolveFontDir();
    const [r, b] = await Promise.all([
      readFile(join(baseDir, "Inter-Regular.ttf")),
      readFile(join(baseDir, "Inter-Bold.ttf")),
    ]);
    this.regularBytes = r;
    this.boldBytes = b;
    return [r, b];
  }
}

async function resolveFontDir(): Promise<string> {
  const candidates = [
    join(__dirname, "..", "..", "assets", "fonts"),
    join(process.cwd(), "dist", "assets", "fonts"),
    join(process.cwd(), "src", "assets", "fonts"),
    join(process.cwd(), "assets", "fonts"),
  ];
  for (const dir of candidates) {
    try {
      await access(join(dir, "Inter-Regular.ttf"));
      return dir;
    } catch {
      // try next
    }
  }
  throw new Error(
    `Inter font files not found. Tried: ${candidates.join(", ")}`,
  );
}

function ensureSpace(ctx: Ctx, needed: number): void {
  if (ctx.y - needed < ctx.margin + 70) {
    ctx.page = ctx.pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    ctx.pageNumber += 1;
    ctx.y = PAGE_HEIGHT - MARGIN;
  }
}

function drawHeader(ctx: Ctx, order: OrderForPdf): void {
  const title = "Relatório de Pedido";
  const titleSize = 22;
  const titleWidth = ctx.bold.widthOfTextAtSize(title, titleSize);
  ctx.page.drawText(title, {
    x: (ctx.pageWidth - titleWidth) / 2,
    y: ctx.y - titleSize,
    size: titleSize,
    font: ctx.bold,
    color: COLOR_TEXT,
  });
  ctx.y -= titleSize + 8;

  const code = order.friendlyCode ?? `#${order.id.slice(0, 6)}`;
  const codeSize = 14;
  const codeWidth = ctx.bold.widthOfTextAtSize(code, codeSize);
  ctx.page.drawText(code, {
    x: (ctx.pageWidth - codeWidth) / 2,
    y: ctx.y - codeSize,
    size: codeSize,
    font: ctx.bold,
    color: COLOR_ACCENT,
  });
  ctx.y -= codeSize + 4;

  if (order.event) {
    const subtitle = order.event;
    const subSize = 11;
    const subWidth = ctx.regular.widthOfTextAtSize(subtitle, subSize);
    ctx.page.drawText(subtitle, {
      x: (ctx.pageWidth - subWidth) / 2,
      y: ctx.y - subSize,
      size: subSize,
      font: ctx.regular,
      color: COLOR_MUTED,
    });
    ctx.y -= subSize + 6;
  }

  ctx.page.drawLine({
    start: { x: ctx.margin, y: ctx.y - 6 },
    end: { x: ctx.pageWidth - ctx.margin, y: ctx.y - 6 },
    thickness: 1,
    color: COLOR_ACCENT,
  });
  ctx.y -= 18;
}

function drawMetadata(ctx: Ctx, order: OrderForPdf): void {
  const blockHeight = 86;
  ensureSpace(ctx, blockHeight);

  const colLeft = ctx.margin;
  const colRight = ctx.pageWidth / 2 + 10;
  const labelSize = 9;
  const valueSize = 11;
  const rowGap = 22;

  const createdAt = new Date(order.createdAt);
  const approvedAt = order.approvedAt ? new Date(order.approvedAt) : null;

  const left: Array<[string, string]> = [
    ["Código", order.friendlyCode ?? `#${order.id.slice(0, 6)}`],
    ["Responsável", order.user.name],
    ["Criado em", formatDateTime(createdAt)],
  ];

  const right: Array<[string, string]> = [
    ["Status", STATUS_LABEL_PT[order.status] ?? order.status],
    ["Aprovado por", order.approvedBy?.name ?? "—"],
    ["Aprovado em", approvedAt ? formatDateTime(approvedAt) : "—"],
  ];

  let rowY = ctx.y;
  for (let i = 0; i < left.length; i++) {
    drawLabelValue(
      ctx,
      colLeft,
      rowY,
      left[i][0],
      left[i][1],
      labelSize,
      valueSize,
    );
    drawLabelValue(
      ctx,
      colRight,
      rowY,
      right[i][0],
      right[i][1],
      labelSize,
      valueSize,
      {
        asStatusChip: i === 0 ? order.status : undefined,
      },
    );
    rowY -= rowGap;
  }
  ctx.y = rowY - 6;
}

function drawLabelValue(
  ctx: Ctx,
  x: number,
  y: number,
  label: string,
  value: string,
  labelSize: number,
  valueSize: number,
  opts: { asStatusChip?: string } = {},
): void {
  ctx.page.drawText(label, {
    x,
    y,
    size: labelSize,
    font: ctx.regular,
    color: COLOR_MUTED,
  });
  if (opts.asStatusChip) {
    const status = opts.asStatusChip;
    const palette = STATUS_COLOR[status] ?? STATUS_COLOR.PENDING;
    const labelText = STATUS_LABEL_PT[status] ?? status;
    const padX = 8;
    const padY = 3;
    const textWidth = ctx.bold.widthOfTextAtSize(labelText, valueSize - 1);
    const chipY = y - labelSize - 4 - padY;
    ctx.page.drawRectangle({
      x: x - padX / 2,
      y: chipY - padY + 2,
      width: textWidth + padX,
      height: valueSize - 1 + padY * 2,
      color: palette.fill,
      borderColor: palette.fill,
      borderWidth: 0,
    });
    ctx.page.drawText(labelText, {
      x: x + padX / 2 - padX / 2,
      y: chipY + 1,
      size: valueSize - 1,
      font: ctx.bold,
      color: palette.text,
    });
  } else {
    ctx.page.drawText(value, {
      x,
      y: y - labelSize - 4,
      size: valueSize,
      font: ctx.regular,
      color: COLOR_TEXT,
    });
  }
}

function drawItemsTable(ctx: Ctx, order: OrderForPdf): void {
  const headerHeight = 22;
  const rowHeight = 22;
  const fontSize = 10;
  const headerSize = 10;

  type Col = {
    key: string;
    label: string;
    x: number;
    width: number;
    align?: "right";
  };
  const cols: Col[] = [
    { key: "name", label: "Nome", x: ctx.margin + 8, width: 220 },
    { key: "category", label: "Categoria", x: ctx.margin + 240, width: 130 },
    { key: "unit", label: "Unidade", x: ctx.margin + 380, width: 60 },
    {
      key: "qty",
      label: "Quantidade",
      x: ctx.margin + 450,
      width: 60,
      align: "right",
    },
  ];

  ensureSpace(ctx, headerHeight + rowHeight);

  ctx.page.drawText("Itens do pedido", {
    x: ctx.margin,
    y: ctx.y - 12,
    size: 12,
    font: ctx.bold,
    color: COLOR_TEXT,
  });
  ctx.y -= 22;

  const drawHeaderRow = () => {
    ctx.page.drawRectangle({
      x: ctx.margin,
      y: ctx.y - headerHeight,
      width: ctx.pageWidth - ctx.margin * 2,
      height: headerHeight,
      color: COLOR_TABLE_HEADER_BG,
    });
    for (const col of cols) {
      const text = col.label;
      const textWidth = ctx.bold.widthOfTextAtSize(text, headerSize);
      const x = col.align === "right" ? col.x + col.width - textWidth : col.x;
      ctx.page.drawText(text, {
        x,
        y: ctx.y - headerHeight + 7,
        size: headerSize,
        font: ctx.bold,
        color: COLOR_TEXT,
      });
    }
    ctx.y -= headerHeight;
  };

  drawHeaderRow();

  let alt = false;
  for (const item of order.orderItem) {
    if (ctx.y - rowHeight < ctx.margin + 70) {
      ctx.page = ctx.pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      ctx.pageNumber += 1;
      ctx.y = PAGE_HEIGHT - MARGIN;
      drawHeaderRow();
    }
    if (alt) {
      ctx.page.drawRectangle({
        x: ctx.margin,
        y: ctx.y - rowHeight,
        width: ctx.pageWidth - ctx.margin * 2,
        height: rowHeight,
        color: COLOR_ROW_ALT,
      });
    }
    alt = !alt;

    const cells: Record<string, string> = {
      name: truncate(item.product.name, 36),
      category: truncate(item.product.category?.name ?? "—", 22),
      unit: item.product.unity?.name ?? "—",
      qty: String(item.quantity),
    };

    for (const col of cols) {
      const text = cells[col.key];
      const textWidth = ctx.regular.widthOfTextAtSize(text, fontSize);
      const x = col.align === "right" ? col.x + col.width - textWidth : col.x;
      ctx.page.drawText(text, {
        x,
        y: ctx.y - rowHeight + 7,
        size: fontSize,
        font: ctx.regular,
        color: COLOR_TEXT,
      });
    }
    ctx.y -= rowHeight;
  }

  ctx.page.drawLine({
    start: { x: ctx.margin, y: ctx.y },
    end: { x: ctx.pageWidth - ctx.margin, y: ctx.y },
    thickness: 0.5,
    color: COLOR_BORDER,
  });
  ctx.y -= 14;
}

function drawObservation(ctx: Ctx, order: OrderForPdf): void {
  ensureSpace(ctx, 60);
  ctx.page.drawText("Observação", {
    x: ctx.margin,
    y: ctx.y - 12,
    size: 12,
    font: ctx.bold,
    color: COLOR_TEXT,
  });
  ctx.y -= 22;

  const text = order.observation?.trim() ? order.observation : "—";
  const fontSize = 11;
  const maxWidth = ctx.pageWidth - ctx.margin * 2;
  const lines = wrapText(text, ctx.regular, fontSize, maxWidth);
  for (const line of lines) {
    ensureSpace(ctx, 16);
    ctx.page.drawText(line, {
      x: ctx.margin,
      y: ctx.y - fontSize,
      size: fontSize,
      font: ctx.regular,
      color: COLOR_TEXT,
    });
    ctx.y -= 16;
  }
  ctx.y -= 6;
}

function drawSignature(ctx: Ctx): void {
  ensureSpace(ctx, 80);
  const lineWidth = 220;
  const lineX = (ctx.pageWidth - lineWidth) / 2;
  const lineY = ctx.margin + 70;
  ctx.page.drawLine({
    start: { x: lineX, y: lineY },
    end: { x: lineX + lineWidth, y: lineY },
    thickness: 0.8,
    color: COLOR_TEXT,
  });
  const label = "Assinatura do pastor responsável";
  const labelWidth = ctx.regular.widthOfTextAtSize(label, 10);
  ctx.page.drawText(label, {
    x: (ctx.pageWidth - labelWidth) / 2,
    y: lineY - 14,
    size: 10,
    font: ctx.regular,
    color: COLOR_MUTED,
  });
}

function drawFooters(ctx: Ctx): void {
  const total = ctx.pdf.getPageCount();
  const generatedAt = formatDateTime(ctx.generatedAt);
  for (let i = 0; i < total; i++) {
    const page = ctx.pdf.getPage(i);
    const left = `Gerado em ${generatedAt} por ${ctx.generatedByName}`;
    const right = `Página ${i + 1} de ${total}`;
    page.drawLine({
      start: { x: MARGIN, y: MARGIN + 18 },
      end: { x: PAGE_WIDTH - MARGIN, y: MARGIN + 18 },
      thickness: 0.4,
      color: COLOR_BORDER,
    });
    page.drawText(left, {
      x: MARGIN,
      y: MARGIN + 5,
      size: 8,
      font: ctx.regular,
      color: COLOR_MUTED,
    });
    const rightWidth = ctx.regular.widthOfTextAtSize(right, 8);
    page.drawText(right, {
      x: PAGE_WIDTH - MARGIN - rightWidth,
      y: MARGIN + 5,
      size: 8,
      font: ctx.regular,
      color: COLOR_MUTED,
    });
  }
}

function formatDateTime(d: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

function wrapText(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
): string[] {
  const out: string[] = [];
  for (const paragraph of text.split("\n")) {
    if (!paragraph.trim()) {
      out.push("");
      continue;
    }
    const words = paragraph.split(/\s+/);
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        line = candidate;
      } else {
        if (line) out.push(line);
        line = word;
      }
    }
    if (line) out.push(line);
  }
  return out;
}
