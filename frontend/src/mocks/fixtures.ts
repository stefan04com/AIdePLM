// Typed access to the JSON mocks. TS infers JSON imports too narrowly for a direct
// cast (e.g. Conflict.positions), so the cast happens once here.
// run_refereed.json has the same shape as backend/tests/fixtures/run_refereed.json, with the
// Boabe cozy-autumn demo scenario (docs/demo-scenario.md, data/) as content.
// personas.json matches its persona ids.

import type { Persona, Run } from '../api/types'
import personasJson from './personas.json'
import runJson from './run_refereed.json'

export const fixtureRun = runJson as unknown as Run
export const fixturePersonas = personasJson as unknown as Persona[]
