"use client";

import { useEffect, useState, useRef } from "react";
import { addProductRequestSchema, reservationRequestSchema } from "../lib/schemas";

// ─── Types ────────────────────────────────────────────────────────────────────
type Product = {
    inventoryId: string;
    productId: string;
    product: string;
    warehouse: string;
    warehouseId: string;
    availableStock: number;
};

type Warehouse = {
    id: string;
    name: string;
    location: string;
};

type Reservation = {
    id: string;
    productId: string;
    product: string;
    warehouse: string;
    quantity: number;
    reservedAt: string;
    status: "confirmed" | "pending" | "released";
    expiresAt?: string;
};

type Toast = { message: string; visible: boolean; type: "success" | "error" };

type SortKey = "product" | "warehouse" | "availableStock" | "";
type SortDir = "asc" | "desc";
type FilterWarehouse = string;
type FilterStatus = "All" | "In stock" | "Low stock" | "Out of stock";

// ─── Demo Data ────────────────────────────────────────────────────────────────
const DEMO_PRODUCTS: Product[] = [
    { inventoryId: "1", productId: "1", product: "Wireless Headphones Pro", warehouse: "Warehouse A", warehouseId: "1", availableStock: 42 },
    { inventoryId: "2", productId: "2", product: "USB-C Hub 7-in-1", warehouse: "Warehouse B", warehouseId: "2", availableStock: 5 },
    { inventoryId: "3", productId: "3", product: "Mechanical Keyboard TKL", warehouse: "Warehouse A", warehouseId: "1", availableStock: 0 },
    { inventoryId: "4", productId: "4", product: '27" IPS Monitor', warehouse: "Warehouse B", warehouseId: "2", availableStock: 18 },
    { inventoryId: "5", productId: "5", product: "Ergonomic Mouse X3", warehouse: "Warehouse A", warehouseId: "1", availableStock: 3 },
    { inventoryId: "6", productId: "6", product: "Laptop Stand Aluminium", warehouse: "Warehouse B", warehouseId: "2", availableStock: 61 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getStockStatus(stock: number): { label: FilterStatus; color: string; bg: string } {
    if (stock === 0) return { label: "Out of stock", color: "#DC2626", bg: "#FEF2F2" };
    if (stock <= 5) return { label: "Low stock", color: "#A16207", bg: "#FEF9C3" };
    return { label: "In stock", color: "#15803D", bg: "#F0FDF4" };
}
function getBarColor(stock: number) {
    if (stock === 0) return "#DC2626";
    if (stock <= 5) return "#EAB308";
    return "#22C55E";
}
function fmtDate(iso: string | undefined) {
    if (!iso) return "—";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function timeLeft(iso: string | undefined) {
    if (!iso) return "—";
    const then = new Date(iso).getTime();
    const now = Date.now();
    const diff = then - now;
    if (diff <= 0) return "Expired";
    const secs = Math.floor(diff / 1000);
    const mins = Math.floor(secs / 60);
    const remSecs = secs % 60;
    if (mins >= 60) {
        const hrs = Math.floor(mins / 60);
        const remM = mins % 60;
        return `${hrs}h ${remM}m`;
    }
    if (mins > 0) return `${mins}m ${remSecs}s`;
    return `${remSecs}s`;
}

const PRODUCT_ICON_RULES: { keywords: string[]; icon: string; bg: string }[] = [
    { keywords: ["laptop", "macbook", "notebook", "computer"], icon: "💻", bg: "#EFF6FF" },
    { keywords: ["phone", "iphone", "mobile", "smartphone"], icon: "📱", bg: "#F0FDF4" },
    { keywords: ["headphone", "earbud", "airpod", "audio", "speaker", "bluetooth"], icon: "🎧", bg: "#F5F3FF" },
    { keywords: ["keyboard", "keycap", "mechanical"], icon: "⌨️", bg: "#FFF7ED" },
    { keywords: ["mouse", "trackpad"], icon: "🖱️", bg: "#F0FDFA" },
    { keywords: ["monitor", "display", "screen", "ips"], icon: "🖥️", bg: "#EEF2FF" },
    { keywords: ["hub", "adapter", "usb", "cable", "charger"], icon: "🔌", bg: "#FEF9C3" },
    { keywords: ["stand", "mount", "desk"], icon: "🛠️", bg: "#F5F4F0" },
    { keywords: ["camera", "webcam"], icon: "📷", bg: "#FCE7F3" },
    { keywords: ["tablet", "ipad"], icon: "📲", bg: "#ECFEFF" },
    { keywords: ["watch", "wearable"], icon: "⌚", bg: "#FDF4FF" },
];

function getProductIconMeta(name: string) {
    const normalized = name.toLowerCase();
    const match = PRODUCT_ICON_RULES.find((rule) =>
        rule.keywords.some((keyword) => normalized.includes(keyword))
    );
    return match ?? { icon: "📦", bg: "#F5F4F0" };
}

function ProductIcon({ name, size = 36 }: { name: string; size?: number }) {
    const { icon, bg } = getProductIconMeta(name);
    return (
        <span
            aria-hidden
            style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: size,
                height: size,
                borderRadius: "10px",
                background: bg,
                fontSize: Math.round(size * 0.52),
                lineHeight: 1,
                flexShrink: 0,
                border: "1px solid rgba(0,0,0,0.04)",
            }}
        >
            {icon}
        </span>
    );
}

function ProductNameCell({ name, sublabel }: { name: string; sublabel?: string }) {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
            <ProductIcon name={name} />
            <div style={{ minWidth: 0 }}>
                <div
                    style={{
                        fontSize: "14px",
                        fontWeight: 600,
                        color: "#1A1916",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                    }}
                >
                    {name}
                </div>
                {sublabel ? (
                    <div style={{ fontSize: "12px", color: "#8A8880", marginTop: "1px" }}>{sublabel}</div>
                ) : null}
            </div>
        </div>
    );
}

// ─── Shared Styles ────────────────────────────────────────────────────────────
const S = {
    card: { background: "#fff", border: "1px solid #E8E6E0", borderRadius: "12px" } as React.CSSProperties,
    label: { fontSize: "11.5px", fontWeight: 600, color: "#8A8880", textTransform: "uppercase" as const, letterSpacing: "0.5px" },
    input: {
        width: "100%", padding: "9px 12px", border: "1px solid #E8E6E0",
        borderRadius: "8px", fontSize: "14px", fontFamily: "inherit",
        background: "#fff", color: "#1A1916", outline: "none",
    } as React.CSSProperties,
    primaryBtn: {
        background: "#1A1916", color: "#fff", border: "none",
        padding: "10px 18px", borderRadius: "8px", fontSize: "13.5px",
        fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
        display: "flex", alignItems: "center", gap: "8px",
    } as React.CSSProperties,
    secondaryBtn: {
        background: "#fff", color: "#1A1916", border: "1px solid #E8E6E0",
        padding: "9px 16px", borderRadius: "8px", fontSize: "13.5px",
        fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
    } as React.CSSProperties,
};

