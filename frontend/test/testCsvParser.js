import { parseCsv } from '../src/utils/csvParser.js'

const sampleCsv = `,Score,Protein1,Protein2,AbsPos1,AbsPos2
0,0.198122208,P48088,P00320,515,26
1,0.170233281,P48088,P00320,515,26
2,0.210247407,P00316,P48088,6,500
3,0.212496604,P00316,P48088,6,500
4,0.219251173,A0A097PB89,P48080,480,374
`

const result = parseCsv(sampleCsv)
console.log('Parsed CSV:')
console.log(JSON.stringify(result, null, 2))