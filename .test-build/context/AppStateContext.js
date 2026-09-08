"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppStateProvider = AppStateProvider;
exports.useAppState = useAppState;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const data_1 = require("@/lib/data");
const order_form_1 = require("@/lib/order-form");
const pricing_1 = require("@/lib/pricing");
const editor_assignment_1 = require("@/lib/editor-assignment");
const scheduling_1 = require("@/lib/scheduling");
const producers_1 = require("@/lib/producers");
const discount_codes_1 = require("@/lib/discount-codes");
const mtd_status_1 = require("@/lib/mtd-status");
const dates_1 = require("@/lib/dates");
const api_1 = require("@/lib/api");
const AppStateContext = (0, react_1.createContext)(null);
function normalizeOrders(orders) {
    return orders.map((o) => (0, order_form_1.normalizeOrder)(o));
}
function normalizeMTD(records) {
    return records.map((r) => {
        const legacyBookedUntil = r
            .bookedUntil;
        const mixEndRaw = r.mixEndDate || legacyBookedUntil;
        const mixStartDate = (0, dates_1.toIsoDateString)(r.mixStartDate) || r.mixStartDate;
        let mixEnd = mixEndRaw
            ? (0, dates_1.toIsoDateString)(mixEndRaw) || mixEndRaw
            : undefined;
        const startIso = (0, dates_1.toIsoDateString)(mixStartDate);
        const endIso = mixEnd ? (0, dates_1.toIsoDateString)(mixEnd) : "";
        if (startIso && endIso && endIso < startIso) {
            mixEnd = (0, scheduling_1.suggestMixEndDate)(startIso, r.package);
        }
        return {
            ...r,
            editorRequest: r.editorRequest || "FA",
            contactName: r.contactName || r.editorInitials,
            priceCompliance: r.priceCompliance || (0, pricing_1.detectCompliance)(r.musicTheme),
            mixStartDate,
            recordStatus: (0, mtd_status_1.inferMTDRecordStatus)(r),
            inPayroll: Boolean(r.inPayroll),
            ...(mixEnd ? { mixEndDate: mixEnd } : {}),
        };
    });
}
function AppStateProvider({ children }) {
    const seed = (0, data_1.getData)();
    const [activeOrders, setActiveOrders] = (0, react_1.useState)(() => normalizeOrders(seed.orders.filter((o) => o.status !== "completed")));
    const [pastOrders, setPastOrders] = (0, react_1.useState)(() => normalizeOrders(seed.pastOrders ?? []));
    const [mtdRecords, setMtdRecords] = (0, react_1.useState)(() => normalizeMTD(seed.mtdRecords));
    const [packagePrices, setPackagePricesState] = (0, react_1.useState)(() => (0, pricing_1.getDefaultPackagePrices)());
    const [secretMenuPrices, setSecretMenuPricesState] = (0, react_1.useState)(() => (0, pricing_1.getDefaultSecretMenuPricing)());
    const [notifications, setNotifications] = (0, react_1.useState)(() => {
        const newOrders = seed.orders
            .filter((o) => o.status === "new")
            .slice(0, 8);
        return [...newOrders].reverse().map((order, index) => ({
            id: `notif-seed-${order.id}-${index}`,
            type: "new_order",
            title: "New order received",
            message: `${order.programName} · ${order.contactName || order.customerName || "Customer"}`,
            href: "/mtd",
            read: false,
            createdAt: order.createdAt || new Date().toISOString(),
        }));
    });
    const [producers, setProducers] = (0, react_1.useState)(() => seed.producers.map((p) => (0, producers_1.normalizeProducer)(p)));
    const [discountCodes, setDiscountCodes] = (0, react_1.useState)(() => (seed.discountCodes ?? []).map((entry) => (0, discount_codes_1.normalizeDiscountCode)(entry)));
    const [isBackendConnected, setIsBackendConnected] = (0, react_1.useState)(false);
    const schedule = seed.schedule;
    // Load data from FastAPI Backend on Mount
    (0, react_1.useEffect)(() => {
        let isMounted = true;
        async function loadBackendData() {
            try {
                const [producersData, ordersData, mtdData, codesData] = await Promise.all([
                    (0, api_1.fetchProducersApi)(),
                    (0, api_1.fetchOrdersApi)(),
                    (0, api_1.fetchMTDRecordsApi)(),
                    (0, api_1.fetchDiscountCodesApi)(),
                ]);
                if (!isMounted)
                    return;
                if (producersData && producersData.length > 0) {
                    const normalizedProducers = producersData.map((p) => (0, producers_1.normalizeProducer)(p));
                    const backendIds = new Set(normalizedProducers.map((p) => p.id));
                    const seedProducers = seed.producers.map((p) => (0, producers_1.normalizeProducer)(p));
                    const missingSeed = seedProducers.filter((p) => !backendIds.has(p.id));
                    setProducers([...normalizedProducers, ...missingSeed]);
                }
                if (ordersData) {
                    const backendActive = normalizeOrders(ordersData.activeOrders);
                    const backendPast = normalizeOrders(ordersData.pastOrders);
                    const backendOrderIds = new Set([
                        ...backendActive.map((o) => o.id),
                        ...backendPast.map((o) => o.id),
                    ]);
                    const seedActive = normalizeOrders(seed.orders.filter((o) => o.status !== "completed"));
                    const seedPast = normalizeOrders(seed.pastOrders ?? []);
                    const missingSeedActive = seedActive.filter((o) => !backendOrderIds.has(o.id));
                    const missingSeedPast = seedPast.filter((o) => !backendOrderIds.has(o.id));
                    setActiveOrders([...backendActive, ...missingSeedActive]);
                    setPastOrders([...backendPast, ...missingSeedPast]);
                }
                if (mtdData) {
                    const normalizedMtd = normalizeMTD(mtdData);
                    const backendMtdIds = new Set(normalizedMtd.map((r) => r.id));
                    const seedMtd = normalizeMTD(seed.mtdRecords);
                    const missingSeedMtd = seedMtd.filter((r) => !backendMtdIds.has(r.id));
                    setMtdRecords([...normalizedMtd, ...missingSeedMtd]);
                }
                if (codesData && codesData.length > 0) {
                    const normalizedCodes = codesData.map((c) => (0, discount_codes_1.normalizeDiscountCode)(c));
                    const backendCodeIds = new Set(normalizedCodes.map((c) => c.id));
                    const seedCodes = (seed.discountCodes ?? []).map((entry) => (0, discount_codes_1.normalizeDiscountCode)(entry));
                    const missingSeedCodes = seedCodes.filter((c) => !backendCodeIds.has(c.id));
                    setDiscountCodes([...normalizedCodes, ...missingSeedCodes]);
                }
                setIsBackendConnected(true);
            }
            catch (err) {
                if (!isMounted)
                    return;
                setIsBackendConnected(false);
                console.warn("FastAPI backend unavailable or unreachable. Falling back to local state.", err);
            }
        }
        loadBackendData();
        return () => {
            isMounted = false;
        };
    }, []);
    const addNotification = (0, react_1.useCallback)((n) => {
        const notification = {
            ...n,
            id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            read: false,
            createdAt: new Date().toISOString(),
        };
        setNotifications((prev) => [notification, ...prev].slice(0, 20));
    }, []);
    const allOrders = (0, react_1.useMemo)(() => [...activeOrders, ...pastOrders], [activeOrders, pastOrders]);
    const mtdOrderIds = (0, react_1.useMemo)(() => new Set(mtdRecords.map((r) => r.orderId).filter(Boolean)), [mtdRecords]);
    const isInMTD = (0, react_1.useCallback)((orderId) => mtdOrderIds.has(orderId), [mtdOrderIds]);
    const moveOrderToMTD = (0, react_1.useCallback)((orderId) => {
        const order = activeOrders.find((o) => o.id === orderId);
        if (!order || isInMTD(orderId))
            return null;
        const compliance = order.priceCompliance || (0, pricing_1.detectCompliance)(order.musicTheme);
        const price = order.price ||
            (0, pricing_1.getPriceForPackage)(order.package, compliance, order.price, packagePrices);
        const draftId = `mtd-${Date.now()}`;
        const draftRecord = {
            id: draftId,
            orderId: order.id,
            section: order.category === "Dance" ? "DANCE MUSIC" : "CHEERLEADING MUSIC",
            assignedProducer: null,
            category: order.category,
            editorRequest: order.editorRequest,
            contactName: order.contactName || order.customerName,
            editorInitials: order.contactName || order.customerName,
            programName: order.programName,
            package: order.package,
            musicTheme: order.musicTheme,
            price,
            priceCompliance: compliance,
            invoice: "",
            mixStartDate: "",
            eightCountSheet: "NEED CS",
            haveSongs: "NEED SONGS",
            needsAttention: true,
            status: "needs_attention",
        };
        const pick = (0, editor_assignment_1.pickDefaultEditor)(draftRecord, producers, mtdRecords, schedule, order);
        const availableNames = (0, editor_assignment_1.getSuggestedEditors)(mtdRecords, producers, schedule, order.category, draftId, draftRecord).map((suggestion) => suggestion.name);
        const assignedProducer = pick.editor || null;
        const editorRequest = assignedProducer
            ? (0, editor_assignment_1.editorRequestForAssignment)(pick.editor, pick.requestedEditor, availableNames)
            : order.editorRequest;
        const newRecord = {
            ...draftRecord,
            assignedProducer,
            editorRequest,
        };
        setMtdRecords((prev) => [newRecord, ...prev]);
        setActiveOrders((prev) => prev.map((o) => o.id === orderId
            ? { ...o, status: "in_mtd", mtdId: newRecord.id }
            : o));
        // Persist to Backend API
        (0, api_1.createMTDRecordApi)(newRecord).catch((err) => console.error("Failed to persist MTD Record to backend:", err));
        (0, api_1.updateOrderApi)(orderId, { status: "in_mtd" }).catch((err) => console.error("Failed to persist Order status to backend:", err));
        const slotMsg = assignedProducer
            ? ` Next slot: ${formatSlot(assignedProducer, producers, schedule)}.`
            : "";
        const busyFallback = pick.reason === "requested_busy"
            ? ` ${pick.requestedEditor} was booked — assigned ${assignedProducer} (FA).`
            : "";
        addNotification({
            type: "mtd_move",
            title: "Moved to MTD",
            message: `${order.programName} is now in Music To Do.${busyFallback}${slotMsg}`,
            href: `/mtd/${newRecord.id}`,
        });
        return newRecord;
    }, [activeOrders, isInMTD, mtdRecords, producers, schedule, addNotification, packagePrices]);
    const setPackagePrices = (0, react_1.useCallback)((prices) => {
        setPackagePricesState(prices);
        setMtdRecords((prev) => prev.map((record) => {
            const compliance = record.priceCompliance || (0, pricing_1.detectCompliance)(record.musicTheme);
            return {
                ...record,
                price: (0, pricing_1.getPriceForPackage)(record.package, compliance, record.price, prices),
            };
        }));
    }, []);
    const setSecretMenuPrices = (0, react_1.useCallback)((pricing) => {
        setSecretMenuPricesState(pricing);
    }, []);
    const updateMTD = (0, react_1.useCallback)((id, patch) => {
        let payrollNotice = null;
        setMtdRecords((prev) => prev.map((r) => {
            if (r.id !== id)
                return r;
            if (patch.inPayroll === true && !r.inPayroll) {
                const producer = r.assignedProducer?.trim();
                payrollNotice = {
                    type: "payroll",
                    title: "Moved to payroll",
                    message: producer
                        ? `${r.programName} · ${producer}`
                        : r.programName,
                    href: "/payroll",
                };
            }
            const updated = { ...r, ...patch };
            if (patch.editorRequest === "NA" || patch.assignedProducer === null) {
                updated.assignedProducer = null;
            }
            else if (patch.assignedProducer !== undefined) {
                updated.assignedProducer = (0, editor_assignment_1.resolveValidProducerAssignment)(patch.assignedProducer, producers, updated.category);
            }
            else if (patch.editorRequest &&
                patch.editorRequest !== "FA" &&
                patch.editorRequest !== "NA") {
                const resolved = (0, editor_assignment_1.resolveValidProducerAssignment)(patch.editorRequest, producers, updated.category);
                if (resolved) {
                    updated.assignedProducer = resolved;
                }
            }
            if (patch.package || patch.priceCompliance || patch.musicTheme) {
                const compliance = patch.priceCompliance ||
                    (0, pricing_1.detectCompliance)(patch.musicTheme ?? r.musicTheme);
                updated.priceCompliance = compliance;
                if (patch.price === undefined) {
                    updated.price = (0, pricing_1.getPriceForPackage)(patch.package ?? r.package, compliance, r.price, packagePrices);
                }
            }
            const needsCs = updated.eightCountSheet.toUpperCase().includes("NEED");
            const needsSongs = updated.haveSongs.toUpperCase().includes("NEED");
            updated.needsAttention = needsCs || needsSongs;
            return updated;
        }));
        // Persist MTD patch to backend API
        (0, api_1.updateMTDRecordApi)(id, patch).catch((err) => console.error("Failed to persist MTD Record update to backend:", err));
        if (payrollNotice) {
            addNotification(payrollNotice);
        }
    }, [addNotification, packagePrices]);
    const updateOrder = (0, react_1.useCallback)((id, patch, seed) => {
        const merge = (order) => (0, order_form_1.normalizeOrder)({ ...order, ...patch, id });
        setActiveOrders((prev) => {
            if (prev.some((order) => order.id === id)) {
                return prev.map((order) => (order.id === id ? merge(order) : order));
            }
            if (seed)
                return [merge(seed), ...prev];
            return prev;
        });
        setPastOrders((prev) => {
            if (prev.some((order) => order.id === id)) {
                return prev.map((order) => (order.id === id ? merge(order) : order));
            }
            return prev;
        });
        // Persist Order patch to backend API
        (0, api_1.updateOrderApi)(id, patch).catch((err) => console.error("Failed to persist Order update to backend:", err));
    }, []);
    const markComplete = (0, react_1.useCallback)((orderId) => {
        const order = activeOrders.find((o) => o.id === orderId);
        if (!order)
            return;
        const completed = {
            ...order,
            status: "completed",
            completedAt: new Date().toISOString().slice(0, 10),
            assignedProducer: (0, editor_assignment_1.resolveValidProducerAssignment)(order.assignedProducer || order.requestedProducer || order.editorRequest, producers, order.category || order.formType || ""),
        };
        setActiveOrders((prev) => prev.filter((o) => o.id !== orderId));
        setPastOrders((prev) => [completed, ...prev]);
        // Persist completed status to backend API
        (0, api_1.updateOrderApi)(orderId, {
            status: "completed",
            completedAt: completed.completedAt,
        }).catch((err) => console.error("Failed to persist Order completion to backend:", err));
    }, [activeOrders]);
    const addPastOrder = (0, react_1.useCallback)((order) => {
        setPastOrders((prev) => [order, ...prev]);
        (0, api_1.updateOrderApi)(order.id, { status: "completed", completedAt: order.completedAt }).catch((err) => console.error("Failed to persist past order to backend:", err));
    }, []);
    const receiveOrder = (0, react_1.useCallback)((order) => {
        const incoming = (0, order_form_1.normalizeOrder)({
            ...order,
            status: order.status || "new",
        });
        setActiveOrders((prev) => {
            if (prev.some((o) => o.id === incoming.id))
                return prev;
            return [incoming, ...prev];
        });
        // Persist new incoming order to backend API
        (0, api_1.createOrderApi)(incoming).catch((err) => console.error("Failed to persist new order to backend:", err));
        addNotification({
            type: "new_order",
            title: "New order received",
            message: `${incoming.programName} · ${incoming.contactName || incoming.customerName || "Customer"}`,
            href: "/mtd",
        });
    }, [addNotification]);
    const addProducer = (0, react_1.useCallback)((producer) => {
        const normalized = (0, producers_1.normalizeProducer)(producer);
        setProducers((prev) => [normalized, ...prev]);
        (0, api_1.createProducerApi)(normalized).catch((err) => console.error("Failed to persist new producer to backend:", err));
    }, []);
    const updateProducer = (0, react_1.useCallback)((id, patch) => {
        setProducers((prev) => prev.map((p) => p.id === id ? (0, producers_1.normalizeProducer)({ ...p, ...patch, id }) : p));
        (0, api_1.updateProducerApi)(id, patch).catch((err) => console.error("Failed to persist producer update to backend:", err));
    }, []);
    const removeProducer = (0, react_1.useCallback)((id) => {
        setProducers((prev) => prev.filter((p) => p.id !== id));
        (0, api_1.deleteProducerApi)(id).catch((err) => console.error("Failed to delete producer from backend:", err));
    }, []);
    const addDiscountCode = (0, react_1.useCallback)((discountCode) => {
        const normalized = (0, discount_codes_1.normalizeDiscountCode)(discountCode);
        setDiscountCodes((prev) => [normalized, ...prev]);
        (0, api_1.createDiscountCodeApi)(normalized).catch((err) => console.error("Failed to persist new discount code to backend:", err));
    }, []);
    const updateDiscountCode = (0, react_1.useCallback)((id, patch) => {
        setDiscountCodes((prev) => prev.map((entry) => entry.id === id
            ? (0, discount_codes_1.normalizeDiscountCode)({ ...entry, ...patch, id })
            : entry));
        (0, api_1.updateDiscountCodeApi)(id, patch).catch((err) => console.error("Failed to persist discount code update to backend:", err));
    }, []);
    const removeDiscountCode = (0, react_1.useCallback)((id) => {
        setDiscountCodes((prev) => prev.filter((entry) => entry.id !== id));
        (0, api_1.deleteDiscountCodeApi)(id).catch((err) => console.error("Failed to delete discount code from backend:", err));
    }, []);
    const markNotificationRead = (0, react_1.useCallback)((id) => {
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    }, []);
    const markAllNotificationsRead = (0, react_1.useCallback)(() => {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }, []);
    const unreadCount = notifications.filter((n) => !n.read).length;
    const value = {
        activeOrders,
        pastOrders,
        allOrders,
        mtdRecords,
        packagePrices,
        secretMenuPrices,
        producers,
        discountCodes,
        schedule,
        notifications,
        unreadCount,
        isBackendConnected,
        moveOrderToMTD,
        updateMTD,
        updateOrder,
        setPackagePrices,
        setSecretMenuPrices,
        markComplete,
        addPastOrder,
        receiveOrder,
        addProducer,
        updateProducer,
        removeProducer,
        addDiscountCode,
        updateDiscountCode,
        removeDiscountCode,
        markNotificationRead,
        markAllNotificationsRead,
        isInMTD,
    };
    return ((0, jsx_runtime_1.jsx)(AppStateContext.Provider, { value: value, children: children }));
}
function useAppState() {
    const ctx = (0, react_1.useContext)(AppStateContext);
    if (!ctx)
        throw new Error("useAppState must be used within AppStateProvider");
    return ctx;
}
function formatSlot(initials, producers, schedule) {
    const producer = producers.find((p) => p.initials === initials);
    const availableEntry = schedule.find((s) => s.producer === initials && s.status === "available");
    if (availableEntry)
        return availableEntry.day;
    return producer?.nextAvailable ?? "TBD";
}
