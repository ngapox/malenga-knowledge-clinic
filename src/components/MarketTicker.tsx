// src/components/MarketTicker.tsx
"use client";

import { motion } from "framer-motion";

type TickerItem = {
  symbol: string;
  close: number;
  change: number;
};

export default function MarketTicker({ data }: { data: TickerItem[] }) {
  if (!data || data.length === 0) {
    return null; // Don't render anything if there's no data
  }

  // Duplicate the data to create a seamless scrolling effect
  const extendedData = [...data, ...data];

  return (
    <div className="w-full overflow-hidden bg-secondary text-secondary-foreground py-3 border-y">
      <motion.div
        className="flex"
        animate={{
          x: ['-100%', '0%'],
          transition: {
            ease: 'linear',
            duration: 20,
            repeat: Infinity,
          },
        }}
      >
        <div className="flex flex-shrink-0">
          {extendedData.map((item, index) => (
            <div key={index} className="flex items-center mx-6">
              <span className="font-bold text-lg">{item.symbol}</span>
              <span className="ml-2 text-md">{item.close.toLocaleString()}</span>
              <span className={`ml-2 text-sm font-semibold ${item.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {item.change >= 0 ? '▲' : '▼'} {item.change.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
