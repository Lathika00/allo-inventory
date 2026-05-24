import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function GET() {

    try {

        const expiredReservations =
            await prisma.reservation.findMany({
                where: {
                    status: "pending",
                    expiresAt: {
                        lt: new Date()
                    }
                }
            });

        for (const reservation of expiredReservations) {

            await prisma.inventory.updateMany({
                where: {
                    productId: reservation.productId,
                    warehouseId: reservation.warehouseId
                },
                data: {
                    reservedUnits: {
                        decrement:
                            reservation.quantity
                    }
                }
            });

            await prisma.reservation.update({
                where: {
                    id: reservation.id
                },
                data: {
                    status: "released"
                }
            });

        }

        return NextResponse.json({
            message:
                "Expired reservations cleaned",
            count:
                expiredReservations.length
        });

    } catch {

        return NextResponse.json(
            {
                error:
                    "Cleanup failed"
            },
            {
                status: 500
            }
        );
    }

}