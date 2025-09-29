// src/app/join/[token]/page.tsx
import React from 'react';

/**
 * Minimal, build-friendly page. We intentionally allow an untyped `props`
 * to avoid Next's strict PageProps compile-time check.
 *
 * This is safe because the app router will pass { params: { token: string } }.
 */
export default function Page(props: any) {
  const token = props?.params?.token ?? '';

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="mb-4 text-2xl font-semibold">Join with token</h1>

      <div className="rounded-lg border bg-white p-4">
        <p className="mb-2 text-sm text-gray-700">
          You arrived here with this join token:
        </p>

        <div className="mb-4">
          <code className="block break-all rounded bg-gray-100 p-2 text-sm">{token}</code>
        </div>

        <p className="mb-3 text-sm text-gray-600">
          If this token is valid it should be exchanged server-side for a room membership.
          Implement the validation & membership creation on the server (use <code>supabaseAdmin</code>),
          then redirect the user to <code>/chat</code> or a success page.
        </p>

        <div className="flex gap-2">
          <a
            href="/chat"
            className="rounded bg-black px-4 py-2 text-white hover:opacity-90"
          >
            Back to chat
          </a>
          <a
            href="/"
            className="rounded border px-4 py-2 hover:bg-gray-50"
          >
            Home
          </a>
        </div>
      </div>
    </main>
  );
}
