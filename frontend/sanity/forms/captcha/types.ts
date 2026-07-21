export type CaptchaResult = {success: boolean; score?: number}

export interface CaptchaProvider {
  readonly name: string
  verify(token: string, remoteIp?: string): Promise<CaptchaResult>
}
