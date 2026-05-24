import prisma from "../../../lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { delCached } from "../../../lib/upstash";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { inventoryId, productId, warehouseId, quantity } = body;

        if (!quantity || quantity < 1) {
            return NextResponse.json(
                { error: "Invalid quantity" },
                { status: 400 }
            );
        }

        const reservation = await prisma.$transaction(async (tx) => {
            const inventory = inventoryId
                ? await tx.inventory.findUnique({
                    where: { id: inventoryId },
                })
                : await tx.inventory.findFirst({
                    where: { productId, warehouseId },
                });

            if (!inventory) {
                throw new Error("Inventory not found");
            }

            const availableStock =
                inventory.totalUnits - inventory.reservedUnits;

            if (availableStock < quantity) {
                throw new Error("Not enough stock available");
            }

            await tx.inventory.update({
                where: { id: inventory.id },
                data: {
                    reservedUnits: {
                        increment: quantity,
                    },
                },
            });

            return tx.reservation.create({
                data: {
                    productId: inventory.productId,
                    warehouseId: inventory.warehouseId,
                    quantity,
                    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
                },
            });
        });

        // invalidate reservations list cache
        try {
            await delCached("reservations:all");
        } catch (e) {
            console.error("Failed to invalidate reservations cache", e);
        }

        return NextResponse.json(reservation);
    } catch (error) {
        if (
            error instanceof Error &&
            error.message === "Not enough stock available"
        ) {
            return NextResponse.json(
                { error: "Not enough stock available" },
                { status: 409 }
            );
        }

        if (
            error instanceof Error &&
            error.message === "Inventory not found"
        ) {
            return NextResponse.json(
                { error: "Inventory not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(
            { error: "Server error" },
            { status: 500 }
        );
    }
}

// invalidate reservations cache when created
// Note: using delCached because response already sent above when successful
// but it's fine to call here after creation inside the try block
