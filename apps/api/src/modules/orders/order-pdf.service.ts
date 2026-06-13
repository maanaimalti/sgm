import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import { Injectable } from "@nestjs/common";
import * as fontkitNs from "@pdf-lib/fontkit";

const fontkit = (fontkitNs as { default?: unknown }).default ?? fontkitNs;

import {
  PDFDocument,
  type PDFFont,
  type PDFImage,
  type PDFPage,
  rgb,
} from "pdf-lib";

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
  serif: PDFFont;
  logo?: PDFImage;
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
const MARGIN = 48;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

// Brand palette — sRGB values derived from the web design tokens (globals.css).
const INK = rgb(0.124, 0.097, 0.088); // --ink   #201916
const INK_2 = rgb(0.242, 0.212, 0.201); // --ink-2 #3e3633
const MUTED = rgb(0.41, 0.382, 0.372); // --muted #69615f
const FAINT = rgb(0.596, 0.566, 0.555); // --faint #98908e
const LINE = rgb(0.9, 0.861, 0.847); // --line  #e6dcd8
const BRAND = rgb(0.056, 0.18, 0.424); // --brand (navy) #0e2e6c
const BRAND_SOFT = rgb(0.88, 0.925, 1.0); // --brand-soft #e0ecff
const PAPER = rgb(0.945, 0.929, 0.898); // --bg    #f1ede5
const SOFT = rgb(0.937, 0.925, 0.89); // --soft  #efece3
const WHITE = rgb(1, 1, 1);

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
  PURCHASED: { fill: BRAND_SOFT, text: BRAND },
  CANCELED: { fill: rgb(0.9, 0.9, 0.9), text: rgb(0.4, 0.4, 0.4) },
};

@Injectable()
export class OrderPdfService {
  private regularBytes?: Uint8Array;
  private boldBytes?: Uint8Array;
  private serifBytes?: Uint8Array;
  private logoBytes?: Uint8Array | null;

