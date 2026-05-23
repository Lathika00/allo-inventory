import { PrismaClient } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {

    try {

        const body = await req.json();

        const {
            productId,
            warehouseId,
            quantity,
        } = body;

        const result = await prisma.$transaction(
            async (tx) => {

                const inventory =
                    await tx.inventory.findFirst({
                        where: {
                            productId,
                            warehouseId,
                        },
                    });

                if (!inventory) {
                    throw new Error("Inventory not found");
                }

                const availableStock =
                    inventory.totalUnits -
                    inventory.reservedUnits;

                if (availableStock < quantity) {

                    return NextResponse.json(
                        {
                            error:
                                "Not enough stock available",
                        },
                        {
                            status: 409,
                        }
                    );
                }

                await tx.inventory.update({
                    where: {
                        id: inventory.id,
                    },
                    data: {
                        reservedUnits: {
                            increment: quantity,
                        },
                    },
                });

                const reservation =
                    await tx.reservation.create({
                        data: {
                            productId,
                            warehouseId,
                            quantity,
                            expiresAt: new Date(
                                Date.now() + 10 * 60 * 1000
                            ),
                        },
                    });

                return NextResponse.json(
                    reservation
                );
            }
        );

        return result;

    } catch (error) {

        return NextResponse.json(
            {
                error: "Server error",
            },
            {
                status: 500,
            }
        );
    }
}