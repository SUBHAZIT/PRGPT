import * as core from '@actions/core'
import {minimatch} from 'minimatch'
import {TokenLimits} from './limits'

export class Options {
  debug: boolean
  disableReview: boolean
  disableReleaseNotes: boolean
  maxFiles: number
  reviewSimpleChanges: boolean
  reviewCommentLGTM: boolean
  pathFilters: PathFilter
  systemMessage: string
  geminiLightModel: string
  geminiHeavyModel: string
  geminiModelTemperature: number
  geminiRetries: number
  geminiTimeoutMS: number
  geminiConcurrencyLimit: number
  githubConcurrencyLimit: number
  lightTokenLimits: TokenLimits
  heavyTokenLimits: TokenLimits
  language: string

  constructor(
    debug: boolean,
    disableReview: boolean,
    disableReleaseNotes: boolean,
    maxFiles = '0',
    reviewSimpleChanges = false,
    reviewCommentLGTM = false,
    pathFilters: string[] | null = null,
    systemMessage = '',
    geminiLightModel = 'gemini-1.5-flash',
    geminiHeavyModel = 'gemini-1.5-pro',
    geminiModelTemperature = '0.7',
    geminiRetries = '3',
    geminiTimeoutMS = '120000',
    geminiConcurrencyLimit = '6',
    githubConcurrencyLimit = '6',
    language = 'en-US'
  ) {
    this.debug = debug
    this.disableReview = disableReview
    this.disableReleaseNotes = disableReleaseNotes
    this.maxFiles = parseInt(maxFiles)
    this.reviewSimpleChanges = reviewSimpleChanges
    this.reviewCommentLGTM = reviewCommentLGTM
    this.pathFilters = new PathFilter(pathFilters)
    this.systemMessage = systemMessage
    this.geminiLightModel = geminiLightModel
    this.geminiHeavyModel = geminiHeavyModel
    this.geminiModelTemperature = parseFloat(geminiModelTemperature)
    this.geminiRetries = parseInt(geminiRetries)
    this.geminiTimeoutMS = parseInt(geminiTimeoutMS)
    this.geminiConcurrencyLimit = parseInt(geminiConcurrencyLimit)
    this.githubConcurrencyLimit = parseInt(githubConcurrencyLimit)
    this.lightTokenLimits = new TokenLimits(this.geminiLightModel)
    this.heavyTokenLimits = new TokenLimits(this.geminiHeavyModel)
    this.language = language
  }

  // print all options using core.info
  print(): void {
    core.info(`debug: ${this.debug}`)
    core.info(`disable_review: ${this.disableReview}`)
    core.info(`disable_release_notes: ${this.disableReleaseNotes}`)
    core.info(`max_files: ${this.maxFiles}`)
    core.info(`review_simple_changes: ${this.reviewSimpleChanges}`)
    core.info(`review_comment_lgtm: ${this.reviewCommentLGTM}`)
    core.info(`path_filters: ${this.pathFilters}`)
    core.info(`system_message: ${this.systemMessage}`)
    core.info(`gemini_light_model: ${this.geminiLightModel}`)
    core.info(`gemini_heavy_model: ${this.geminiHeavyModel}`)
    core.info(`gemini_model_temperature: ${this.geminiModelTemperature}`)
    core.info(`gemini_retries: ${this.geminiRetries}`)
    core.info(`gemini_timeout_ms: ${this.geminiTimeoutMS}`)
    core.info(`gemini_concurrency_limit: ${this.geminiConcurrencyLimit}`)
    core.info(`github_concurrency_limit: ${this.githubConcurrencyLimit}`)
    core.info(`summary_token_limits: ${this.lightTokenLimits.string()}`)
    core.info(`review_token_limits: ${this.heavyTokenLimits.string()}`)
    core.info(`language: ${this.language}`)
  }

  checkPath(path: string): boolean {
    const ok = this.pathFilters.check(path)
    core.info(`checking path: ${path} => ${ok}`)
    return ok
  }
}

export class PathFilter {
  private readonly rules: Array<[string /* rule */, boolean /* exclude */]>

  constructor(rules: string[] | null = null) {
    this.rules = []
    if (rules != null) {
      for (const rule of rules) {
        const trimmed = rule?.trim()
        if (trimmed) {
          if (trimmed.startsWith('!')) {
            this.rules.push([trimmed.substring(1).trim(), true])
          } else {
            this.rules.push([trimmed, false])
          }
        }
      }
    }
  }

  check(path: string): boolean {
    if (this.rules.length === 0) {
      return true
    }

    let included = false
    let excluded = false
    let inclusionRuleExists = false

    for (const [rule, exclude] of this.rules) {
      if (minimatch(path, rule)) {
        if (exclude) {
          excluded = true
        } else {
          included = true
        }
      }
      if (!exclude) {
        inclusionRuleExists = true
      }
    }

    return (!inclusionRuleExists || included) && !excluded
  }
}

export class GeminiOptions {
  model: string
  tokenLimits: TokenLimits

  constructor(model = 'gemini-1.5-flash', tokenLimits: TokenLimits | null = null) {
    this.model = model
    if (tokenLimits != null) {
      this.tokenLimits = tokenLimits
    } else {
      this.tokenLimits = new TokenLimits(model)
    }
  }
}
