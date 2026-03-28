import {info, setFailed, warning} from '@actions/core'
import {
  GoogleGenerativeAI,
  GenerativeModel,
  ChatSession,
  Content,
  Part
} from '@google/generative-ai'
import pRetry from 'p-retry'
import {GeminiOptions, Options} from './options'

// define type to save state if needed, though Gemini manages history
export interface Ids {
  parentMessageId?: string
  conversationId?: string
}

export class Bot {
  private readonly api: GoogleGenerativeAI
  private readonly model: GenerativeModel
  private readonly options: Options
  private readonly geminiOptions: GeminiOptions
  private readonly chatSessions: Map<string, ChatSession> = new Map()

  constructor(options: Options, geminiOptions: GeminiOptions) {
    this.options = options
    this.geminiOptions = geminiOptions
    const apiKey = process.env.GEMINI_API_KEY
    if (apiKey) {
      this.api = new GoogleGenerativeAI(apiKey)
      const currentDate = new Date().toISOString().split('T')[0]
      const systemMessage = `${options.systemMessage} 
Knowledge cutoff: ${geminiOptions.tokenLimits.knowledgeCutOff}
Current date: ${currentDate}

IMPORTANT: Entire response must be in the language with ISO code: ${options.language}
`
      this.model = this.api.getGenerativeModel({
        model: geminiOptions.model,
        systemInstruction: systemMessage,
        generationConfig: {
          temperature: options.geminiModelTemperature,
          maxOutputTokens: geminiOptions.tokenLimits.responseTokens
        }
      })
    } else {
      const err =
        "Unable to initialize the Gemini API, 'GEMINI_API_KEY' environment variable is not available"
      throw new Error(err)
    }
  }

  chat = async (message: string, ids: Ids): Promise<[string, Ids]> => {
    let res: [string, Ids] = ['', {}]
    try {
      res = await this.chat_(message, ids)
      return res
    } catch (e: any) {
      warning(`Failed to chat: ${e}, backtrace: ${e.stack}`)
      return res
    }
  }

  private readonly chat_ = async (
    message: string,
    ids: Ids
  ): Promise<[string, Ids]> => {
    // record timing
    const start = Date.now()
    if (!message) {
      return ['', {}]
    }

    let responseText = ''

    try {
      // Use conversationId as a key for chat session if available
      const sessionKey = ids.conversationId || 'default'
      let chatSession = this.chatSessions.get(sessionKey)
      if (!chatSession) {
        chatSession = this.model.startChat()
        this.chatSessions.set(sessionKey, chatSession)
      }

      const result = await pRetry(
        async () => {
          const res = await chatSession!.sendMessage(message)
          return res.response
        },
        {
          retries: this.options.geminiRetries
        }
      )

      responseText = result.text()
    } catch (e: any) {
      info(`failed to send message to gemini: ${e}, backtrace: ${e.stack}`)
    }

    const end = Date.now()
    info(`gemini sendMessage (including retries) response time: ${end - start} ms`)

    if (responseText === '') {
      warning('gemini response is empty')
    }

    // remove the prefix "with " in the response (behavior from previous bot)
    if (responseText.startsWith('with ')) {
      responseText = responseText.substring(5)
    }

    if (this.options.debug) {
      info(`gemini responses: ${responseText}`)
    }

    // We don't have separate IDs like chatgpt library, so we'll just return a random ID for now or re-use conversationId
    const newIds: Ids = {
      parentMessageId: Math.random().toString(36).substring(7),
      conversationId: ids.conversationId || Math.random().toString(36).substring(7)
    }
    return [responseText, newIds]
  }
}
