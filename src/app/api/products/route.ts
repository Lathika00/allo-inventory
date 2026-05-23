import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function GET() {
    try {

        const products = await prisma.inventory.findMany({
            include: {
                product: true,
                warehouse: true,
            },
        });

        const data = products.map((item) => ({
            product: item.product.name,
            warehouse: item.warehouse.name,
            availableStock:
                item.totalUnits - item.reservedUnits,

            productId: item.productId,
            warehouseId: item.warehouseId
        }));

        return NextResponse.json(data);

    } catch {
        return NextResponse.json(
            { error: "Something went wrong" },
            { status: 500 }
        );
    }
}