import { readDependencyState, synchronizeMaterialIcons } from './material-icons.mjs'

const state = await readDependencyState()
const result = await synchronizeMaterialIcons(state)
console.log(`synchronized Material Icon Theme ${state.version}: ${Object.keys(result.iconFiles).length} mappings`)