  async build(
    order: OrderForPdf,
    options: { generatedByName: string } = { generatedByName: "" },
  ): Promise<Uint8Array> {
    const pdf = await PDFDocument.create();
    pdf.registerFontkit(fontkit as Parameters<typeof pdf.registerFontkit>[0]);

    const [regularBytes, boldBytes, serifBytes] = await this.loadFonts();
    const regular = await pdf.embedFont(regularBytes);
    const bold = await pdf.embedFont(boldBytes);
    const serif = await pdf.embedFont(serifBytes);

    const logoBytes = await this.loadLogo();
    const logo = logoBytes ? await pdf.embedPng(logoBytes) : undefined;

    const ctx: Ctx = {
      pdf,
      regular,
      bold,
      serif,
      logo,
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
    drawTitleBlock(ctx, order);
    drawMetadataCard(ctx, order);
    drawItemsTable(ctx, order);
    drawObservation(ctx, order);
    drawSignature(ctx);
    drawFooters(ctx);

    return pdf.save();
  }

  private async loadFonts(): Promise<[Uint8Array, Uint8Array, Uint8Array]> {
    if (this.regularBytes && this.boldBytes && this.serifBytes) {
      return [this.regularBytes, this.boldBytes, this.serifBytes];
    }
    const baseDir = await resolveAssetDir("fonts/Inter-Regular.ttf");
    const [r, b, s] = await Promise.all([
      readFile(join(baseDir, "fonts", "Inter-Regular.ttf")),
      readFile(join(baseDir, "fonts", "Inter-Bold.ttf")),
      readFile(join(baseDir, "fonts", "InstrumentSerif-Regular.ttf")),
    ]);
    this.regularBytes = r;
    this.boldBytes = b;
    this.serifBytes = s;
    return [r, b, s];
  }

  private async loadLogo(): Promise<Uint8Array | null> {
    if (this.logoBytes !== undefined) return this.logoBytes;
    try {
      const baseDir = await resolveAssetDir("logo.png");
      this.logoBytes = await readFile(join(baseDir, "logo.png"));
    } catch {
      // Logo is decorative — render the report without it if missing.
      this.logoBytes = null;
    }
    return this.logoBytes;
  }
}

/** Resolves the assets dir by probing for a known file across build layouts. */
async function resolveAssetDir(probe: string): Promise<string> {
  const candidates = [
    join(__dirname, "..", "..", "assets"),
    join(process.cwd(), "dist", "assets"),
    join(process.cwd(), "src", "assets"),
    join(process.cwd(), "assets"),
  ];
  for (const dir of candidates) {
    try {
      await access(join(dir, probe));
      return dir;
    } catch {
      // try next
    }
  }
  throw new Error(`Asset not found: ${probe}. Tried: ${candidates.join(", ")}`);
}

function ensureSpace(ctx: Ctx, needed: number): void {
  if (ctx.y - needed < ctx.margin + 64) {
    ctx.page = ctx.pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    ctx.pageNumber += 1;
    ctx.y = PAGE_HEIGHT - MARGIN;
  }
}

function drawHeader(ctx: Ctx, _order: OrderForPdf): void {
  const topY = ctx.y;
  let labelX = ctx.margin;

  if (ctx.logo) {
    const targetH = 30;
    const scale = targetH / ctx.logo.height;
    const w = ctx.logo.width * scale;
    ctx.page.drawImage(ctx.logo, {
      x: ctx.margin,
      y: topY - targetH,
      width: w,
      height: targetH,
    });
    labelX = ctx.margin + w + 12;
  }

  ctx.page.drawText("MAANAIM", {
    x: labelX,
    y: topY - 13,
    size: 12,
    font: ctx.bold,
    color: INK,
  });
  ctx.page.drawText("Gestão de compras", {
    x: labelX,
    y: topY - 25,
    size: 8.5,
    font: ctx.regular,
    color: MUTED,
  });

  // Right-aligned document kicker.
  const kicker = "RELATÓRIO DE PEDIDO";
  const kw = ctx.regular.widthOfTextAtSize(kicker, 8.5);
  ctx.page.drawText(kicker, {
    x: ctx.pageWidth - ctx.margin - kw,
    y: topY - 13,
    size: 8.5,
    font: ctx.regular,
    color: FAINT,
  });

  ctx.y = topY - 38;
  ctx.page.drawLine({
    start: { x: ctx.margin, y: ctx.y },
    end: { x: ctx.pageWidth - ctx.margin, y: ctx.y },
    thickness: 1.4,
    color: BRAND,
  });
  ctx.y -= 24;
}

function drawTitleBlock(ctx: Ctx, order: OrderForPdf): void {
  const code = order.friendlyCode ?? `#${order.id.slice(0, 6)}`;
  const title = order.event?.trim() ? order.event : `Pedido ${code}`;

  const titleSize = 27;
  ctx.page.drawText(truncate(title, 42), {
    x: ctx.margin,
    y: ctx.y - titleSize,
    size: titleSize,
    font: ctx.serif,
    color: INK,
  });
  // Clear the serif descenders before the chip row to avoid overlap.
  ctx.y -= titleSize + 22;

  // Row: code pill + status chip + created date.
  const rowY = ctx.y;
  let x = ctx.margin;

  x = drawPill(ctx, x, rowY, code, BRAND_SOFT, BRAND);
  x += 8;
  x = drawStatusChip(ctx, x, rowY, order.status);
  x += 12;

  const created = `Criado em ${formatDateTime(new Date(order.createdAt))}`;
  ctx.page.drawText(created, {
    x,
    y: rowY + 3.5,
    size: 9.5,
    font: ctx.regular,
    color: MUTED,
  });

  ctx.y = rowY - 18;
}

function drawMetadataCard(ctx: Ctx, order: OrderForPdf): void {
  const padding = 16;
  const rowGap = 30;
  const cardHeight = padding * 2 + rowGap; // two rows of label/value
  ensureSpace(ctx, cardHeight + 10);

  const top = ctx.y;
  ctx.page.drawRectangle({
    x: ctx.margin,
    y: top - cardHeight,
    width: CONTENT_WIDTH,
    height: cardHeight,
    color: SOFT,
    borderColor: LINE,
    borderWidth: 1,
  });

  const colLeft = ctx.margin + padding;
  const colRight = ctx.margin + CONTENT_WIDTH / 2 + 6;
  const approvedAt = order.approvedAt ? new Date(order.approvedAt) : null;

  const firstRowY = top - padding - 4;
  drawField(ctx, colLeft, firstRowY, "Responsável", order.user.name);
  drawField(
    ctx,
    colRight,
    firstRowY,
    "Aprovado por",
    order.approvedBy?.name ?? "—",
  );

  const secondRowY = firstRowY - rowGap;
  drawField(
    ctx,
    colLeft,
    secondRowY,
    "Criado em",
    formatDateTime(new Date(order.createdAt)),
  );
  drawField(
    ctx,
    colRight,
    secondRowY,
    "Aprovado em",
    approvedAt ? formatDateTime(approvedAt) : "—",
  );

  ctx.y = top - cardHeight - 24;
}

function drawField(
  ctx: Ctx,
  x: number,
  y: number,
  label: string,
  value: string,
): void {
  ctx.page.drawText(label.toUpperCase(), {
    x,
    y,
    size: 7.5,
    font: ctx.bold,
    color: FAINT,
  });
  ctx.page.drawText(truncate(value, 40), {
    x,
    y: y - 13,
    size: 11,
    font: ctx.regular,
    color: INK_2,
  });
}

type Col = {
  key: string;
  label: string;
  x: number;
  width: number;
  right?: boolean;
};

function drawItemsTable(ctx: Ctx, order: OrderForPdf): void {
  const headerHeight = 24;
  const rowHeight = 22;
  const fontSize = 10;

  const cols: Col[] = [
    { key: "name", label: "Produto", x: ctx.margin + 12, width: 232 },
    { key: "category", label: "Categoria", x: ctx.margin + 252, width: 150 },
    { key: "unit", label: "Unidade", x: ctx.margin + 402, width: 60 },
    {
      key: "qty",
      label: "Qtd",
      x: ctx.margin + 12,
      width: CONTENT_WIDTH - 24,
      right: true,
    },
  ];

  ensureSpace(ctx, headerHeight + rowHeight + 30);

  drawSectionHeading(ctx, "Itens do pedido");
  const count = order.orderItem.length;
  const totalQty = order.orderItem.reduce((s, i) => s + i.quantity, 0);
  const sub = `${count} ${count === 1 ? "item" : "itens"} · ${totalQty} unidades`;
  const subW = ctx.regular.widthOfTextAtSize(sub, 9.5);
  ctx.page.drawText(sub, {
    x: ctx.pageWidth - ctx.margin - subW,
    y: ctx.y + 2,
    size: 9.5,
    font: ctx.regular,
    color: MUTED,
  });
  ctx.y -= 14;

  const drawHeaderRow = () => {
    ctx.page.drawRectangle({
      x: ctx.margin,
      y: ctx.y - headerHeight,
      width: CONTENT_WIDTH,
      height: headerHeight,
      color: BRAND,
    });
    for (const col of cols) {
      const tw = ctx.bold.widthOfTextAtSize(col.label, 8.5);
      const x = col.right ? col.x + col.width - tw : col.x;
      ctx.page.drawText(col.label.toUpperCase(), {
        x,
        y: ctx.y - headerHeight + 8.5,
        size: 8.5,
        font: ctx.bold,
        color: WHITE,
      });
    }
    ctx.y -= headerHeight;
  };

  drawHeaderRow();

  let alt = false;
  for (const item of order.orderItem) {
    if (ctx.y - rowHeight < ctx.margin + 64) {
      ctx.page = ctx.pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      ctx.pageNumber += 1;
      ctx.y = PAGE_HEIGHT - MARGIN;
      drawHeaderRow();
    }
    ctx.page.drawRectangle({
      x: ctx.margin,
      y: ctx.y - rowHeight,
      width: CONTENT_WIDTH,
      height: rowHeight,
      color: alt ? SOFT : WHITE,
    });
    alt = !alt;

    const cells: Record<string, string> = {
      name: truncate(item.product.name, 38),
      category: truncate(item.product.category?.name ?? "—", 24),
      unit: truncate(item.product.unity?.name ?? "—", 10),
      qty: String(item.quantity),
    };

    for (const col of cols) {
      const text = cells[col.key];
      const font = col.key === "name" ? ctx.bold : ctx.regular;
      const color = col.key === "name" ? INK : INK_2;
      const tw = font.widthOfTextAtSize(text, fontSize);
      const x = col.right ? col.x + col.width - tw : col.x;
      ctx.page.drawText(text, {
        x,
        y: ctx.y - rowHeight + 7,
        size: fontSize,
        font,
        color,
      });
    }
    ctx.y -= rowHeight;
  }

  ctx.page.drawLine({
    start: { x: ctx.margin, y: ctx.y },
    end: { x: ctx.pageWidth - ctx.margin, y: ctx.y },
    thickness: 0.75,
    color: LINE,
  });
  ctx.y -= 22;
}

function drawObservation(ctx: Ctx, order: OrderForPdf): void {
  ensureSpace(ctx, 70);
  drawSectionHeading(ctx, "Observação");
  ctx.y -= 6;

  const text = order.observation?.trim() ? order.observation : "—";
  const fontSize = 10.5;
  const innerPad = 12;
  const maxWidth = CONTENT_WIDTH - innerPad * 2;
  const lines = wrapText(text, ctx.regular, fontSize, maxWidth);
  const lineH = 15;
  const boxHeight = innerPad * 2 + lines.length * lineH - (lineH - fontSize);

  ensureSpace(ctx, boxHeight);
  const top = ctx.y;
  ctx.page.drawRectangle({
    x: ctx.margin,
    y: top - boxHeight,
    width: CONTENT_WIDTH,
    height: boxHeight,
    color: PAPER,
    borderColor: LINE,
    borderWidth: 1,
  });

  let lineY = top - innerPad - fontSize;
  for (const line of lines) {
    ctx.page.drawText(line, {
      x: ctx.margin + innerPad,
      y: lineY,
      size: fontSize,
      font: ctx.regular,
      color: INK_2,
    });
    lineY -= lineH;
  }
  ctx.y = top - boxHeight - 24;
}

function drawSignature(ctx: Ctx): void {
  ensureSpace(ctx, 90);
  const lineWidth = 240;
  const lineX = (ctx.pageWidth - lineWidth) / 2;
  const lineY = ctx.margin + 64;
  ctx.page.drawLine({
    start: { x: lineX, y: lineY },
    end: { x: lineX + lineWidth, y: lineY },
    thickness: 0.8,
    color: INK,
  });
  const label = "Assinatura do pastor responsável";
  const labelWidth = ctx.regular.widthOfTextAtSize(label, 9.5);
  ctx.page.drawText(label, {
    x: (ctx.pageWidth - labelWidth) / 2,
    y: lineY - 13,
    size: 9.5,
    font: ctx.regular,
    color: MUTED,
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
      start: { x: MARGIN, y: MARGIN + 16 },
      end: { x: PAGE_WIDTH - MARGIN, y: MARGIN + 16 },
      thickness: 0.4,
      color: LINE,
    });
    page.drawText(left, {
      x: MARGIN,
      y: MARGIN + 4,
      size: 7.5,
      font: ctx.regular,
      color: FAINT,
    });
    const rightWidth = ctx.regular.widthOfTextAtSize(right, 7.5);
    page.drawText(right, {
      x: PAGE_WIDTH - MARGIN - rightWidth,
      y: MARGIN + 4,
      size: 7.5,
      font: ctx.regular,
      color: FAINT,
    });
  }
}

