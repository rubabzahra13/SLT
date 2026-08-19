import { PageHeader } from "@/components/layout/PageHeader";
import { formatPrice } from "@/lib/data";

const packages = [
  { name: "Bronze 1:30 No Split", price: 350, category: "Cheer" },
  { name: "Silver 1:30 No Split", price: 470, category: "Cheer" },
  { name: "Gold 1:30 No Split", price: 600, category: "Cheer" },
  { name: "Gold 2:00 No Split", price: 850, category: "Cheer" },
  { name: "Gold 2:30 No Split", price: 1000, category: "Cheer" },
  { name: "Platinum 1:30 No Split", price: 850, category: "Cheer" },
  { name: "Platinum 1:45 Split", price: 1000, category: "Cheer" },
  { name: "Platinum 2:00 No Split", price: 1150, category: "Cheer" },
  { name: "Platinum 2:30 No Split", price: 1400, category: "Cheer" },
  { name: "Titanium 2:30 No Split", price: 1400, category: "Cheer" },
  { name: "Homecoming Mix TBD", price: 450, category: "School" },
  { name: "Band Chant :30", price: 200, category: "Marching Band" },
];

export default function PricingPage() {
  const cheer = packages.filter((p) => p.category === "Cheer");
  const other = packages.filter((p) => p.category !== "Cheer");

  return (
    <>
      <PageHeader
        title="Pricing"
        subtitle="Package prices auto-populate into orders and MTD"
        action={{ label: "Add Package" }}
      />

      <div className="space-y-8 p-6">
        <section>
          <h2 className="mb-4 text-lg font-semibold">Cheer Packages</h2>
          <div className="overflow-hidden rounded-2xl border border-ig-border bg-ig-surface">
            {cheer.map((pkg, i) => (
              <div
                key={pkg.name}
                className={`flex items-center justify-between px-5 py-4 ${
                  i > 0 ? "border-t border-ig-border" : ""
                }`}
              >
                <div>
                  <p className="font-semibold">{pkg.name}</p>
                  <p className="text-xs text-ig-text-secondary">
                    Compliant music pricing
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <input
                    type="text"
                    defaultValue={formatPrice(pkg.price)}
                    className="w-24 rounded-lg border border-ig-border bg-ig-bg px-3 py-1.5 text-right text-sm font-semibold outline-none focus:border-ig-blue"
                  />
                  <button
                    type="button"
                    className="text-sm font-semibold text-ig-blue"
                  >
                    Save
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold">Other Categories</h2>
          <div className="overflow-hidden rounded-2xl border border-ig-border bg-ig-surface">
            {other.map((pkg, i) => (
              <div
                key={pkg.name}
                className={`flex items-center justify-between px-5 py-4 ${
                  i > 0 ? "border-t border-ig-border" : ""
                }`}
              >
                <div>
                  <p className="font-semibold">{pkg.name}</p>
                  <p className="text-xs text-ig-text-secondary">{pkg.category}</p>
                </div>
                <p className="font-bold">{formatPrice(pkg.price)}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-ig-orange/30 bg-ig-orange/5 p-5">
          <h3 className="font-semibold text-ig-orange">Non-Compliant Music</h3>
          <p className="mt-1 text-sm text-ig-text-secondary">
            Different pricing rules apply for non-compliant music. Configure
            surcharges and licensing fees in Settings.
          </p>
        </section>
      </div>
    </>
  );
}
