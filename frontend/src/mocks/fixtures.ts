// Typed access to the JSON mocks. TS infers JSON imports too narrowly for a direct
// cast (e.g. Conflict.positions), so the cast happens once here.
// run_refereed.json is a copy of backend/tests/fixtures/run_refereed.json: keep in sync.

import type { Persona, Run } from '../api/types'
import personasJson from './personas.json'
import runJson from './run_refereed.json'

export const fixtureRun = runJson as unknown as Run
export const fixturePersonas = personasJson as unknown as Persona[]
