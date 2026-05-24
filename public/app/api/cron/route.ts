import prisma from "../../../lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const expiredReservations = await prisma.reservation.findMany({
            where: {
                status: "pending",
                expiresAt: { lt: new Date() },
            },
        });

        for (const reservation of expiredReservations) {
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

        return NextResponse.json({
            message: "Expired reservations cleaned",
            count: expiredReservations.length,
        });
    } catch {
        return NextResponse.json({ error: "Cleanup failed" }, { status: 500 });
    }
}
