import prisma from "../../../../lib/prisma";
import { NextResponse } from "next/server";

export async function POST() {
    try {
        const pending = await prisma.reservation.findMany({
            where: { status: "pending" },
        });

        for (const reservation of pending) {
            await prisma.$transaction(async (tx) => {
                const inventory = await tx.inventory.findUnique({
                    where: {
                        productId_warehouseId: {
                            productId: reservation.productId,
                            warehouseId: reservation.warehouseId,
                        },
                    },
                });

                if (inventory) {
                    await tx.inventory.update({
                        where: { id: inventory.id },
                        data: {
                            reservedUnits: {
                                decrement: reservation.quantity,
                            },
                        },
                    });
                }

                await tx.reservation.update({
                    where: { id: reservation.id },
                    data: { status: "released" },
                });
            });
        }

        return NextResponse.json({ released: pending.length });
    } catch {
        return NextResponse.json({ error: "Clear failed" }, { status: 500 });
    }
}
