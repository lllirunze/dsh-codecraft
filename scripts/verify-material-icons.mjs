import { verifyMaterialIcons } from './material-icons.mjs'

const result = await verifyMaterialIcons()
console.log(`verified Material Icon Theme ${result.version}: ${result.icons} icons`)
