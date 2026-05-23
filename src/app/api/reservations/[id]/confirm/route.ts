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
                where: {
                    id: id,
                },
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

        if (new Date() > reservation.expiresAt) {
            return NextResponse.json(
                { error: "Reservation expired" },
                { status: 410 }
            );
        }

        const updated =
            await prisma.reservation.update({
                where: {
                    id: id,
                },
                data: {
                    status: "confirmed",
                },
            });

        return NextResponse.json(updated);

    } catch (error) {

        console.log(error);

        return NextResponse.json(
            { error: "Server error" },
            { status: 500 }
        );
    }
}