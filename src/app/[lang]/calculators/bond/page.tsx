'use client';

import { useMemo, useState } from 'react';

function priceFromYTM(
  face: number,
  couponRate: number, // annual (e.g., 0.12 for 12%)
  years: number,
  ytm: number,        // annual
  freq: number
) {
  const n = Math.round(years * freq);
  const c = (face * couponRate) / freq; // coupon per period
  const r = ytm / freq;
  let pv = 0;
  for (let t = 1; t <= n; t++) {
    pv += c / Math.pow(1 + r, t);
  }
  pv += face / Math.pow(1 + r, n);
  return pv;
}

function solveYTM(targetPrice: number, face: number, couponRate: number, years: number, freq: number) {
  // Robust bisection
  let lo = 0.000001;   // ~0% annual
  let hi = 1.5;        // 150% annual (very high ceiling)
  const maxIter = 100;
  const tol = 1e-7;

  for (let i = 0; i < maxIter; i++) {
    const mid = (lo + hi) / 2;
    const pMid = priceFromYTM(face, couponRate, years, mid, freq);

    if (Math.abs(pMid - targetPrice) < tol) return mid;
    // If model price > target, yield is too low -> move lo up
    if (pMid > targetPrice) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2; // best effort
}

export default function BondCalculatorPage() {
  // Reasonable Tanzanian defaults (edit as you like)
  const [face, setFace] = useState(1_000_000);     // TZS
  const [price, setPrice] = useState(1_000_000);   // what you pay now
  const [couponPct, setCouponPct] = useState(12);  // % per year
  const [years, setYears] = useState(5);           // years to maturity
  const [freq, setFreq] = useState(2);             // coupons/year (2 = semi-annual)

  const couponRate = couponPct / 100;

  const results = useMemo(() => {
    const annualCoupon = face * couponRate;
    const perPeriod = annualCoupon / freq;
    const n = Math.round(years * freq);

    const ytm = solveYTM(price, face, couponRate, years, freq);
    const currentYield = annualCoupon / price;

    const totalCoupons = perPeriod * n;
    const totalCashAtMaturity = totalCoupons + face;
    const simpleTotalReturn = (totalCashAtMaturity - price) / price;
    const approxAnnualized = Math.pow(totalCashAtMaturity / price, 1 / years) - 1;

    return {
      annualCoupon,
      perPeriod,
      periods: n,
      currentYield,
      ytm,
      totalCoupons,
      totalCashAtMaturity,
      simpleTotalReturn,
      approxAnnualized,
    };
  }, [face, price, couponRate, years, freq]);

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-bold">Bond Return Calculator</h1>
      <p className="mt-2 text-gray-600">
        Estimate coupon income, current yield, and an approximate Yield to Maturity (YTM) for
        Tanzanian treasury/corporate bonds (default semi-annual coupons).
      </p>

      <section className="mt-6 grid gap-4 rounded-2xl border bg-white p-4 md:grid-cols-2">
        <div>
          <label className="text-sm text-gray-600">Face value (TZS)</label>
          <input
            type="number"
            className="mt-1 w-full rounded-lg border p-2"
            value={face}
            onChange={(e) => setFace(Number(e.target.value))}
          />
        </div>
        <div>
          <label className="text-sm text-gray-600">Price you pay now (TZS)</label>
          <input
            type="number"
            className="mt-1 w-full rounded-lg border p-2"
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
          />
        </div>
        <div>
          <label className="text-sm text-gray-600">Coupon rate (% per year)</label>
          <input
            type="number"
            className="mt-1 w-full rounded-lg border p-2"
            value={couponPct}
            step="0.1"
            onChange={(e) => setCouponPct(Number(e.target.value))}
          />
        </div>
        <div>
          <label className="text-sm text-gray-600">Years to maturity</label>
          <input
            type="number"
            className="mt-1 w-full rounded-lg border p-2"
            value={years}
            step="0.5"
            onChange={(e) => setYears(Number(e.target.value))}
          />
        </div>
        <div>
          <label className="text-sm text-gray-600">Coupon frequency</label>
          <select
            className="mt-1 w-full rounded-lg border p-2"
            value={freq}
            onChange={(e) => setFreq(Number(e.target.value))}
          >
            <option value={1}>Annual (1)</option>
            <option value={2}>Semi-annual (2)</option>
            <option value={4}>Quarterly (4)</option>
            <option value={12}>Monthly (12)</option>
          </select>
        </div>
      </section>

      <section className="mt-6 grid gap-4 rounded-2xl border bg-white p-4">
        <h2 className="text-lg font-semibold">Results</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg bg-gray-50 p-3">
            <div className="text-sm text-gray-600">Annual coupon</div>
            <div className="text-xl font-semibold">
              TZS {results.annualCoupon.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500">
              Per period: TZS {results.perPeriod.toLocaleString()} × {results.periods} periods
            </div>
          </div>

          <div className="rounded-lg bg-gray-50 p-3">
            <div className="text-sm text-gray-600">Current yield</div>
            <div className="text-xl font-semibold">
              {(results.currentYield * 100).toFixed(2)}%
            </div>
            <div className="text-xs text-gray-500">= annual coupon / price</div>
          </div>

          <div className="rounded-lg bg-gray-50 p-3">
            <div className="text-sm text-gray-600">Estimated YTM (annual)</div>
            <div className="text-xl font-semibold">
              {(results.ytm * 100).toFixed(2)}%
            </div>
            <div className="text-xs text-gray-500">
              Solved from bond price with {freq}× coupons/year
            </div>
          </div>

          <div className="rounded-lg bg-gray-50 p-3">
            <div className="text-sm text-gray-600">Total coupons (life of bond)</div>
            <div className="text-xl font-semibold">
              TZS {results.totalCoupons.toLocaleString()}
            </div>
          </div>

          <div className="rounded-lg bg-gray-50 p-3">
            <div className="text-sm text-gray-600">Total cash at maturity</div>
            <div className="text-xl font-semibold">
              TZS {results.totalCashAtMaturity.toLocaleString()}
            </div>
          </div>

          <div className="rounded-lg bg-gray-50 p-3">
            <div className="text-sm text-gray-600">Approx. annualized total return</div>
            <div className="text-xl font-semibold">
              {(results.approxAnnualized * 100).toFixed(2)}%
            </div>
            <div className="text-xs text-gray-500">
              Based on total cash received vs. price
            </div>
          </div>
        </div>

        <p className="mt-2 text-xs text-gray-500">
          Notes: YTM is an estimate; taxes/fees/inflation are not included. Most Tanzanian
          treasuries pay coupons semi-annually—use frequency = 2.
        </p>
      </section>
    </main>
  );
}