// ─── Dropdown Component ───────────────────────────────────────────────────────
function Dropdown<T extends string>({
    label, options, value, onChange,
}: { label: string; options: T[]; value: T; onChange: (v: T) => void }) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        function handle(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
        document.addEventListener("mousedown", handle);
        return () => document.removeEventListener("mousedown", handle);
    }, []);
    return (
        <div ref={ref} style={{ position: "relative" }}>
            <button
                onClick={() => setOpen(!open)}
                style={{ ...S.secondaryBtn, display: "flex", alignItems: "center", gap: "8px", whiteSpace: "nowrap" }}
            >
                {label}: <strong style={{ color: "#1D4ED8" }}>{value}</strong>
                <span style={{ fontSize: "10px", color: "#8A8880" }}>{open ? "▲" : "▼"}</span>
            </button>
            {open && (
                <div style={{
                    position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 100,
                    background: "#fff", border: "1px solid #E8E6E0", borderRadius: "10px",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.08)", minWidth: "160px", overflow: "hidden",
                }}>
                    {options.map((opt) => (
                        <div
                            key={opt}
                            onClick={() => { onChange(opt); setOpen(false); }}
                            style={{
                                padding: "10px 14px", fontSize: "13.5px", cursor: "pointer",
                                background: value === opt ? "#F5F4F0" : "#fff",
                                fontWeight: value === opt ? 600 : 400,
                                color: value === opt ? "#1A1916" : "#475569",
                            }}
                        >
                            {opt}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Modal Component ──────────────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
    return (
        <div style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 500,
        }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div style={{ ...S.card, width: "480px", padding: "28px", borderRadius: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "22px" }}>
                    <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#1A1916" }}>{title}</h2>
                    <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#8A8880", lineHeight: 1 }}>✕</button>
                </div>
                {children}
            </div>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Home() {
    const [products, setProducts] = useState<Product[]>([]);
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("Inventory");
    const [quantities, setQuantities] = useState<{ [key: string]: number }>({});
    const [toast, setToast] = useState<Toast>({ message: "", visible: false, type: "success" });

    // Filter & Sort
    const [filterWarehouse, setFilterWarehouse] = useState("All");
    const [filterStatus, setFilterStatus] = useState<FilterStatus>("All");
    const [sortKey, setSortKey] = useState<SortKey>("");
    const [sortDir, setSortDir] = useState<SortDir>("asc");

    // Modals
    const [showAddProduct, setShowAddProduct] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [editProduct, setEditProduct] = useState<Product | null>(null);

    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [warehousesLoading, setWarehousesLoading] = useState(true);
    const [mounted, setMounted] = useState(false);

    // Add Product Form
    const [newProduct, setNewProduct] = useState({ product: "", warehouse: "", warehouseId: "", availableStock: "" });

    // Settings Form
    const [settings, setSettings] = useState({ adminName: "Admin", role: "Warehouse Mgr", initials: "AO" });
    const [settingsDraft, setSettingsDraft] = useState({ adminName: "Admin", role: "Warehouse Mgr", initials: "AO" });

    // ── Load ────────────────────────────────────────────────────────────────
    async function loadProducts() {
        try {
            const res = await fetch("/api/products");
            const data = await res.json();
            setProducts(data);
        } catch {
            setProducts(DEMO_PRODUCTS);
        } finally {
            setLoading(false);
        }
    }



    function defaultNewProductForm(preferredWarehouseId?: string) {
        const preferred =
            warehouses.find((w) => w.id === preferredWarehouseId) ??
            warehouses.find((w) => w.id === newProduct.warehouseId) ??
            warehouses[0];

        return {
            product: "",
            warehouse: preferred?.name ?? "",
            warehouseId: preferred?.id ?? "",
            availableStock: "",
        };
    }

    function openAddProductModal() {
        if (warehousesLoading) {
            showToast("Loading warehouses…", "error");
            return;
        }
        if (warehouses.length === 0) {
            showToast("No warehouses available. Check your connection and refresh.", "error");
            return;
        }
        setNewProduct(defaultNewProductForm());
        setShowAddProduct(true);
    }

    async function loadWarehouses() {
        setWarehousesLoading(true);
        try {
            const res = await fetch("/api/warehouses");
            if (!res.ok) throw new Error("Failed to load warehouses");
            const data = await res.json();
            if (!Array.isArray(data)) throw new Error("Invalid warehouse data");

            setWarehouses(data);
            if (data.length > 0) {
                setNewProduct((prev) => ({
                    ...prev,
                    warehouseId: prev.warehouseId || data[0].id,
                    warehouse: prev.warehouse || data[0].name,
                }));
            }
        } catch {
            setWarehouses([]);
        } finally {
            setWarehousesLoading(false);
        }
    }

    async function expireReservations() {
        try {
            await fetch("/api/cron");
        } catch {
            // non-blocking cleanup
        }
    }

    async function loadReservations() {
        try {
            await expireReservations();

            const response = await fetch("/api/reservations/all");
            const data = await response.json();

            if (!Array.isArray(data)) {
                setReservations([]);
                return;
            }

            setReservations(data);
        } catch (error) {
            console.log(error);
        }
    }

    // ── Toast 
    // 
    useEffect(() => {
        setMounted(true);
        loadProducts();
        loadWarehouses();
        loadReservations();
    }, []);

    const addProductDisabled =
        mounted && (warehousesLoading || warehouses.length === 0);

    function showToast(message: string, type: "success" | "error" = "success") {
        setToast({ message, visible: true, type });
        setTimeout(() => setToast((t) => ({ ...t, visible: false })), 3000);
    }

    // ── Reserve ─────────────────────────────────────────────────────────────
    async function handleReserve(item: Product) {

        const qty =
            quantities[item.inventoryId] || 1;

        const validation = reservationRequestSchema.safeParse({
            inventoryId: item.inventoryId,
            quantity: qty,
        });

        if (!validation.success) {
            showToast(validation.error.issues[0]?.message || "Invalid reservation", "error");
            return;
        }

        try {

            const response =
                await fetch(
                    "/api/reservations",
                    {

                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify(validation.data)

                    }
                );


            if (response.ok) {
                showToast(
                    `Reserved ${qty} unit${qty > 1 ? "s" : ""} of ${item.product}`
                );
                await loadProducts();
                await loadReservations();
                setActiveTab("Reservations");
                return;
            }

            const error = await response.json();
            if (response.status === 409) {
                showToast(error.error || "Not enough stock available", "error");
                return;
            }
            showToast(error.error || "Reservation failed", "error");
        } catch {
            showToast("Reservation failed", "error");
        }
    }

    async function handleConfirmReservation(id: string) {
        try {
            const res = await fetch(`/api/reservations/${id}/confirm`, { method: "POST" });
            if (res.ok) {
                showToast("Purchase confirmed");
                await loadProducts();
                await loadReservations();
                return;
            }
            const error = await res.json();
            if (res.status === 410) {
                showToast(error.error || "Reservation expired", "error");
            } else {
                showToast(error.error || "Could not confirm", "error");
            }
            await loadProducts();
            await loadReservations();
        } catch {
            showToast("Could not confirm reservation", "error");
        }
    }

    async function handleReleaseReservation(id: string) {
        try {
            const res = await fetch(`/api/reservations/${id}/release`, { method: "POST" });
            if (res.ok) {
                showToast("Reservation released");
                await loadProducts();
                await loadReservations();
                return;
            }
            const error = await res.json();
            showToast(error.error || "Could not release", "error");
        } catch {
            showToast("Could not release reservation", "error");
        }
    }

    // ── Add Product ─────────────────────────────────────────────────────────
    async function handleAddProduct() {
        const validation = addProductRequestSchema.safeParse({
            product: newProduct.product,
            warehouseId: newProduct.warehouseId,
            availableStock: newProduct.availableStock,
        });

        if (!validation.success) {
            showToast(validation.error.issues[0]?.message || "Invalid product data", "error");
            return;
        }

        try {
            const res = await fetch("/api/products", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(validation.data),
            });

            if (!res.ok) {
                const err = await res.json();
                showToast(err.error || "Failed to add product", "error");
                return;
            }

            const added = await res.json();
            await loadProducts();

            setNewProduct(defaultNewProductForm(newProduct.warehouseId));
            setShowAddProduct(false);
            showToast(`${added.product} added to inventory`);
        } catch {
            showToast("Failed to add product", "error");
        }
    }

    // ── Edit Product ────────────────────────────────────────────────────────
    function handleEditSave() {
        if (!editProduct) return;
        setProducts((prev) => prev.map((p) => p.inventoryId === editProduct.inventoryId ? editProduct : p));
        setEditProduct(null);
        showToast("Product updated");
    }

    // ── Delete Product ──────────────────────────────────────────────────────
    async function handleDelete(inventoryId: string) {
        if (!confirm("Remove this product from inventory?")) return;

        try {
            const res = await fetch(
                `/api/products?inventoryId=${encodeURIComponent(inventoryId)}`,
                { method: "DELETE" }
            );

            if (!res.ok) {
                const err = await res.json();
                showToast(err.error || "Failed to delete product", "error");
                return;
            }

            await loadProducts();
            showToast("Product removed");
        } catch {
            showToast("Failed to delete product", "error");
        }
    }

    async function handleClearReservations() {
        if (!confirm("Release all pending reservations and return stock?")) return;
        try {
            const res = await fetch("/api/reservations/clear", { method: "POST" });
            if (!res.ok) {
                showToast("Failed to clear reservations", "error");
                return;
            }
            await loadProducts();
            await loadReservations();
            showToast("Pending reservations cleared");
        } catch {
            showToast("Failed to clear reservations", "error");
        }
    }

    // ── Sort Toggle ─────────────────────────────────────────────────────────
    function handleSort(key: SortKey) {
        if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        else { setSortKey(key); setSortDir("asc"); }
    }

    // ── Derived Data ────────────────────────────────────────────────────────
    const filtered = products
        .filter((p) => p.product.toLowerCase().includes(search.toLowerCase()))
        .filter((p) => filterWarehouse === "All" || p.warehouse === filterWarehouse)
        .filter((p) => filterStatus === "All" || getStockStatus(p.availableStock).label === filterStatus)
        .sort((a, b) => {
            if (!sortKey) return 0;
            const av = a[sortKey]; const bv = b[sortKey];
            if (typeof av === "number" && typeof bv === "number") return sortDir === "asc" ? av - bv : bv - av;
            return sortDir === "asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
        });

    const totalStock = products.reduce((s, p) => s + p.availableStock, 0);
    const maxStock = Math.max(...products.map((p) => p.availableStock), 1);
    const lowStockCount = products.filter((p) => p.availableStock > 0 && p.availableStock <= 5).length;
    const outCount = products.filter((p) => p.availableStock === 0).length;
    const pendingRes = reservations.filter((r) => r.status === "pending").length;
    const warehouseFilterOptions: FilterWarehouse[] = [
        "All",
        ...(warehouses.length > 0
            ? warehouses.map((w) => w.name)
            : [...new Set(products.map((p) => p.warehouse))]),
    ];

    // ── Sorting indicator ────────────────────────────────────────────────────
    function sortIndicator(key: SortKey) {
        if (sortKey !== key) return <span style={{ color: "#CBD5E1", marginLeft: 4 }}>⇅</span>;
        return <span style={{ color: "#1D4ED8", marginLeft: 4 }}>{sortDir === "asc" ? "↑" : "↓"}</span>;
    }

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <div style={{ display: "flex", minHeight: "100vh", background: "#F5F4F0", fontFamily: "'DM Sans', Arial, sans-serif" }}>

            {/* ── SIDEBAR ── */}
            <aside style={{
                width: "220px", flexShrink: 0, background: "#fff",
                borderRight: "1px solid #E8E6E0", padding: "28px 20px",
                display: "flex", flexDirection: "column", gap: "4px",
            }}>
                <div style={{ fontFamily: "Syne, sans-serif", fontSize: "20px", fontWeight: 800, letterSpacing: "-0.5px", color: "#1A1916", paddingBottom: "24px", borderBottom: "1px solid #E8E6E0", marginBottom: "8px" }}>
                    Allo<span style={{ color: "#1D4ED8" }}>.</span>
                </div>
                {[
                    { label: "Dashboard", icon: "📊" },
                    { label: "Inventory", icon: "📦" },
                    { label: "Reservations", icon: "📅" },
                    { label: "Reports", icon: "📈" },
                    { label: "Settings", icon: "⚙️" },
                ].map(({ label, icon }) => (
                    <button key={label} onClick={() => { setActiveTab(label); if (label === "Settings") setSettingsDraft({ ...settings }); }}
                        style={{
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            padding: "10px 12px", borderRadius: "8px", border: "none",
                            cursor: "pointer", fontSize: "13.5px", fontWeight: 500,
                            fontFamily: "inherit", textAlign: "left",
                            background: activeTab === label ? "#1A1916" : "transparent",
                            color: activeTab === label ? "#fff" : "#8A8880",
                            transition: "all 0.15s",
                        }}>
                        <span style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <span style={{ fontSize: "15px" }}>{icon}</span>{label}
                        </span>
                        {label === "Reservations" && pendingRes > 0 && (
                            <span style={{ background: "#1D4ED8", color: "#fff", fontSize: "10px", fontWeight: 700, padding: "1px 6px", borderRadius: "10px" }}>
                                {pendingRes}
                            </span>
                        )}
                    </button>
                ))}
                <div style={{ marginTop: "auto", paddingTop: "16px", borderTop: "1px solid #E8E6E0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#BFDBFE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 600, color: "#1D4ED8" }}>
                            {settings.initials}
                        </div>
                        <div>
                            <div style={{ fontSize: "13px", fontWeight: 600, color: "#1A1916" }}>{settings.adminName}</div>
                            <div style={{ fontSize: "11px", color: "#8A8880" }}>{settings.role}</div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* ── MAIN ── */}
            <main style={{ flex: 1, padding: "36px 40px", overflowX: "auto", minWidth: 0 }}>

                {/* ── DASHBOARD ── */}
                {activeTab === "Dashboard" && (
                    <div>
                        <div style={{ marginBottom: "32px" }}>
                            <h1 style={{ fontFamily: "Syne, sans-serif", fontSize: "26px", fontWeight: 800, letterSpacing: "-0.5px", color: "#1A1916" }}>Dashboard</h1>
                            <p style={{ fontSize: "13px", color: "#8A8880", marginTop: "4px" }}>Overview of your inventory health</p>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "14px", marginBottom: "32px" }}>
                            {[
                                { value: products.length, label: "Total Products", color: "#1D4ED8", bg: "#EFF6FF" },
                                { value: totalStock.toLocaleString(), label: "Units Available", color: "#15803D", bg: "#F0FDF4" },
                                { value: lowStockCount, label: "Low Stock Items", color: "#A16207", bg: "#FEF9C3" },
                                { value: outCount, label: "Out of Stock", color: "#DC2626", bg: "#FEF2F2" },
                            ].map(({ value, label, color, bg }, i) => (
                                <div key={i} style={{ ...S.card, padding: "20px 22px" }}>
                                    <div style={{ fontSize: "28px", fontWeight: 800, color, letterSpacing: "-1px" }}>{loading ? "—" : value}</div>
                                    <div style={{ fontSize: "12px", color: "#8A8880", marginTop: "4px", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 500 }}>{label}</div>
                                    <div style={{ marginTop: "10px", display: "inline-block", background: bg, color, fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "20px" }}>
                                        {i === 0 ? "2 warehouses" : i === 1 ? "across all SKUs" : i === 2 ? "needs attention" : "restock needed"}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div style={{ ...S.card, padding: "24px", marginBottom: "24px" }}>
                            <div style={{ ...S.label, marginBottom: "16px" }}>Stock by product</div>
                            {loading ? <div style={{ color: "#8A8880" }}>Loading…</div> : products.map((p) => {
                                const pct = Math.round((p.availableStock / maxStock) * 100);
                                return (
                                    <div key={p.inventoryId} style={{ marginBottom: "12px" }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px", marginBottom: "4px", gap: "8px" }}>
                                            <span style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 500, color: "#1A1916", minWidth: 0 }}>
                                                <ProductIcon name={p.product} size={28} />
                                                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.product}</span>
                                            </span>
                                            <span style={{ color: "#8A8880", flexShrink: 0 }}>{p.availableStock} units</span>
                                        </div>
                                        <div style={{ height: "6px", background: "#F5F4F0", borderRadius: "10px", overflow: "hidden" }}>
                                            <div style={{ width: `${pct}%`, height: "100%", background: getBarColor(p.availableStock), borderRadius: "10px", transition: "width 0.4s" }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                            <div style={{ ...S.card, padding: "20px" }}>
                                <div style={{ ...S.label, marginBottom: "12px" }}>Warehouse breakdown</div>
                                {warehouseFilterOptions.filter((wh) => wh !== "All").map((wh) => {
                                    const whProducts = products.filter((p) => p.warehouse === wh);
                                    const whStock = whProducts.reduce((s, p) => s + p.availableStock, 0);
                                    return (
                                        <div key={wh} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #F5F4F0", fontSize: "13.5px" }}>
                                            <span style={{ fontWeight: 500, color: "#1A1916" }}>🏭 {wh}</span>
                                            <span style={{ color: "#1D4ED8", fontWeight: 600 }}>{whProducts.length} SKUs · {whStock} units</span>
                                        </div>
                                    );
                                })}
                            </div>
                            <div style={{ ...S.card, padding: "20px" }}>
                                <div style={{ ...S.label, marginBottom: "12px" }}>Recent reservations</div>
                                {reservations.length === 0
                                    ? <div style={{ fontSize: "13px", color: "#8A8880" }}>No reservations yet.</div>
                                    : reservations.slice(0, 4).map((r) => (
                                        <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #F5F4F0", fontSize: "12.5px", gap: "8px" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                                                <ProductIcon name={r.product} size={28} />
                                                <div style={{ minWidth: 0 }}>
                                                    <div style={{ fontWeight: 500, color: "#1A1916", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.product}</div>
                                                    <div style={{ color: "#8A8880" }}>{r.quantity} unit{r.quantity > 1 ? "s" : ""}</div>
                                                    <div style={{ color: "#8A8880", fontSize: "12px", marginTop: "4px" }}>Expires in {timeLeft(r.expiresAt)}</div>
                                                </div>
                                            </div>
                                            <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "20px", alignSelf: "center", background: r.status === "confirmed" ? "#F0FDF4" : r.status === "pending" ? "#FEF9C3" : "#FEF2F2", color: r.status === "confirmed" ? "#15803D" : r.status === "pending" ? "#A16207" : "#DC2626" }}>
                                                {r.status}
                                            </span>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── INVENTORY ── */}
                {activeTab === "Inventory" && (
                    <div>
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "32px" }}>
                            <div>
                                <h1 style={{ fontFamily: "Syne, sans-serif", fontSize: "26px", fontWeight: 800, letterSpacing: "-0.5px", color: "#1A1916" }}>Inventory</h1>
                                <p style={{ fontSize: "13px", color: "#8A8880", marginTop: "4px" }}>Manage and reserve stock across warehouses</p>
                            </div>
                            <button
                                style={{
                                    ...S.primaryBtn,
                                    opacity: addProductDisabled ? 0.6 : 1,
                                    cursor: addProductDisabled ? "not-allowed" : "pointer",
                                }}
                                disabled={addProductDisabled}
                                onClick={openAddProductModal}
                            >
                                ＋ Add product
                            </button>
                        </div>

                        {/* KPIs */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "14px", marginBottom: "28px" }}>
                            {[
                                { value: products.length, label: "Products", delta: `${products.length} total SKUs`, up: true },
                                { value: totalStock.toLocaleString(), label: "Units available", delta: `${outCount} out of stock`, up: outCount === 0 },
                                { value: warehouses.length || warehouseFilterOptions.length - 1, label: "Warehouses", delta: "All operational", up: true },
                            ].map(({ value, label, delta, up }, i) => (
                                <div key={i} style={{ ...S.card, padding: "20px 22px" }}>
                                    <div style={{ fontSize: "28px", fontWeight: 800, letterSpacing: "-1px", color: "#1A1916" }}>{loading ? "—" : value}</div>
                                    <div style={{ fontSize: "12px", color: "#8A8880", marginTop: "4px", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 500 }}>{label}</div>
                                    <span style={{ display: "inline-block", marginTop: "8px", fontSize: "12px", fontWeight: 600, padding: "3px 8px", borderRadius: "20px", background: up ? "#F0FDF4" : "#FEF9C3", color: up ? "#15803D" : "#A16207" }}>
                                        {up ? "✓ " : "⚠ "}{delta}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Toolbar */}
                        <div style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
                            <div style={{ flex: 1, minWidth: "200px", position: "relative" }}>
                                <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#8A8880", pointerEvents: "none" }}>🔍</span>
                                <input
                                    type="text" placeholder="Search products…" value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    style={{ ...S.input, paddingLeft: "36px" }}
                                />
                            </div>
                            <Dropdown label="Warehouse" options={warehouseFilterOptions} value={filterWarehouse} onChange={setFilterWarehouse} />
                            <Dropdown label="Status" options={["All", "In stock", "Low stock", "Out of stock"] as FilterStatus[]} value={filterStatus} onChange={setFilterStatus} />
                        </div>

                        {/* Table */}
                        <div style={{ ...S.card, overflow: "hidden" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 1fr 1fr 160px", padding: "12px 20px", background: "#F5F4F0", borderBottom: "1px solid #E8E6E0" }}>
                                {(["product", "warehouse", "availableStock"] as SortKey[]).map((key, i) => (
                                    <span key={key} onClick={() => handleSort(key)} style={{ ...S.label, cursor: "pointer", userSelect: "none" }}>
                                        {["Product", "Warehouse", "Stock"][i]}{sortIndicator(key)}
                                    </span>
                                ))}
                                <span style={S.label}>Status</span>
                                <span style={S.label}>Reserve</span>
                            </div>

                            {loading ? (
                                <div style={{ padding: "40px", textAlign: "center", color: "#8A8880" }}>Loading inventory…</div>
                            ) : filtered.length === 0 ? (
                                <div style={{ padding: "40px", textAlign: "center", color: "#8A8880" }}>No products match your filters.</div>
                            ) : filtered.map((item, index) => {
                                const status = getStockStatus(item.availableStock);
                                const barPct = Math.round((item.availableStock / maxStock) * 100);
                                const qty = quantities[item.inventoryId] || 1;
                                return (
                                    <div key={item.inventoryId} style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 1fr 1fr 160px", padding: "14px 20px", borderBottom: index < filtered.length - 1 ? "1px solid #E8E6E0" : "none", alignItems: "center" }}>
                                        <ProductNameCell
                                            name={item.product}
                                            sublabel={`#PRD-${String(item.productId).slice(-4).toUpperCase()}`}
                                        />
                                        <div>
                                            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#F1EFE8", color: "#5F5E5A", fontSize: "12px", fontWeight: 500, padding: "4px 10px", borderRadius: "6px" }}>
                                                🏭 {item.warehouse}
                                            </span>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: "14px", fontWeight: 600, color: item.availableStock === 0 ? "#DC2626" : item.availableStock <= 5 ? "#A16207" : "#1A1916" }}>{item.availableStock}</div>
                                            <div style={{ width: "60px", height: "5px", background: "#F5F4F0", borderRadius: "10px", marginTop: "4px", overflow: "hidden" }}>
                                                <div style={{ width: `${barPct}%`, height: "100%", background: getBarColor(item.availableStock), borderRadius: "10px" }} />
                                            </div>
                                        </div>
                                        <div>
                                            <span style={{ fontSize: "11px", fontWeight: 600, padding: "3px 9px", borderRadius: "20px", display: "inline-block", background: status.bg, color: status.color }}>
                                                {status.label}
                                            </span>
                                        </div>
                                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                            <select
                                                value={qty} disabled={item.availableStock === 0}
                                                onChange={(e) => setQuantities({ ...quantities, [item.inventoryId]: Number(e.target.value) })}
                                                style={{ padding: "6px 8px", border: "1px solid #E8E6E0", borderRadius: "6px", fontSize: "13px", background: "#fff", color: "#1A1916", cursor: "pointer", fontFamily: "inherit", width: "52px" }}
                                            >
                                                {Array.from({ length: Math.max(0, Math.min(item.availableStock, 10)) }, (_, i) => i + 1).map((n) => (
                                                    <option key={n} value={n}>{n}</option>
                                                ))}
                                            </select>
                                            <button
                                                disabled={item.availableStock === 0}
                                                onClick={() => handleReserve(item)}
                                                style={{ padding: "7px 10px", border: "none", borderRadius: "7px", fontSize: "12px", fontWeight: 600, cursor: item.availableStock === 0 ? "not-allowed" : "pointer", fontFamily: "inherit", background: item.availableStock === 0 ? "#F1EFE8" : "#1D4ED8", color: item.availableStock === 0 ? "#8A8880" : "#fff" }}
                                            >
                                                Reserve
                                            </button>
                                            <button
                                                onClick={() => setEditProduct({ ...item })}
                                                style={{ padding: "7px 8px", border: "1px solid #E8E6E0", borderRadius: "7px", fontSize: "12px", background: "#fff", cursor: "pointer", fontFamily: "inherit", color: "#8A8880" }}
                                                title="Edit"
                                            >✏️</button>
                                            <button
                                                onClick={() => handleDelete(item.inventoryId)}
                                                style={{ padding: "7px 8px", border: "1px solid #FEE2E2", borderRadius: "7px", fontSize: "12px", background: "#FEF2F2", cursor: "pointer", fontFamily: "inherit", color: "#DC2626" }}
                                                title="Delete"
                                            >🗑</button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        {filtered.length > 0 && (
                            <div style={{ fontSize: "12px", color: "#8A8880", marginTop: "10px", textAlign: "right" }}>
                                Showing {filtered.length} of {products.length} products
                            </div>
                        )}
                    </div>
                )}

                {/* ── RESERVATIONS ── */}
                {activeTab === "Reservations" && (
                    <div>
                        <div style={{ marginBottom: "32px" }}>
                            <h1 style={{ fontFamily: "Syne, sans-serif", fontSize: "26px", fontWeight: 800, letterSpacing: "-0.5px", color: "#1A1916" }}>Reservations</h1>
                            <p style={{ fontSize: "13px", color: "#8A8880", marginTop: "4px" }}>Track all product reservations</p>
                        </div>
                        {reservations.length === 0 ? (
                            <div style={{ ...S.card, padding: "60px", textAlign: "center", color: "#8A8880" }}>
                                <div style={{ fontSize: "36px", marginBottom: "12px" }}>📅</div>
                                <div style={{ fontSize: "15px", fontWeight: 500 }}>No reservations yet</div>
                                <div style={{ fontSize: "13px", marginTop: "4px" }}>Go to Inventory and reserve a product to see it here.</div>
                            </div>
                        ) : (
                            <div style={{ ...S.card, overflow: "hidden" }}>
                                <div style={{ display: "grid", gridTemplateColumns: "2fr 1.2fr 0.5fr 1.5fr 1.2fr 1fr 140px", padding: "12px 20px", background: "#F5F4F0", borderBottom: "1px solid #E8E6E0" }}>
                                    {["Product", "Warehouse", "Qty", "Reserved at", "Expires at", "Status", "Action"].map((h) => (
                                        <span key={h} style={S.label}>{h}</span>
                                    ))}
                                </div>
                                {reservations.map((r, i) => (
                                    <div key={r.id} style={{ display: "grid", gridTemplateColumns: "2fr 1.2fr 0.5fr 1.5fr 1.2fr 1fr 140px", padding: "14px 20px", borderBottom: i < reservations.length - 1 ? "1px solid #F5F4F0" : "none", alignItems: "center" }}>
                                        <ProductNameCell
                                            name={r.product}
                                            sublabel={`#RES-${String(r.id).slice(-4).toUpperCase()}`}
                                        />
                                        <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#F1EFE8", color: "#5F5E5A", fontSize: "12px", fontWeight: 500, padding: "4px 10px", borderRadius: "6px", width: "fit-content" }}>🏭 {r.warehouse}</span>
                                        <div style={{ fontSize: "14px", fontWeight: 600, color: "#1A1916" }}>{r.quantity}</div>
                                        <div style={{ fontSize: "12.5px", color: "#8A8880" }}>{fmtDate(r.reservedAt)}</div>
                                        <div style={{ fontSize: "12px", color: "#8A8880" }}>{fmtDate(r.expiresAt)}{r.status === "pending" ? <span style={{ marginLeft: 8, fontSize: "11px", color: "#A16207" }}>• {timeLeft(r.expiresAt)} left</span> : null}</div>
                                        <span style={{ fontSize: "11px", fontWeight: 600, padding: "3px 9px", borderRadius: "20px", display: "inline-block", width: "fit-content", background: r.status === "confirmed" ? "#F0FDF4" : r.status === "pending" ? "#FEF9C3" : "#FEF2F2", color: r.status === "confirmed" ? "#15803D" : r.status === "pending" ? "#A16207" : "#DC2626" }}>
                                            {r.status}
                                        </span>
                                        {r.status === "pending" ? (
                                            <div style={{ display: "flex", gap: "6px" }}>
                                                <button onClick={() => handleConfirmReservation(r.id)} style={{ padding: "6px 8px", border: "none", borderRadius: "7px", fontSize: "11px", fontWeight: 600, background: "#1D4ED8", color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>
                                                    Confirm
                                                </button>
                                                <button onClick={() => handleReleaseReservation(r.id)} style={{ padding: "6px 8px", border: "1px solid #FEE2E2", borderRadius: "7px", fontSize: "11px", fontWeight: 600, background: "#FEF2F2", color: "#DC2626", cursor: "pointer", fontFamily: "inherit" }}>
                                                    Cancel
                                                </button>
                                            </div>
                                        ) : <div />}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ── REPORTS ── */}
                {activeTab === "Reports" && (
                    <div>
                        <div style={{ marginBottom: "32px" }}>
                            <h1 style={{ fontFamily: "Syne, sans-serif", fontSize: "26px", fontWeight: 800, letterSpacing: "-0.5px", color: "#1A1916" }}>Reports</h1>
                            <p style={{ fontSize: "13px", color: "#8A8880", marginTop: "4px" }}>Inventory analytics and summaries</p>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                            {/* Stock summary */}
                            <div style={{ ...S.card, padding: "22px" }}>
                                <div style={{ ...S.label, marginBottom: "14px" }}>Stock summary</div>
                                {[
                                    { label: "Total SKUs", value: products.length, color: "#1D4ED8" },
                                    { label: "Total units", value: totalStock, color: "#15803D" },
                                    { label: "Low stock alerts", value: lowStockCount, color: "#A16207" },
                                    { label: "Out of stock", value: outCount, color: "#DC2626" },
                                    { label: "Total reservations", value: reservations.length, color: "#7C3AED" },
                                ].map(({ label, value, color }) => (
                                    <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #F5F4F0", fontSize: "13.5px" }}>
                                        <span style={{ color: "#475569" }}>{label}</span>
                                        <strong style={{ color }}>{value}</strong>
                                    </div>
                                ))}
                            </div>
                            {/* Per-warehouse */}
                            <div style={{ ...S.card, padding: "22px" }}>
                                <div style={{ ...S.label, marginBottom: "14px" }}>Per warehouse</div>
                                {warehouseFilterOptions.filter((wh) => wh !== "All").map((wh) => {
                                    const whProducts = products.filter((p) => p.warehouse === wh);
                                    const whStock = whProducts.reduce((s, p) => s + p.availableStock, 0);
                                    const whOut = whProducts.filter((p) => p.availableStock === 0).length;
                                    const whLow = whProducts.filter((p) => p.availableStock > 0 && p.availableStock <= 5).length;
                                    return (
                                        <div key={wh} style={{ marginBottom: "18px" }}>
                                            <div style={{ fontWeight: 600, fontSize: "14px", color: "#1A1916", marginBottom: "8px" }}>🏭 {wh}</div>
                                            {[
                                                { l: "SKUs", v: whProducts.length },
                                                { l: "Units", v: whStock },
                                                { l: "Low stock", v: whLow },
                                                { l: "Out of stock", v: whOut },
                                            ].map(({ l, v }) => (
                                                <div key={l} style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", padding: "5px 0", borderBottom: "1px solid #F5F4F0" }}>
                                                    <span style={{ color: "#8A8880" }}>{l}</span>
                                                    <strong style={{ color: "#1A1916" }}>{v}</strong>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })}
                            </div>
                            {/* Full product table */}
                            <div style={{ ...S.card, padding: "22px", gridColumn: "1 / -1" }}>
                                <div style={{ ...S.label, marginBottom: "14px" }}>All products — full report</div>
                                <div style={{ overflowX: "auto" }}>
                                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                                        <thead>
                                            <tr style={{ background: "#F5F4F0" }}>
                                                {["Product", "ID", "Warehouse", "Stock", "Status"].map((h) => (
                                                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", ...S.label }}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {products.map((p, i) => {
                                                const status = getStockStatus(p.availableStock);
                                                return (
                                                    <tr key={p.inventoryId} style={{ borderBottom: "1px solid #F5F4F0", background: i % 2 === 0 ? "#fff" : "#FAFAF8" }}>
                                                        <td style={{ padding: "10px 14px" }}>
                                                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                                                <ProductIcon name={p.product} size={30} />
                                                                <span style={{ fontWeight: 500, color: "#1A1916" }}>{p.product}</span>
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: "10px 14px", color: "#8A8880" }}>#PRD-{String(p.productId).padStart(4, "0")}</td>
                                                        <td style={{ padding: "10px 14px", color: "#475569" }}>{p.warehouse}</td>
                                                        <td style={{ padding: "10px 14px", fontWeight: 600, color: "#1A1916" }}>{p.availableStock}</td>
                                                        <td style={{ padding: "10px 14px" }}>
                                                            <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "20px", background: status.bg, color: status.color }}>{status.label}</span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── SETTINGS ── */}
                {activeTab === "Settings" && (
                    <div>
                        <div style={{ marginBottom: "32px" }}>
                            <h1 style={{ fontFamily: "Syne, sans-serif", fontSize: "26px", fontWeight: 800, letterSpacing: "-0.5px", color: "#1A1916" }}>Settings</h1>
                            <p style={{ fontSize: "13px", color: "#8A8880", marginTop: "4px" }}>Manage your account and preferences</p>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                            {/* Profile */}
                            <div style={{ ...S.card, padding: "24px" }}>
                                <div style={{ ...S.label, marginBottom: "18px" }}>Profile</div>
                                <div style={{ marginBottom: "14px" }}>
                                    <div style={{ ...S.label, marginBottom: "6px" }}>Display name</div>
                                    <input style={S.input} value={settingsDraft.adminName} onChange={(e) => setSettingsDraft({ ...settingsDraft, adminName: e.target.value })} placeholder="Your name" />
                                </div>
                                <div style={{ marginBottom: "14px" }}>
                                    <div style={{ ...S.label, marginBottom: "6px" }}>Role</div>
                                    <input style={S.input} value={settingsDraft.role} onChange={(e) => setSettingsDraft({ ...settingsDraft, role: e.target.value })} placeholder="e.g. Warehouse Mgr" />
                                </div>
                                <div style={{ marginBottom: "20px" }}>
                                    <div style={{ ...S.label, marginBottom: "6px" }}>Avatar initials</div>
                                    <input style={{ ...S.input, width: "80px" }} maxLength={2} value={settingsDraft.initials} onChange={(e) => setSettingsDraft({ ...settingsDraft, initials: e.target.value.toUpperCase() })} />
                                </div>
                                <button style={S.primaryBtn} onClick={() => { setSettings({ ...settingsDraft }); showToast("Profile updated"); }}>
                                    Save changes
                                </button>
                            </div>
                            {/* App preferences */}
                            <div style={{ ...S.card, padding: "24px" }}>
                                <div style={{ ...S.label, marginBottom: "18px" }}>App preferences</div>
                                {[
                                    { label: "Low stock threshold", desc: "Warn when stock falls below 5 units" },
                                    { label: "Email notifications", desc: "Receive alerts for critical stock levels" },
                                    { label: "Auto-refresh inventory", desc: "Refresh data every 60 seconds" },
                                ].map(({ label, desc }) => (
                                    <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid #F5F4F0" }}>
                                        <div>
                                            <div style={{ fontSize: "13.5px", fontWeight: 500, color: "#1A1916" }}>{label}</div>
                                            <div style={{ fontSize: "12px", color: "#8A8880", marginTop: "2px" }}>{desc}</div>
                                        </div>
                                        <ToggleSwitch />
                                    </div>
                                ))}
                            </div>
                            {/* Data management */}
                            <div style={{ ...S.card, padding: "24px", gridColumn: "1 / -1" }}>
                                <div style={{ ...S.label, marginBottom: "16px" }}>Data management</div>
                                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                                    <button style={S.secondaryBtn} onClick={() => { loadProducts(); showToast("Inventory refreshed"); }}>🔄 Refresh inventory</button>
                                    <button style={S.secondaryBtn} onClick={() => { const csv = ["Product,Warehouse,Stock", ...products.map((p) => `"${p.product}",${p.warehouse},${p.availableStock}`)].join("\n"); const a = document.createElement("a"); a.href = "data:text/csv," + encodeURIComponent(csv); a.download = "inventory.csv"; a.click(); showToast("Exported inventory.csv"); }}>
                                        ⬇️ Export CSV
                                    </button>
                                    <button
                                        style={{ ...S.secondaryBtn, borderColor: "#FEE2E2", color: "#DC2626", background: "#FEF2F2" }}
                                        onClick={handleClearReservations}
                                    >
                                        🗑 Clear reservations
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* ── ADD PRODUCT MODAL ── */}
            {showAddProduct && (
                <Modal title="Add new product" onClose={() => setShowAddProduct(false)}>
                    <div style={{ marginBottom: "14px" }}>
                        <div style={{ ...S.label, marginBottom: "6px" }}>Product name *</div>
                        <input style={S.input} value={newProduct.product} onChange={(e) => setNewProduct({ ...newProduct, product: e.target.value })} placeholder="e.g. Bluetooth Speaker" autoFocus />
                        {newProduct.product.trim() ? (
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "12px",
                                    marginTop: "10px",
                                    padding: "12px 14px",
                                    background: "#FAFAF8",
                                    border: "1px solid #E8E6E0",
                                    borderRadius: "10px",
                                }}
                            >
                                <ProductIcon name={newProduct.product} size={44} />
                                <div>
                                    <div style={{ fontSize: "11px", fontWeight: 600, color: "#8A8880", textTransform: "uppercase", letterSpacing: "0.4px" }}>Preview</div>
                                    <div style={{ fontSize: "14px", fontWeight: 600, color: "#1A1916", marginTop: "2px" }}>{newProduct.product.trim()}</div>
                                </div>
                            </div>
                        ) : null}
                    </div>
                    <div style={{ marginBottom: "14px" }}>
                        <div style={{ ...S.label, marginBottom: "6px" }}>Warehouse</div>
                        <select
                            style={S.input}
                            value={newProduct.warehouseId}
                            disabled={warehousesLoading || warehouses.length === 0}
                            onChange={(e) => {
                                const wh = warehouses.find((w) => w.id === e.target.value);
                                setNewProduct({ ...newProduct, warehouseId: e.target.value, warehouse: wh?.name ?? "" });
                            }}
                        >
                            {warehousesLoading ? (
                                <option value="">Loading warehouses…</option>
                            ) : warehouses.length === 0 ? (
                                <option value="">No warehouses available</option>
                            ) : (
                                <>
                                    {!newProduct.warehouseId && (
                                        <option value="">Select a warehouse</option>
                                    )}
                                    {warehouses.map((wh) => (
                                        <option key={wh.id} value={wh.id}>{wh.name}</option>
                                    ))}
                                </>
                            )}
                        </select>
                    </div>
                    <div style={{ marginBottom: "22px" }}>
                        <div style={{ ...S.label, marginBottom: "6px" }}>Initial stock</div>
                        <input style={S.input} type="number" min={0} value={newProduct.availableStock} onChange={(e) => setNewProduct({ ...newProduct, availableStock: e.target.value })} placeholder="0" />
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                        <button style={S.secondaryBtn} onClick={() => setShowAddProduct(false)}>Cancel</button>
                        <button
                            style={S.primaryBtn}
                            disabled={warehousesLoading || warehouses.length === 0 || !newProduct.warehouseId}
                            onClick={handleAddProduct}
                        >
                            Add product
                        </button>
                    </div>
                </Modal>
            )}

            {/* ── EDIT PRODUCT MODAL ── */}
            {editProduct && (
                <Modal title="Edit product" onClose={() => setEditProduct(null)}>
                    <div style={{ marginBottom: "14px" }}>
                        <div style={{ ...S.label, marginBottom: "6px" }}>Product name</div>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                            <ProductIcon name={editProduct.product || "Product"} size={40} />
                            <input
                                style={{ ...S.input, flex: 1 }}
                                value={editProduct.product}
                                onChange={(e) => setEditProduct({ ...editProduct, product: e.target.value })}
                            />
                        </div>
                    </div>
                    <div style={{ marginBottom: "14px" }}>
                        <div style={{ ...S.label, marginBottom: "6px" }}>Warehouse</div>
                        <select
                            style={S.input}
                            value={editProduct.warehouseId}
                            disabled={warehousesLoading || warehouses.length === 0}
                            onChange={(e) => {
                                const wh = warehouses.find((w) => w.id === e.target.value);
                                setEditProduct({ ...editProduct, warehouseId: e.target.value, warehouse: wh?.name ?? "" });
                            }}
                        >
                            {warehousesLoading ? (
                                <option value="">Loading warehouses…</option>
                            ) : warehouses.length === 0 ? (
                                <option value="">No warehouses available</option>
                            ) : (
                                warehouses.map((wh) => (
                                    <option key={wh.id} value={wh.id}>{wh.name}</option>
                                ))
                            )}
                        </select>
                    </div>
                    <div style={{ marginBottom: "22px" }}>
                        <div style={{ ...S.label, marginBottom: "6px" }}>Available stock</div>
                        <input style={S.input} type="number" min={0} value={editProduct.availableStock} onChange={(e) => setEditProduct({ ...editProduct, availableStock: Number(e.target.value) })} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                        <button style={S.secondaryBtn} onClick={() => setEditProduct(null)}>Cancel</button>
                        <button style={S.primaryBtn} onClick={handleEditSave}>Save changes</button>
                    </div>
                </Modal>
            )}

            {/* ── TOAST ── */}
            <div style={{
                position: "fixed", bottom: "28px", right: "28px",
                background: toast.type === "error" ? "#1A1916" : "#111",
                color: "#fff", padding: "14px 20px", borderRadius: "10px",
                fontSize: "13.5px", fontWeight: 500, display: "flex", alignItems: "center", gap: "10px",
                opacity: toast.visible ? 1 : 0,
                transform: toast.visible ? "translateY(0)" : "translateY(10px)",
                transition: "all 0.25s", pointerEvents: "none", zIndex: 999,
            }}>
                <span style={{ fontSize: "18px" }}>{toast.type === "error" ? "⚠️" : "✅"}</span>
                {toast.message}
            </div>
        </div>
    );
}

// ── Toggle Switch ─────────────────────────────────────────────────────────────
function ToggleSwitch() {
    const [on, setOn] = useState(false);
    return (
        <div onClick={() => setOn(!on)} style={{ width: "40px", height: "22px", borderRadius: "11px", background: on ? "#1D4ED8" : "#CBD5E1", cursor: "pointer", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
            <div style={{ position: "absolute", top: "3px", left: on ? "21px" : "3px", width: "16px", height: "16px", borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
        </div>
    );
}
