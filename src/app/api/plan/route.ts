import worker from '../../../worker'
import { getRuntimeEnv } from '../../../server/runtime'

export async function POST(request: Request) {
  return worker.fetch(request, getRuntimeEnv())
}
