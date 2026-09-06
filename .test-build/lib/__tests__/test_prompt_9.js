"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cheer_demo_orders_1 = require("../../data/cheer-demo-orders");
const pricing_engine_1 = require("../pricing-engine");
console.log("=== PROMPT 9 VERIFICATION: DEMO ORDERS PRICE MATCH ===");
let matchedCount = 0;
let mismatchCount = 0;
for (const order of cheer_demo_orders_1.CHEER_DEMO_ORDERS) {
    const pricing = (0, pricing_engine_1.calculateCheerOrderPricing)({
        cheerFormSubtype: order.cheerFormSubtype,
        packageType: order.packageType || order.package,
        timeLengthOfMix: order.timeLengthOfMix,
        musicAffiliate: order.musicAffiliate,
    });
    const enginePrice = pricing.customerFacingPrice;
    const storedPrice = order.price;
    if (enginePrice === storedPrice) {
        matchedCount++;
    }
    else {
        mismatchCount++;
        console.error(`[MISMATCH] Order ID: ${order.id} (${order.cheerFormSubtype})`);
        console.error(`  Package: ${order.packageType} | Time: ${order.timeLengthOfMix}`);
        console.error(`  Engine Price: $${enginePrice} | Stored Price: $${storedPrice}`);
    }
}
console.log(`\nResult: ${matchedCount} matched, ${mismatchCount} mismatched out of ${cheer_demo_orders_1.CHEER_DEMO_ORDERS.length} demo orders.`);
