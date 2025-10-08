import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const { articleId } = await req.json();
  if (!articleId) {
    return new NextResponse('Missing articleId', { status: 400 });
  }

  try {
    // 1. Find which path this article belongs to and its step number
    const { data: pathArticleData, error: pathError } = await supabaseAdmin
      .from('path_articles')
      .select('path_id, step_number')
      .eq('article_id', articleId)
      .single();

    if (pathError || !pathArticleData) {
      return NextResponse.json({ message: 'Article not in a path.' });
    }

    const { path_id, step_number } = pathArticleData;

    // 2. Get the user's current progress for this path
    const { data: progressData } = await supabaseAdmin
      .from('user_progress')
      .select('completed_step')
      .eq('user_id', user.id)
      .eq('path_id', path_id)
      .single();

    const currentStep = progressData?.completed_step || 0;

    // 3. Only update if the user is completing the next sequential step
    if (step_number > currentStep) {
      const { error: upsertError } = await supabaseAdmin
        .from('user_progress')
        .upsert({
          user_id: user.id,
          path_id: path_id,
          completed_step: step_number,
        });
      
      if (upsertError) throw upsertError;

      // --- 👇 NEW: Badge Awarding Logic 👇 ---

      // 4. Check if the path is now complete
      const { count: totalSteps, error: countError } = await supabaseAdmin
        .from('path_articles')
        .select('*', { count: 'exact', head: true })
        .eq('path_id', path_id);

      if (countError) throw countError;

      if (totalSteps !== null && step_number === totalSteps) {
        // Path is complete! Find the linked badge.
        const { data: badgeToAward, error: badgeError } = await supabaseAdmin
          .from('badges')
          .select('id')
          .eq('learning_path_id', path_id)
          .single();

        if (badgeError) {
          // Log error but don't block the request if no badge is found
          console.error("Could not find badge for completed path:", badgeError.message);
        } else if (badgeToAward) {
          // 5. Award the badge to the user
          await supabaseAdmin
            .from('user_badges')
            .insert({
              user_id: user.id,
              badge_id: badgeToAward.id,
            });
        }
      }
      // --- 👆 End of New Logic 👆 ---

      return NextResponse.json({ message: 'Progress updated.' });
    }
    
    return NextResponse.json({ message: 'Step already completed.' });

  } catch (error: any) {
    console.error('Error updating learning progress:', error);
    return new NextResponse(error.message || 'Server error', { status: 500 });
  }
}