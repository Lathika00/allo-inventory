import prisma from "../../../../lib/prisma";
import { NextResponse } from "next/server";
import { getCached, setCached } from "../../../../lib/upstash";

const RESERVATION_TTL_MS = 10 * 60 * 1000;
const CACHE_KEY = "reservations:all";
const CACHE_TTL_SECONDS = 10 * 60; // 10 minutes

export async function GET() {
    try {
        const cached = await getCached(CACHE_KEY);
        if (cached) {
            try {
                const parsed = JSON.parse(cached as string);
                return NextResponse.json(parsed);
            } catch (err) {
                // fallthrough to re-fetch if cache corrupted
                console.error("Failed to parse reservations cache", err);
            }
        }

        const reservations = await prisma.reservation.findMany({
            include: {
                product: true,
                warehouse: true,
            },
            orderBy: { expiresAt: "desc" },
        });

        const data = reservations.map((r) => ({
            id: r.id,
            productId: r.productId,
            warehouseId: r.warehouseId,
            product: r.product.name,
            warehouse: r.warehouse.name,
            quantity: r.quantity,
            status: r.status,
            expiresAt: r.expiresAt.toISOString(),
            reservedAt: new Date(
                r.expiresAt.getTime() - RESERVATION_TTL_MS
            ).toISOString(),
        }));

        // cache the result for 10 minutes
        await setCached(CACHE_KEY, data, CACHE_TTL_SECONDS);

        return NextResponse.json(data);
    } catch (err) {
        console.error("Error in reservations/all GET:", err);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
