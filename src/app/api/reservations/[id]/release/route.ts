import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function POST(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {

    try {

        const { id } = await context.params;

        const reservation =
            await prisma.reservation.findUnique({
                where: { id }
            });

        if (!reservation) {
            return NextResponse.json(
                { error: "Reservation not found" },
                { status: 404 }
            );
        }

        if (reservation.status !== "pending") {
            return NextResponse.json(
                { error: "Already processed" },
                { status: 400 }
            );
        }

        await prisma.inventory.updateMany({
            where: {
                productId: reservation.productId,
                warehouseId: reservation.warehouseId
            },
            data: {
                reservedUnits: {
                    decrement: reservation.quantity
                }
            }
        });

        const updated =
            await prisma.reservation.update({
                where: { id },
                data: {
                    status: "released"
                }
            });

        return NextResponse.json(updated);

    } catch {

        return NextResponse.json(
            { error: "Server error" },
            { status: 500 }
        );
    }
}