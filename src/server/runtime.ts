import { getCloudflareContext } from '@opennextjs/cloudflare'
import type { Env } from '../worker'

export function getRuntimeEnv(): Env {
  try {
    return getCloudflareContext().env as unknown as Env
  } catch {
    return process.env as Env
  }
}
