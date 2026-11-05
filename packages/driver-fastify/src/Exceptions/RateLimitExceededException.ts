import { Exception } from '@arkstack/common'

export class RateLimitExceededException extends Exception {
  statusCode: number = 429
  name: string = 'RateLimitExceededException'

  constructor(message: string = 'Too many requests, please try again later.', statusCode: number = 429) {
    super(message)
    this.statusCode = statusCode
  }
}
