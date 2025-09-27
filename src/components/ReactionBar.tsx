'use client';

type ReactionsForMessage = Record<string, { count: number; me: boolean }>;

const EMOJIS = ['👍', '❤️', '🎉', '🚀', '🙏'];

export default function ReactionBar({
  reactions,
  onToggle,
}: {
  reactions: ReactionsForMessage | undefined;
  onToggle: (emoji: string) => void;
}) {
  return (
    <div className="mt-1 flex flex-wrap gap-2">
      {EMOJIS.map((e) => {
        const info = reactions?.[e];
        const count = info?.count ?? 0;
        const mine = info?.me ?? false;
        return (
          <button
            key={e}
            type="button"
            onClick={() => onToggle(e)}
            className={`rounded-full border px-2 py-0.5 text-sm leading-6 ${
              mine ? 'border-black bg-black text-white' : 'border-gray-300 hover:bg-gray-50'
            }`}
            title={mine ? 'Remove reaction' : 'Add reaction'}
          >
            {e} {count > 0 ? count : ''}
          </button>
        );
      })}
    </div>
  );
}
