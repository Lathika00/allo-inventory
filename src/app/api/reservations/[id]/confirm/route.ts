import prisma from "../../../../../lib/prisma";
import { NextResponse } from "next/server";

export async function POST(
    _request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;

        const updated = await prisma.$transaction(async (tx) => {
            const reservation = await tx.reservation.findUnique({
                where: { id },
            });

            if (!reservation) {
                throw new Error("NOT_FOUND");
            }

            if (reservation.status !== "pending") {
                throw new Error("ALREADY_PROCESSED");
            }

            if (new Date() > reservation.expiresAt) {
                throw new Error("EXPIRED");
            }

            const inventory = await tx.inventory.findUnique({
                where: {
                    productId_warehouseId: {
                        productId: reservation.productId,
                        warehouseId: reservation.warehouseId,
                    },
                },
            });

            if (!inventory) {
                throw new Error("INVENTORY_NOT_FOUND");
            }

            await tx.inventory.update({
                where: { id: inventory.id },
                data: {
                    totalUnits: { decrement: reservation.quantity },
                    reservedUnits: { decrement: reservation.quantity },
                },
            });

            return tx.reservation.update({
                where: { id },
                data: { status: "confirmed" },
            });
        });

        return NextResponse.json(updated);
    } catch (error) {
        if (error instanceof Error) {
            if (error.message === "NOT_FOUND") {
                return NextResponse.json(
                    { error: "Reservation not found" },
                    { status: 404 }
                );
            }
            if (error.message === "EXPIRED") {
                return NextResponse.json(
                    { error: "Reservation expired" },
                    { status: 410 }
                );
            }
            if (error.message === "ALREADY_PROCESSED") {
                return NextResponse.json(
                    { error: "Already processed" },
                    { status: 400 }
                );
            }
        }

        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
