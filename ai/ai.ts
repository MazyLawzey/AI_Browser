import ollama from 'ollama'
import * as dotenv from 'dotenv'
dotenv.config()

const MODEL = process.env.OLLAMA_MODEL ?? 'spotice'

const SYSTEM_PROMPT = `Ты помощник. Отвечай коротко и по делу — только ответ, без вступлений, объяснений и лишних слов. Только вариант ответа, больше ничего. Если ты сомневаешься, просто скажи "не знаю".`

export async function* generateResponseStream(prompt: string): AsyncGenerator<string> {
  const stream = await ollama.chat({
    model: MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ],
    stream: true,
  })

  for await (const chunk of stream) {
    const text = chunk.message.content
    if (text) yield text
  }
}