import { supabaseAdmin } from '../../lib/supabaseAdmin'
import axios from 'axios'

function getCurrentMonth() {
  return new Date().toISOString().slice(0, 7)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const authHeader = req.headers.authorization

    if (!authHeader) {
      return res.status(401).json({ error: 'Missing login token.' })
    }

    const token = authHeader.replace('Bearer ', '')

    const {
      data: { user },
      error: userError
    } = await supabaseAdmin.auth.getUser(token)

    if (userError || !user) {
      return res.status(401).json({ error: 'Invalid login. Please log in again.' })
    }

    const { tool, profileText, topic, niche, platform } = req.body
    const month = getCurrentMonth()

    let { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!profile) {
      const { data: newProfile, error: insertError } = await supabaseAdmin
        .from('user_profiles')
        .insert({
          user_id: user.id,
          email: user.email,
          used_this_month: 0,
          usage_month: month,
          is_paid: false
        })
        .select()
        .single()

      if (insertError) {
        return res.status(500).json({ error: insertError.message })
      }

      profile = newProfile
    }

    if (profile.usage_month !== month) {
      const { data: resetProfile, error: resetError } = await supabaseAdmin
        .from('user_profiles')
        .update({
          used_this_month: 0,
          usage_month: month
        })
        .eq('user_id', user.id)
        .select()
        .single()

      if (resetError) {
        return res.status(500).json({ error: resetError.message })
      }

      profile = resetProfile
    }

    if (!profile.is_paid && profile.used_this_month >= 7) {
      return res.status(403).json({
        error: 'You used all 7 free generations this month. Please upgrade for unlimited access.'
      })
    }

    const trimmedProfileText = (profileText || '').slice(0, 4000)
    const trimmedTopic = (topic || '').slice(0, 250)
    const trimmedNiche = (niche || '').slice(0, 120)
    const trimmedPlatform = (platform || '').slice(0, 50)

    let prompt = ''

    if (tool === 'linkedin') {
      if (!trimmedProfileText) {
        return res.status(400).json({ error: 'Profile text is required.' })
      }

      prompt = `
You are an expert LinkedIn profile strategist.

Improve this LinkedIn profile text so it sounds professional, confident, and attractive to recruiters, clients, or business partners.

Return the answer in this format:

1. Strong LinkedIn headline options
2. Improved About section
3. Keyword and skill suggestions
4. Specific improvements made
5. Short call-to-action suggestion

Make it polished, credible, and easy to copy.

Profile text:
${trimmedProfileText}
`
    } else if (tool === 'content') {
      if (!trimmedTopic || !trimmedPlatform || !trimmedNiche) {
        return res.status(400).json({ error: 'Topic, platform, and niche are required.' })
      }

      prompt = `
You are an expert content strategist.

Create content for:

Business/Niche: ${trimmedNiche}
Platform: ${trimmedPlatform}
Topic: ${trimmedTopic}

Return 3 strong content options.

Rules:
- Make the content specific, useful, and ready to post.
- Make it sound natural and engaging.
- Avoid generic filler.
- Include hooks.
- Include captions where useful.
- Include calls-to-action.
- Include hashtags for Instagram and TikTok.
- For LinkedIn, make it professional and thoughtful.
- For email, include subject line, preview text, and body.
- For blog, include SEO title, outline, and meta description.

Format clearly with labels.
`
    } else {
      return res.status(400).json({ error: 'Invalid tool selected.' })
    }

    const model = profile.is_paid
      ? 'claude-3-5-sonnet-20241022'
      : 'claude-3-haiku-20240307'

    const maxTokens = profile.is_paid ? 1500 : 900

    const aiResponse = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model,
        max_tokens: maxTokens,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      },
      {
        headers: {
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        }
      }
    )

    const result = aiResponse.data.content[0].text

    let newUsed = profile.used_this_month

    if (!profile.is_paid) {
      newUsed = profile.used_this_month + 1

      await supabaseAdmin
        .from('user_profiles')
        .update({
          used_this_month: newUsed
        })
        .eq('user_id', user.id)
    }

    await supabaseAdmin.from('generations').insert({
      user_id: user.id,
      tool,
      input_data: req.body,
      output_text: result
    })

    return res.status(200).json({
      result,
      usage: {
        used: newUsed,
        limit: profile.is_paid ? 'unlimited' : 7,
        isPaid: profile.is_paid
      }
    })
  } catch (error) {
    console.error(error.response?.data || error.message)

    return res.status(500).json({
      error:
        error.response?.data?.error?.message ||
        error.message ||
        'Server error.'
    })
  }
}
