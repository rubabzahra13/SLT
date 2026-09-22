"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppStateProvider = AppStateProvider;
exports.useAppState = useAppState;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const data_1 = require("@/lib/data");
const order_form_1 = require("@/lib/order-form");
const AuthContext_1 = require("@/context/AuthContext");
const pricing_1 = require("@/lib/pricing");
const editor_assignment_1 = require("@/lib/editor-assignment");
const scheduling_1 = require("@/lib/scheduling");
const producers_1 = require("@/lib/producers");
const discount_codes_1 = require("@/lib/discount-codes");
const mtd_filters_1 = require("@/lib/mtd-filters");
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
        const normalized = {
            ...r,
            editorRequest: r.editorRequest || "FA",
            contactName: r.contactName || r.editorInitials,
            priceCompliance: r.priceCompliance || (0, pricing_1.detectCompliance)(r.musicTheme),
            mixStartDate,
            recordStatus: (0, mtd_status_1.inferMTDRecordStatus)(r),
            inPayroll: Boolean(r.inPayroll),
            ...(mixEnd ? { mixEndDate: mixEnd } : {}),
        };
        // Backfill only for outsourced rows missing the explicit MTD flag.
        // Assigned + scheduled orders stay on the Orders tab until "Move to MTD".
        if (normalized.inMTD === undefined && (0, mtd_filters_1.isOutsourcedRecord)(normalized)) {
            normalized.inMTD = true;
        }
        return normalized;
    });
}
function AppStateProvider({ children }) {
    const seed = (0, data_1.getData)();
    // One-time migration: clear any stale localStorage keys that may contain
    // old mock/demo data, ensuring the backend API is always the data source.
    if (typeof window !== "undefined") {
        localStorage.removeItem("slt_persisted_active_orders");
        localStorage.removeItem("slt_persisted_past_orders");
        localStorage.removeItem("slt_persisted_mtd_records");
    }
    // Transactional data always starts empty — populated exclusively from the
    // backend API (Supabase). No fallback to local seed/mock data.
    const [activeOrders, setActiveOrders] = (0, react_1.useState)([]);
    const [pastOrders, setPastOrders] = (0, react_1.useState)([]);
    const [mtdRecords, setMtdRecords] = (0, react_1.useState)([]);
    const [packagePrices, setPackagePricesState] = (0, react_1.useState)(() => (0, pricing_1.getDefaultPackagePrices)());
    const [secretMenuPrices, setSecretMenuPricesState] = (0, react_1.useState)(() => (0, pricing_1.getDefaultSecretMenuPricing)());
    // Notifications start empty — populated when backend data loads or user actions occur.
    const [notifications, setNotifications] = (0, react_1.useState)([]);
    const [producers, setProducers] = (0, react_1.useState)(() => (0, producers_1.deduplicateProducers)(seed.producers.map((p) => (0, producers_1.normalizeProducer)(p))));
    const [discountCodes, setDiscountCodes] = (0, react_1.useState)([]);
    const [isBackendConnected, setIsBackendConnected] = (0, react_1.useState)(false);
    const [isLoading, setIsLoading] = (0, react_1.useState)(true);
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
                    setProducers((0, producers_1.deduplicateProducers)(normalizedProducers));
                }
                let loadedActiveOrders = [];
                let loadedMtdRecords = [];
                if (ordersData) {
                    // Database is the single source of truth for orders.
                    // Replace state entirely — no seed fallback.
                    loadedActiveOrders = normalizeOrders(ordersData.activeOrders);
                    setActiveOrders(loadedActiveOrders);
                    setPastOrders(normalizeOrders(ordersData.pastOrders));
                }
                if (mtdData) {
                    // Database is the single source of truth for MTD records.
                    // Replace state entirely — no seed fallback.
                    loadedMtdRecords = normalizeMTD(mtdData);
                }
                // Map active orders to MTDRecords for staging in Orders tab.
                // Orders with status !== "in_mtd" have inMTD: false (pre-MTD staging).
                // Orders with status === "in_mtd" have inMTD: true.
                const existingMtdOrderIds = new Set(loadedMtdRecords.map((r) => r.orderId).filter(Boolean));
                const convertedOrders = [];
                for (const order of loadedActiveOrders) {
                    const oid = order.id || order.uuid || order.legacyId;
                    if (oid && !existingMtdOrderIds.has(oid)) {
                        convertedOrders.push((0, order_form_1.orderToMTDRecord)(order));
                    }
                }
                setMtdRecords([...loadedMtdRecords, ...convertedOrders]);
                if (codesData) {
                    // Database is the single source of truth for discount codes.
                    // Replace state entirely — no seed fallback.
                    const normalizedCodes = codesData.map((c) => (0, discount_codes_1.normalizeDiscountCode)(c));
                    setDiscountCodes(normalizedCodes);
                }
                setIsBackendConnected(true);
            }
            catch (err) {
                if (!isMounted)
                    return;
                setIsBackendConnected(false);
                console.warn("FastAPI backend unavailable or unreachable. Falling back to local state.", err);
            }
            finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        }
        loadBackendData();
        return () => {
            isMounted = false;
        };
    }, []);
    // NOTE: Orders and MTD records are intentionally NOT persisted to localStorage.
    // The backend API (Supabase) is the sole persistent store. On each page load
    // the app fetches fresh data from the database.
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
    let isViewOnly = false;
    try {
        const auth = (0, AuthContext_1.useAuth)();
        isViewOnly = auth.isViewOnly;
    }
    catch {
        // Fallback if rendered outside AuthProvider
    }
    const moveOrderToMTD = (0, react_1.useCallback)((orderId) => {
        if (isViewOnly)
            return null;
        const order = activeOrders.find((o) => o.id === orderId);
        if (!order || isInMTD(orderId))
            return null;
        const compliance = order.priceCompliance || (0, pricing_1.detectCompliance)(order.musicTheme);
        const price = order.price ||
            (0, pricing_1.getPriceForPackage)(order.package, compliance, order.price, packagePrices);
        const draftId = `mtd-${Date.now()}`;
        const sectionForCategory = (cat) => {
            if (cat === "Dance")
                return "DANCE MUSIC";
            if (cat === "Marching Band")
                return "MARCHING BAND";
            if (cat === "Sports Entertainment")
                return "SPORTS ENTERTAINMENT";
            if (cat === "School Anthem")
                return "SCHOOL ANTHEMS";
            return "CHEERLEADING MUSIC";
        };
        const draftRecord = {
            id: draftId,
            orderId: order.id,
            section: sectionForCategory(order.category),
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
            mixStartDate: order.mixStartDate || "",
            mixEndDate: order.mixEndDate || undefined,
            eightCountSheet: "NEED CS",
            haveSongs: "NEED SONGS",
            needsAttention: false,
            status: "active",
            recordStatus: "Ongoing",
            formType: order.formType,
            cheerFormSubtype: order.cheerFormSubtype,
            danceFormSubtype: order.danceFormSubtype,
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
            inMTD: true,
        };
        setMtdRecords((prev) => [newRecord, ...prev]);
        setActiveOrders((prev) => prev.map((o) => o.id === orderId
            ? { ...o, status: "in_mtd", mtdId: newRecord.id }
            : o));
        // Persist to Backend API and write real DB UUID back into state
        // so that subsequent PATCH calls use the correct ID (avoids 404s).
        (0, api_1.createMTDRecordApi)(newRecord)
            .then((saved) => {
            if (saved.uuid && saved.uuid !== draftId) {
                setMtdRecords((prev) => prev.map((r) => r.id === draftId
                    ? { ...r, id: saved.id, uuid: saved.uuid, legacyId: saved.legacyId }
                    : r));
            }
        })
            .catch((err) => console.error("Failed to persist MTD Record to backend:", err));
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
        if (isViewOnly)
            return;
        setPackagePricesState(prices);
        setMtdRecords((prev) => prev.map((record) => {
            const compliance = record.priceCompliance || (0, pricing_1.detectCompliance)(record.musicTheme);
            return {
                ...record,
                price: (0, pricing_1.getPriceForPackage)(record.package, compliance, record.price, prices),
            };
        }));
    }, [isViewOnly]);
    const setSecretMenuPrices = (0, react_1.useCallback)((pricing) => {
        if (isViewOnly)
            return;
        setSecretMenuPricesState(pricing);
    }, [isViewOnly]);
    const updateMTD = (0, react_1.useCallback)((id, patch) => {
        if (isViewOnly)
            return;
        let payrollNotice = null;
        let apiId = id;
        let apiPatch = patch;
        setMtdRecords((prev) => {
            const existing = prev.find((r) => r.id === id || r.orderId === id || r.uuid === id || r.legacyId === id);
            if (existing?.uuid)
                apiId = existing.uuid;
            return prev.map((r) => {
                if (r.id !== id && r.orderId !== id && r.uuid !== id && r.legacyId !== id)
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
                    apiPatch = { ...apiPatch, assignedProducer: null };
                }
                else if (patch.assignedProducer !== undefined) {
                    const resolved = (0, editor_assignment_1.resolveAssignedProducerForPatch)(patch.assignedProducer, producers, updated.category);
                    updated.assignedProducer = resolved;
                    apiPatch = { ...apiPatch, assignedProducer: resolved };
                    if (resolved && !r.inMTD && patch.inMTD === undefined) {
                        updated.inMTD = false;
                        apiPatch = { ...apiPatch, inMTD: false };
                    }
                    if (resolved &&
                        !(0, dates_1.toIsoDateString)(updated.mixStartDate) &&
                        patch.mixStartDate === undefined) {
                        const mixStartDate = (0, scheduling_1.suggestMixStartDate)(resolved, producers, schedule);
                        if (mixStartDate) {
                            updated.mixStartDate = mixStartDate;
                            apiPatch = { ...apiPatch, mixStartDate };
                        }
                    }
                }
                else if (patch.editorRequest &&
                    patch.editorRequest !== "FA" &&
                    patch.editorRequest !== "NA") {
                    const resolved = (0, editor_assignment_1.resolveAssignedProducerForPatch)(patch.editorRequest, producers, updated.category);
                    if (resolved) {
                        updated.assignedProducer = resolved;
                        apiPatch = { ...apiPatch, assignedProducer: resolved };
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
            });
        });
        // Also sync pre-MTD edits to activeOrders if this ID belongs to an active order
        const linkedOrder = activeOrders.find((o) => o.id === id || o.legacyId === id || o.uuid === id);
        if (linkedOrder) {
            const orderPatch = {};
            if (patch.assignedProducer !== undefined)
                orderPatch.assignedProducer = patch.assignedProducer;
            if (patch.mixStartDate !== undefined)
                orderPatch.mixStartDate = patch.mixStartDate;
            if (patch.mixEndDate !== undefined)
                orderPatch.mixEndDate = patch.mixEndDate;
            if (patch.price !== undefined)
                orderPatch.price = patch.price;
            if (patch.editorRequest !== undefined)
                orderPatch.editorRequest = patch.editorRequest;
            if (patch.inMTD === true)
                orderPatch.status = "in_mtd";
            if (patch.inMTD === false)
                orderPatch.status = "active";
            if (patch.isReassigned !== undefined)
                orderPatch.isReassigned = patch.isReassigned;
            if (Object.keys(orderPatch).length > 0) {
                setActiveOrders((prev) => prev.map((o) => o.id === linkedOrder.id ? { ...o, ...orderPatch } : o));
                (0, api_1.updateOrderApi)(linkedOrder.id, orderPatch).catch((err) => console.error("Failed to sync order update to backend:", err));
            }
        }
        // Persist MTD patch to backend API
        if (patch.inMTD === true) {
            const targetRecord = mtdRecords.find((r) => r.id === id || r.orderId === id || r.uuid === id || r.legacyId === id);
            const updatedRecord = targetRecord ? { ...targetRecord, ...patch, inMTD: true } : { ...patch, inMTD: true };
            (0, api_1.createMTDRecordApi)(updatedRecord)
                .then((saved) => {
                setMtdRecords((prev) => prev.map((r) => r.id === id || r.orderId === id || r.uuid === id || r.legacyId === id
                    ? { ...r, id: saved.id, uuid: saved.uuid, legacyId: saved.legacyId, inMTD: true }
                    : r));
            })
                .catch(() => {
                (0, api_1.updateMTDRecordApi)(apiId, apiPatch).catch((err) => console.error("Failed to persist MTD Record update to backend:", err));
            });
        }
        else {
            (0, api_1.updateMTDRecordApi)(apiId, apiPatch).catch((err) => console.error("Failed to persist MTD Record update to backend:", err));
        }
        if (payrollNotice) {
            addNotification(payrollNotice);
        }
    }, [activeOrders, addNotification, mtdRecords, packagePrices, producers, schedule]);
    const updateOrder = (0, react_1.useCallback)((id, patch, seed) => {
        if (isViewOnly)
            return;
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
    }, [isViewOnly]);
    const markComplete = (0, react_1.useCallback)((orderId) => {
        if (isViewOnly)
            return;
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
    }, [activeOrders, isViewOnly, producers]);
    const addPastOrder = (0, react_1.useCallback)((order) => {
        if (isViewOnly)
            return;
        setPastOrders((prev) => [order, ...prev]);
        (0, api_1.updateOrderApi)(order.id, { status: "completed", completedAt: order.completedAt }).catch((err) => console.error("Failed to persist past order to backend:", err));
    }, [isViewOnly]);
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
    const addProducer = (0, react_1.useCallback)(async (producer) => {
        if (isViewOnly) {
            throw new Error("View-only accounts cannot add producers.");
        }
        const normalized = (0, producers_1.normalizeProducer)(producer);
        const tempId = normalized.id;
        setProducers((prev) => [normalized, ...prev]);
        try {
            const saved = await (0, api_1.createProducerApi)(normalized);
            setProducers((prev) => prev.map((p) => (p.id === tempId ? saved : p)));
            return saved;
        }
        catch (err) {
            setProducers((prev) => prev.filter((p) => p.id !== tempId));
            throw err;
        }
    }, [isViewOnly]);
    const updateProducer = (0, react_1.useCallback)(async (id, patch) => {
        if (isViewOnly) {
            throw new Error("View-only accounts cannot edit producers.");
        }
        let previous;
        setProducers((prev) => {
            previous = prev.find((p) => p.id === id);
            return prev.map((p) => p.id === id ? (0, producers_1.normalizeProducer)({ ...p, ...patch, id }) : p);
        });
        if (!previous) {
            throw new Error("Producer not found.");
        }
        try {
            const saved = await (0, api_1.updateProducerApi)(id, patch, (0, api_1.resolveProducerApiId)(previous));
            setProducers((prev) => prev.map((p) => (p.id === id ? saved : p)));
            return saved;
        }
        catch (err) {
            setProducers((prev) => prev.map((p) => (p.id === id ? previous : p)));
            throw err;
        }
    }, [isViewOnly]);
    const removeProducer = (0, react_1.useCallback)(async (id) => {
        if (isViewOnly) {
            throw new Error("View-only accounts cannot remove producers.");
        }
        let removed;
        setProducers((prev) => {
            removed = prev.find((p) => p.id === id);
            return prev.filter((p) => p.id !== id);
        });
        if (!removed) {
            throw new Error("Producer not found.");
        }
        try {
            await (0, api_1.deleteProducerApi)(id, (0, api_1.resolveProducerApiId)(removed));
        }
        catch (err) {
            setProducers((prev) => [removed, ...prev]);
            throw err;
        }
    }, [isViewOnly]);
    const addDiscountCode = (0, react_1.useCallback)(async (discountCode) => {
        if (isViewOnly) {
            throw new Error("View-only accounts cannot add discount codes.");
        }
        const normalized = (0, discount_codes_1.normalizeDiscountCode)(discountCode);
        const tempId = normalized.id;
        setDiscountCodes((prev) => [normalized, ...prev]);
        try {
            const saved = await (0, api_1.createDiscountCodeApi)(normalized);
            setDiscountCodes((prev) => prev.map((c) => (c.id === tempId ? saved : c)));
            return saved;
        }
        catch (err) {
            setDiscountCodes((prev) => prev.filter((c) => c.id !== tempId));
            throw err;
        }
    }, [isViewOnly]);
    const updateDiscountCode = (0, react_1.useCallback)(async (id, patch) => {
        if (isViewOnly) {
            throw new Error("View-only accounts cannot edit discount codes.");
        }
        let previous;
        setDiscountCodes((prev) => {
            previous = prev.find((entry) => entry.id === id);
            return prev.map((entry) => entry.id === id
                ? (0, discount_codes_1.normalizeDiscountCode)({ ...entry, ...patch, id })
                : entry);
        });
        if (!previous) {
            throw new Error("Discount code not found.");
        }
        try {
            const saved = await (0, api_1.updateDiscountCodeApi)(id, patch);
            setDiscountCodes((prev) => prev.map((entry) => (entry.id === id ? saved : entry)));
            return saved;
        }
        catch (err) {
            setDiscountCodes((prev) => prev.map((entry) => (entry.id === id ? previous : entry)));
            throw err;
        }
    }, [isViewOnly]);
    const removeDiscountCode = (0, react_1.useCallback)(async (id) => {
        if (isViewOnly) {
            throw new Error("View-only accounts cannot delete discount codes.");
        }
        let removed;
        setDiscountCodes((prev) => {
            removed = prev.find((entry) => entry.id === id);
            return prev.filter((entry) => entry.id !== id);
        });
        if (!removed) {
            throw new Error("Discount code not found.");
        }
        try {
            await (0, api_1.deleteDiscountCodeApi)(id);
        }
        catch (err) {
            setDiscountCodes((prev) => [removed, ...prev]);
            throw err;
        }
    }, [isViewOnly]);
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
        isLoading,
        isViewOnly,
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
