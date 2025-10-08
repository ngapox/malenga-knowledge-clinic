import { createSupabaseServerClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

async function validateAndJoin(token: string) {
  // 1. Get the current logged-in user
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // If no user is logged in, redirect them to sign-in.
    // After they sign in, they'll be sent back to this join link to complete the process.
    return redirect(`/auth?redirect=/join/${token}`);
  }

  // 2. Use the admin client to find a valid invite token
  const { data: invite } = await supabaseAdmin
    .from('room_invites')
    .select('room_id, expires_at')
    .eq('token', token)
    .single();

  // 3. Check if the invite is invalid or has expired
  if (!invite || (invite.expires_at && new Date(invite.expires_at) < new Date())) {
    return { success: false, message: 'This invite link is invalid or has expired.' };
  }

  // 4. Add the user to the room_members table
  const { error: insertError } = await supabaseAdmin
    .from('room_members')
    .insert({
      room_id: invite.room_id,
      user_id: user.id,
    })
    .select()
    .single();

  // Handle cases where the user is already a member (which is not an error)
  if (insertError && insertError.code !== '23505') { // '23505' is the code for a duplicate entry
    return { success: false, message: `An error occurred: ${insertError.message}` };
  }

  // 5. If successful (or if they were already a member), redirect to the chat page
  return redirect('/chat');
}

export default async function JoinPage({ params }: { params: { token: string } }) {
  const result = await validateAndJoin(params.token);

  // This part of the page will only be displayed if the process fails and the user isn't redirected.
  return (
    <main className="mx-auto max-w-md p-6 pt-24">
      <Card>
        <CardHeader>
          <CardTitle>Join Room Failed</CardTitle>
          <CardDescription>There was a problem with your invite link.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-destructive">{result.message}</p>
          <Link href="/chat">
            <Button className="w-full">Go to Chat</Button>
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}