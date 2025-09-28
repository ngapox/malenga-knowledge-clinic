'use client';

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
          <button
            key={e}
            onClick={() => onToggle(e)}
            className={`rounded-full border px-2 py-0.5 text-xs ${
              entry?.me ? 'bg-black text-white' : 'bg-white'
            }`}
            title={entry?.count ? `${entry.count}` : '0'}
          >
            {e} {entry?.count ? entry.count : ''}
          </button>
        );
      })}
    </div>
  );
}
