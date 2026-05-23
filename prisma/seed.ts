import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {

    const laptop = await prisma.product.create({
        data: {
            name: "Laptop",
        },
    });

    const phone = await prisma.product.create({
        data: {
            name: "Phone",
        },
    });

    const chennai = await prisma.warehouse.create({
        data: {
            name: "Chennai Warehouse",
            location: "Chennai",
        },
    });

    const bangalore = await prisma.warehouse.create({
        data: {
            name: "Bangalore Warehouse",
            location: "Bangalore",
        },
    });

    await prisma.inventory.createMany({
        data: [
            {
                productId: laptop.id,
                warehouseId: chennai.id,
                totalUnits: 10,
                reservedUnits: 0,
            },
            {
                productId: phone.id,
                warehouseId: bangalore.id,
                totalUnits: 15,
                reservedUnits: 0,
            },
        ],
    });

    console.log("Seed complete");
}

main()
    .catch((e) => {
        console.error(e);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });