"use client";
import { useEffect, useState } from "react";

export default function Home() {
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState("");

    async function loadProducts() {
        try {
            const res = await fetch("/api/products");
            const data = await res.json();
            setProducts(data);
        } catch (error) {
            console.log(error);
        } finally {
            setLoading(false);
        }
    }

    async function reserveProduct() {
        setMessage("Reservation API tested successfully ✅");

        setTimeout(() => {
            setMessage("");
        }, 3000);
    }

    useEffect(() => {
        loadProducts();
    }, []);

    return (
        <div
            style={{
                minHeight: "100vh",
                background:
                    "linear-gradient(to bottom right, #0f172a, #111827, #1e293b)",
                color: "white",
                padding: "40px",
                fontFamily: "Arial",
            }}
        >
            <div
                style={{
                    maxWidth: "1200px",
                    margin: "auto",
                }}
            >
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "40px",
                    }}
                >
                    <div>
                        <h1
                            style={{
                                fontSize: "42px",
                                fontWeight: "bold",
                                marginBottom: "10px",
                            }}
                        >
                            Allo Inventory
                        </h1>

                        <p
                            style={{
                                color: "#cbd5e1",
                                fontSize: "18px",
                            }}
                        >
                            Smart Inventory Reservation Platform
                        </p>
                    </div>

                    <div
                        style={{
                            background: "#22c55e",
                            color: "black",
                            padding: "10px 18px",
                            borderRadius: "999px",
                            fontWeight: "bold",
                        }}
                    >
                        Live System
                    </div>
                </div>

                {message && (
                    <div
                        style={{
                            background: "#16a34a",
                            padding: "14px",
                            borderRadius: "10px",
                            marginBottom: "20px",
                            fontWeight: "bold",
                        }}
                    >
                        {message}
                    </div>
                )}

                {loading ? (
                    <div
                        style={{
                            textAlign: "center",
                            marginTop: "100px",
                            fontSize: "22px",
                        }}
                    >
                        Loading inventory...
                    </div>
                ) : (
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))",
                            gap: "24px",
                        }}
                    >
                        {products.map((item, index) => (
                            <div
                                key={index}
                                style={{
                                    background: "rgba(255,255,255,0.08)",
                                    border: "1px solid rgba(255,255,255,0.1)",
                                    borderRadius: "22px",
                                    padding: "28px",
                                    backdropFilter: "blur(10px)",
                                    boxShadow: "0 8px 30px rgba(0,0,0,0.3)",
                                    transition: "0.3s",
                                }}
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        marginBottom: "20px",
                                    }}
                                >
                                    <h2
                                        style={{
                                            fontSize: "28px",
                                            fontWeight: "bold",
                                        }}
                                    >
                                        {item.product}
                                    </h2>

                                    <div
                                        style={{
                                            background:
                                                item.availableStock > 5
                                                    ? "#22c55e"
                                                    : "#ef4444",
                                            color: "white",
                                            padding: "6px 12px",
                                            borderRadius: "999px",
                                            fontSize: "14px",
                                            fontWeight: "bold",
                                        }}
                                    >
                                        {item.availableStock > 5
                                            ? "In Stock"
                                            : "Low Stock"}
                                    </div>
                                </div>

                                <div style={{ marginBottom: "14px" }}>
                                    <p
                                        style={{
                                            color: "#cbd5e1",
                                            marginBottom: "5px",
                                        }}
                                    >
                                        Warehouse
                                    </p>

                                    <h3
                                        style={{
                                            fontSize: "20px",
                                        }}
                                    >
                                        {item.warehouse}
                                    </h3>
                                </div>

                                <div style={{ marginBottom: "25px" }}>
                                    <p
                                        style={{
                                            color: "#cbd5e1",
                                            marginBottom: "5px",
                                        }}
                                    >
                                        Available Units
                                    </p>

                                    <h1
                                        style={{
                                            fontSize: "42px",
                                            fontWeight: "bold",
                                        }}
                                    >
                                        {item.availableStock}
                                    </h1>
                                </div>

                                <button
                                    onClick={async () => {

                                        const response = await fetch(
                                            "/api/reservations",
                                            {
                                                method: "POST",
                                                headers: {
                                                    "Content-Type": "application/json"
                                                },
                                                body: JSON.stringify({

                                                    productId: item.productId,
                                                    warehouseId: item.warehouseId,
                                                    quantity: 1

                                                })
                                            }
                                        )

                                        if (response.ok) {

                                            setMessage(
                                                "Reservation created successfully ✅"
                                            )

                                            loadProducts()

                                        }

                                    }}
                                >
                                    Reserve Product
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}


