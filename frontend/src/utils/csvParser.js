export function parseCsv(text) {
    const lines = text.trim().split(/\r?\n/)
    if (lines.length < 2) return []

    let headers = lines[0].split(',').map(h => h.trim())

    // Correction : si première colonne vide, on la nomme "index"
    if (headers[0] === '') {
        headers[0] = 'index'
    }

    const data = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim())
        const obj = {}
        headers.forEach((header, i) => {
            if (['score'].includes(header)) {
                obj[header] = parseFloat(values[i])
            } else if (['index', 'absolute_position1', 'absolute_position2'].includes(header)) {
                obj[header] = parseInt(values[i], 10)
            } else {
                obj[header] = values[i]
            }
        })
        return obj
    })

    return data
}
