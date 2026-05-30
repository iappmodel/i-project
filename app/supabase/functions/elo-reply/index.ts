import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EloReplyRequest {
  userText: string
  roomLabel: string
  relationshipMode: string
  primaryPreset?: string
  proofConnected: boolean
  recentMessages?: { role: 'user' | 'assistant'; content: string }[]
}

const BYPASS_PROOF =
  /\b(bypass|skip|fake|forge|cheat|hack)\b.*\b(proof|pop|pops|verify|verification|reward|session)\b/i
const REWARD_MANIPULATION = /\b(give me|grant|award|credit)\b.*\b(reward|coin|acoin|icoin|payout)\b/i

function evaluateDoctrineInput(userText: string): string | null {
  const lower = userText.trim().toLowerCase()
  if (!lower) return null
  if (BYPASS_PROOF.test(lower) || REWARD_MANIPULATION.test(lower)) {
    return 'I cannot bypass POP or proof gates — rewards only flow through verified attention. I can help you finish a verified watch the right way.'
  }
  return null
}

function buildSystemPrompt(input: EloReplyRequest): string {
  return [
    'You are ELO — Emotional Logic Operator — the user\'s private intelligence companion inside [ i ].',
    'You are present, warm, and concise (2–4 sentences). Not a generic chatbot; a companion beside their immersive feed.',
    `Relationship mode: ${input.relationshipMode}. Presence room: ${input.roomLabel}.`,
    input.primaryPreset ? `Personality preset: ${input.primaryPreset}.` : '',
    input.proofConnected
      ? 'POP proof is live for this session — you may reference verified attention paths.'
      : 'Proof is offline — do not claim verified rewards; stay supportive beside what they watch.',
    'NEVER: bypass POP/proof gates, promise rewards without verification, claim 100% certainty about inner attention, impersonate a human literally.',
    'You may guide wallet, trust, watch, and creator decisions using platform context the user provides.',
  ]
    .filter(Boolean)
    .join('\n')
}

async function callFoundationModel(
  input: EloReplyRequest,
  apiKey: string,
): Promise<string> {
  const model = Deno.env.get('ELO_MODEL') ?? 'gpt-4o-mini'
  const history = (input.recentMessages ?? []).slice(-6).map((m) => ({
    role: m.role,
    content: m.content.slice(0, 800),
  }))

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: buildSystemPrompt(input) },
        ...history,
        { role: 'user', content: input.userText.slice(0, 1200) },
      ],
      max_tokens: 280,
      temperature: 0.65,
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Foundation model error: ${res.status} ${errText.slice(0, 200)}`)
  }

  const json = await res.json()
  const reply = json?.choices?.[0]?.message?.content?.trim()
  if (!reply) throw new Error('Empty foundation model reply')
  return reply
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const body = (await req.json()) as EloReplyRequest
    const userText = body.userText?.trim() ?? ''

    if (!userText) {
      return new Response(JSON.stringify({ success: false, error: 'userText required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const doctrineBlock = evaluateDoctrineInput(userText)
    if (doctrineBlock) {
      return new Response(
        JSON.stringify({ success: true, reply: doctrineBlock, source: 'doctrine', orbState: 'blocked' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const apiKey = Deno.env.get('OPENAI_API_KEY')?.trim()
    if (!apiKey) {
      return new Response(JSON.stringify({ success: false, useLocal: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const reply = await callFoundationModel(body, apiKey)
    return new Response(
      JSON.stringify({ success: true, reply, source: 'foundation', orbState: 'hasInsight' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return new Response(JSON.stringify({ success: false, useLocal: true, error: message }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