function drawSectionHeading(ctx: Ctx, text: string): void {
  ctx.page.drawText(text, {
    x: ctx.margin,
    y: ctx.y - 13,
    size: 14,
    font: ctx.serif,
    color: INK,
  });
  ctx.y -= 22;
}

/** Draws a rounded-feel pill (square corners) and returns the x after it. */
function drawPill(
  ctx: Ctx,
  x: number,
  y: number,
  text: string,
  fill: ReturnType<typeof rgb>,
  color: ReturnType<typeof rgb>,
): number {
  const size = 9;
  const padX = 7;
  const padY = 4;
  const tw = ctx.bold.widthOfTextAtSize(text, size);
  const h = size + padY * 2;
  ctx.page.drawRectangle({
    x,
    y: y - padY,
    width: tw + padX * 2,
    height: h,
    color: fill,
  });
  ctx.page.drawText(text, {
    x: x + padX,
    y: y + 0.5,
    size,
    font: ctx.bold,
    color,
  });
  return x + tw + padX * 2;
}

function drawStatusChip(
  ctx: Ctx,
  x: number,
  y: number,
  status: string,
): number {
  const palette = STATUS_COLOR[status] ?? STATUS_COLOR.PENDING;
  const label = STATUS_LABEL_PT[status] ?? status;
  return drawPill(ctx, x, y, label, palette.fill, palette.text);
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
