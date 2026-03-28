export class TokenLimits {
  maxTokens: number
  requestTokens: number
  responseTokens: number
  knowledgeCutOff: string

  constructor(model = 'gemini-1.5-flash') {
    this.knowledgeCutOff = '2023-11-01'
    if (model.includes('gemini-1.5-pro')) {
      this.maxTokens = 2000000
      this.responseTokens = 8000
    } else if (model.includes('gemini-1.5-flash')) {
      this.maxTokens = 1000000
      this.responseTokens = 4000
    } else if (model === 'gpt-4-32k') {
      this.maxTokens = 32600
      this.responseTokens = 4000
    } else if (model === 'gpt-3.5-turbo-16k') {
      this.maxTokens = 16300
      this.responseTokens = 3000
    } else if (model === 'gpt-4') {
      this.maxTokens = 8000
      this.responseTokens = 2000
    } else {
      this.maxTokens = 4000
      this.responseTokens = 1000
    }
    // provide some margin for the request tokens
    this.requestTokens = this.maxTokens - this.responseTokens - 100
  }

  string(): string {
    return `max_tokens=${this.maxTokens}, request_tokens=${this.requestTokens}, response_tokens=${this.responseTokens}`
  }
}
