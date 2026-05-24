import prisma from "../../../../lib/prisma";
import { NextResponse } from "next/server";

const RESERVATION_TTL_MS = 10 * 60 * 1000;

export async function GET() {
    const reservations = await prisma.reservation.findMany({
        include: {
            product: true,
            warehouse: true,
        },
        orderBy: { expiresAt: "desc" },
    });

    const data = reservations.map((r) => ({
        id: r.id,
        productId: r.productId,
        warehouseId: r.warehouseId,
        product: r.product.name,
        warehouse: r.warehouse.name,
        quantity: r.quantity,
        status: r.status,
        expiresAt: r.expiresAt.toISOString(),
        reservedAt: new Date(
            r.expiresAt.getTime() - RESERVATION_TTL_MS
        ).toISOString(),
    }));

    return NextResponse.json(data);
}
