import prisma from "../../../lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { addProductRequestSchema } from "../../../lib/schemas";

function mapInventory(item: {
    id: string;
    productId: string;
    warehouseId: string;
    totalUnits: number;
    reservedUnits: number;
    product: { name: string };
    warehouse: { name: string };
}) {
    return {
        inventoryId: item.id,
        product: item.product.name,
        warehouse: item.warehouse.name,
        availableStock: Math.max(
            0,
            item.totalUnits - item.reservedUnits
        ),
        productId: item.productId,
        warehouseId: item.warehouseId,
    };
}

export async function GET() {
    try {
        const products = await prisma.inventory.findMany({
            include: {
                product: true,
                warehouse: true,
            },
        });

        return NextResponse.json(products.map(mapInventory));
    } catch {
        return NextResponse.json(
            { error: "Something went wrong" },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const parsed = addProductRequestSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.issues.map((issue) => issue.message).join(", ") },
                { status: 400 }
            );
        }

        const { product, warehouseId, availableStock } = parsed.data;
        const totalUnits = availableStock;
        const name = product;

        const inventory = await prisma.$transaction(async (tx) => {
            const productsWithName = await tx.product.findMany({
                where: { name },
            });

            let existingProduct =
                (
                    await Promise.all(
                        productsWithName.map(async (p) => {
                            const inv = await tx.inventory.findUnique({
                                where: {
                                    productId_warehouseId: {
                                        productId: p.id,
                                        warehouseId,
                                    },
                                },
                            });
                            return inv ? p : null;
                        })
                    )
                ).find((p) => p !== null) ?? productsWithName[0] ?? null;

            if (!existingProduct) {
                existingProduct = await tx.product.create({
                    data: { name },
                });
            }

            const existingInventory = await tx.inventory.findUnique({
                where: {
                    productId_warehouseId: {
                        productId: existingProduct.id,
                        warehouseId,
                    },
                },
            });

            if (existingInventory) {
                return tx.inventory.update({
                    where: { id: existingInventory.id },
                    data: {
                        totalUnits: {
                            increment: totalUnits,
                        },
                    },
                    include: {
                        product: true,
                        warehouse: true,
                    },
                });
            }

            return tx.inventory.create({
                data: {
                    productId: existingProduct.id,
                    warehouseId,
                    totalUnits,
                    reservedUnits: 0,
                },
                include: {
                    product: true,
                    warehouse: true,
                },
            });
        });

        return NextResponse.json(mapInventory(inventory), { status: 201 });
    } catch {
        return NextResponse.json(
            { error: "Something went wrong" },
            { status: 500 }
        );
    }
}

export async function DELETE(req: NextRequest) {
    const inventoryId = req.nextUrl.searchParams.get("inventoryId");

    if (!inventoryId) {
        return NextResponse.json(
            { error: "inventoryId is required" },
            { status: 400 }
        );
    }

    try {
        await prisma.$transaction(async (tx) => {
            const inventory = await tx.inventory.findUnique({
                where: { id: inventoryId },
            });

            if (!inventory) {
                throw new Error("NOT_FOUND");
            }

            await tx.reservation.deleteMany({
                where: {
                    productId: inventory.productId,
                    warehouseId: inventory.warehouseId,
                },
            });

            await tx.inventory.delete({
                where: { id: inventoryId },
            });

            const remainingInventory = await tx.inventory.count({
                where: { productId: inventory.productId },
            });

            if (remainingInventory === 0) {
                await tx.reservation.deleteMany({
                    where: { productId: inventory.productId },
                });

                await tx.product.delete({
                    where: { id: inventory.productId },
                });
            }
        });

        return NextResponse.json({ ok: true });
    } catch (error) {
        if (error instanceof Error && error.message === "NOT_FOUND") {
            return NextResponse.json(
                { error: "Product not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(
            { error: "Something went wrong" },
            { status: 500 }
        );
    }
}
