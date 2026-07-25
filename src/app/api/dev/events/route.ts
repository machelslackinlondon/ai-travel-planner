import worker from '../../../../worker'
import { getRuntimeEnv } from '../../../../server/runtime'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  return worker.fetch(request, getRuntimeEnv())
}
