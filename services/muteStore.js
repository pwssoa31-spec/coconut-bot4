import fs from 'fs'
import path from 'path'

const dataDir = './data'
const filePath = path.join(dataDir, 'mutados.json')

// data[groupJid] = [ [id1, id2, ...], [id1, ...], ... ]
// cada item da lista é o conjunto de "apelidos" (id/@lid/etc) de UMA pessoa mutada

function ensureFile() {
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true })
    }

    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify({}))
    }
}

function loadFromDisk() {
    ensureFile()

    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'))
    } catch (error) {
        console.error('Erro ao ler mutados.json, iniciando vazio:', error.message)
        return {}
    }
}

// Cache em memória: lido do disco só UMA VEZ, na inicialização do bot.
// Antes, toda mensagem recebida (isMuted) disparava um readFileSync síncrono,
// o que bloqueava o event loop inteiro em grupos movimentados. Agora a leitura
// é instantânea (só olha o objeto em memória) e o disco só é tocado quando
// alguém de fato muta/desmuta (escrita), que é bem mais raro.
let cache = loadFromDisk()

function persist() {
    ensureFile()
    fs.writeFileSync(filePath, JSON.stringify(cache, null, 2))
}

export function muteUser(groupJid, identities) {
    if (!cache[groupJid]) {
        cache[groupJid] = []
    }

    // remove qualquer entrada antiga que já bata com alguma dessas identidades
    // (evita duplicar a mesma pessoa duas vezes)
    cache[groupJid] = cache[groupJid].filter(
        (ids) => !ids.some((id) => identities.includes(id))
    )

    cache[groupJid].push(identities)
    persist()
}

export function unmuteUser(groupJid, identities) {
    if (!cache[groupJid]) return

    cache[groupJid] = cache[groupJid].filter(
        (ids) => !ids.some((id) => identities.includes(id))
    )

    persist()
}

export function isMuted(groupJid, identities) {
    const entries = cache[groupJid]

    if (!entries) return false

    return entries.some((ids) =>
        ids.some((id) => identities.includes(id))
    )
}
