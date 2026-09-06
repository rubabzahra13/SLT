import { CHEER_DEMO_ORDERS } from "../../data/cheer-demo-orders";
import { calculateCheerOrderPricing } from "../pricing-engine";

console.log("=== PROMPT 9 VERIFICATION: DEMO ORDERS PRICE MATCH ===");

let matchedCount = 0;
let mismatchCount = 0;

for (const order of CHEER_DEMO_ORDERS) {
  const pricing = calculateCheerOrderPricing({
    cheerFormSubtype: order.cheerFormSubtype!,
    packageType: order.packageType || order.package,
    timeLengthOfMix: order.timeLengthOfMix,
    musicAffiliate: order.musicAffiliate,
  });

  const enginePrice = pricing.customerFacingPrice;
  const storedPrice = order.price;

  if (enginePrice === storedPrice) {
    matchedCount++;
  } else {
    mismatchCount++;
    console.error(`[MISMATCH] Order ID: ${order.id} (${order.cheerFormSubtype})`);
    console.error(`  Package: ${order.packageType} | Time: ${order.timeLengthOfMix}`);
    console.error(`  Engine Price: $${enginePrice} | Stored Price: $${storedPrice}`);
  }
}

console.log(`\nResult: ${matchedCount} matched, ${mismatchCount} mismatched out of ${CHEER_DEMO_ORDERS.length} demo orders.`);
