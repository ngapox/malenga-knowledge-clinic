// src/components/ReactionBar.tsx
'use client';

import { motion } from 'framer-motion';

type ReactionEntry = { count: number; me: boolean };
type Props = {
  reactions?: Record<string, ReactionEntry>;
  onToggle: (emoji: string) => void;
};

const EMOJIS = ['👍','❤️','🔥','🎉','💡'];

export default function ReactionBar({ reactions, onToggle }: Props) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      {EMOJIS.map((e) => {
        const entry = reactions?.[e];
        return (
          <motion.button
            key={e}
            onClick={() => onToggle(e)}
            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors duration-150 ${
              entry?.me 
                ? 'bg-primary/10 border-primary text-primary font-semibold' 
                : 'bg-card hover:bg-muted/80'
            }`}
            title={entry?.count ? `${entry.count}` : '0'}
            whileTap={{ scale: 0.9 }}
          >
            <span>{e}</span>
            {entry?.count ? <span className="text-xs">{entry.count}</span> : ''}
          </motion.button>
        );
      })}
    </div>
  );
}