import { BadRequestException, ConflictException } from "@nestjs/common";
import { MovementService } from "./movement.service";

type TxMock = {
  movement: { create: jest.Mock };
  stock: {
    upsert: jest.Mock;
    updateMany: jest.Mock;
    findUnique: jest.Mock;
    findUniqueOrThrow: jest.Mock;
  };
};

function build() {
  const tx: TxMock = {
    movement: { create: jest.fn(async () => ({ id: "mov-1" })) },
    stock: {
      upsert: jest.fn(),
      updateMany: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
  };
  const prisma = {
    $transaction: jest.fn(async (cb: (tx: TxMock) => unknown) => cb(tx)),
    product: { findUnique: jest.fn(async () => null) },
  };
  const helpers = { generateId: jest.fn(() => "generated-id") };
  const notifications = { broadcast: jest.fn(async () => undefined) };

  const service = new MovementService(
    prisma as never,
    helpers as never,
    notifications as never,
  );

  return { service, tx, prisma, notifications };
}

describe("MovementService.create", () => {
  it("increments the balance on an inbound movement", async () => {
    const { service, tx } = build();
    tx.stock.upsert.mockResolvedValue({ quantity: 30 });

    await service.create({ productId: "p1", quantity: 10, type: "in" });

    expect(tx.stock.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { productId: "p1" },
        update: { quantity: { increment: 10 } },
      }),
    );
  });

  it("decrements the balance on an outbound movement within the balance", async () => {
    const { service, tx } = build();
    tx.stock.updateMany.mockResolvedValue({ count: 1 });
    tx.stock.findUniqueOrThrow.mockResolvedValue({ quantity: 5 });

    await service.create({ productId: "p1", quantity: 10, type: "out" });

    expect(tx.stock.updateMany).toHaveBeenCalledWith({
      where: { productId: "p1", quantity: { gte: 10 } },
      data: { quantity: { decrement: 10 } },
    });
  });

  it("rejects an outbound movement larger than the balance and reports what is available", async () => {
    const { service, tx } = build();
    tx.stock.updateMany.mockResolvedValue({ count: 0 });
    tx.stock.findUnique.mockResolvedValue({ quantity: 3 });

    await expect(
      service.create({ productId: "p1", quantity: 10, type: "out" }),
    ).rejects.toThrow(ConflictException);
    await expect(
      service.create({ productId: "p1", quantity: 10, type: "out" }),
    ).rejects.toThrow(/disponível 3/);
  });

  it("rejects a non-positive quantity before touching the stock", async () => {
    const { service, tx } = build();

    await expect(
      service.create({ productId: "p1", quantity: 0, type: "in" }),
    ).rejects.toThrow(BadRequestException);
    expect(tx.stock.upsert).not.toHaveBeenCalled();
    expect(tx.movement.create).not.toHaveBeenCalled();
  });

  it("notifies low stock only when the movement crosses the minimum", async () => {
    const { service, tx, prisma, notifications } = build();
    tx.stock.updateMany.mockResolvedValue({ count: 1 });
    tx.stock.findUniqueOrThrow.mockResolvedValue({ quantity: 5 });
    prisma.product.findUnique.mockResolvedValue({
      id: "p1",
      name: "Arroz",
      minStock: 10,
      departmentId: "d1",
    } as never);

    await service.create({ productId: "p1", quantity: 10, type: "out" });

    expect(notifications.broadcast).toHaveBeenCalledWith(
      expect.objectContaining({ type: "LOW_STOCK" }),
    );
  });
});

describe("MovementService.createBatch", () => {
  it("applies every item inside a single transaction", async () => {
    const { service, tx, prisma } = build();
    tx.stock.upsert.mockResolvedValue({ quantity: 10 });

    await service.createBatch({
      items: [
        { productId: "p1", quantity: 5, type: "in" },
        { productId: "p2", quantity: 5, type: "in" },
      ],
    });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.movement.create).toHaveBeenCalledTimes(2);
  });

  it("propagates a failure instead of swallowing it, so nothing commits", async () => {
    const { service, tx, notifications } = build();
    tx.stock.upsert.mockResolvedValue({ quantity: 10 });
    tx.stock.updateMany.mockResolvedValue({ count: 0 });
    tx.stock.findUnique.mockResolvedValue({ quantity: 1 });

    await expect(
      service.createBatch({
        items: [
          { productId: "p1", quantity: 5, type: "in" },
          { productId: "p2", quantity: 99, type: "out" },
        ],
      }),
    ).rejects.toThrow(ConflictException);

    expect(notifications.broadcast).not.toHaveBeenCalled();
  });
});
