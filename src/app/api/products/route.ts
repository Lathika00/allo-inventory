import prisma from "../../../lib/prisma";
import { NextRequest, NextResponse } from "next/server";

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
        const { product, warehouseId, availableStock } = body;

        if (!product?.trim()) {
            return NextResponse.json(
                { error: "Product name is required" },
                { status: 400 }
            );
        }

        if (!warehouseId) {
            return NextResponse.json(
                { error: "Warehouse is required" },
                { status: 400 }
            );
        }

        const totalUnits = Number(availableStock) || 0;
        const name = product.trim();

        const inventory = await prisma.$transaction(async (tx) => {
            let existingProduct = await tx.product.findFirst({
                where: { name },
            });

            if (!existingProduct) {
                existingProduct = await tx.product.create({
                    data: { name },
                });
            }

            const existingInventory = await tx.inventory.findFirst({
                where: {
                    productId: existingProduct.id,
                    warehouseId,
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
