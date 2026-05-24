import { z } from "zod";

export const reservationRequestSchema = z
    .object({
        inventoryId: z.string().min(1).optional(),
        productId: z.string().min(1).optional(),
        warehouseId: z.string().min(1).optional(),
        quantity: z.preprocess((value) => {
            if (typeof value === "string") return Number(value);
            return value;
        }, z.number().int().min(1, "Quantity must be at least 1")),
    })
    .refine(
        (data) => Boolean(data.inventoryId) || (data.productId && data.warehouseId),
        {
            message: "Either inventoryId or both productId and warehouseId are required",
            path: ["inventoryId"],
        }
    );

export const addProductRequestSchema = z.object({
    product: z.string().trim().min(1, "Product name is required"),
    warehouseId: z.string().min(1, "Warehouse is required"),
    availableStock: z.preprocess((value) => {
        if (typeof value === "string") {
            return value.trim() === "" ? 0 : Number(value);
        }
        return value;
    }, z.number().int().min(0, "Available stock must be 0 or more")),
});

export type ReservationRequest = z.infer<typeof reservationRequestSchema>;
export type AddProductRequest = z.infer<typeof addProductRequestSchema>;
