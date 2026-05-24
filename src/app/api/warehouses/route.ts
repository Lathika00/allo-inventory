import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function GET() {
    const warehouses = await prisma.warehouse.findMany();

    return NextResponse.json(warehouses);
}