import { OrdersService } from "./orders.service";

const ORDER_ID = "order-1";
const USER_ID = "user-1";

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000);

function build() {
  const prisma = {
    orders: {
      findUnique: jest.fn(async () => ({
        id: ORDER_ID,
        userId: USER_ID,
        status: "APPROVED",
        event: "Seminário",
        observation: null,
        approvedById: "approver-1",
        orderItem: [{ productId: "p1", quantity: 2 }],
      })),
    },
    orderReports: { findFirst: jest.fn(async () => null) },
    report: {
      findFirst: jest.fn(),
      update: jest.fn(async () => ({})),
      create: jest.fn(async () => ({})),
    },
  };
  const eventEmitter = { emit: jest.fn() };
  const service = new OrdersService(
    { generateId: () => "generated-id" } as never,
    prisma as never,
    { getDownloadUrl: async () => "https://signed" } as never,
    { create: jest.fn() } as never,
    eventEmitter as never,
  );
  return { service, prisma, eventEmitter };
}

describe("OrdersService.generateReport — in-flight jobs", () => {
  it("waits on a job that is still plausibly running", async () => {
    const { service, prisma, eventEmitter } = build();
    prisma.report.findFirst.mockResolvedValue({
      id: "report-1",
      createdAt: minutesAgo(2),
    } as never);

    const result = await service.generateReport(ORDER_ID, USER_ID, ["admin"]);

    expect(result).toEqual({ status: "processing" });
    expect(prisma.report.create).not.toHaveBeenCalled();
    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });

  it("gives up on a job left in flight by a restart and enqueues a new one", async () => {
    const { service, prisma, eventEmitter } = build();
    prisma.report.findFirst.mockResolvedValue({
      id: "report-1",
      createdAt: minutesAgo(45),
    } as never);

    const result = await service.generateReport(ORDER_ID, USER_ID, ["admin"]);

    expect(prisma.report.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "report-1" },
        data: expect.objectContaining({ status: "FAILED" }),
      }),
    );
    expect(prisma.report.create).toHaveBeenCalled();
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      "report.generate",
      expect.objectContaining({ parameters: { orderId: ORDER_ID } }),
    );
    expect(result).toEqual({ status: "processing" });
  });

  it("reports nothing in flight when no job exists", async () => {
    const { service, prisma } = build();
    prisma.report.findFirst.mockResolvedValue(null as never);

    const status = await service.getReport(ORDER_ID, USER_ID, ["admin"]);

    expect(status).toEqual({ status: "none" });
  });
});
