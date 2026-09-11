import makeWASocket, {
    useMultiFileAuthState,
    makeCacheableSignalKeyStore,
    DisconnectReason,
    fetchLatestBaileysVersion,
    Browsers
} from '@whiskeysockets/baileys'

import readline from 'readline'
import pino from 'pino'
import fs from 'fs'
import express from 'express' // 👈 1. IMPORTAR O EXPRESS AQUI

import stickerCmd from './comandos/sticker.js'
import brincadeirasCmd from './comandos/brincadeiras.js'
import menuCmd from './comandos/menu.js'
import muteCmd from './comandos/mute.js'
import unmuteCmd from './comandos/unmute.js'
import banCmd from './comandos/ban.js'
import pinterestCmd from './comandos/pinterest.js'
import { isMuted } from './services/muteStore.js'
import { getSenderIdentities } from './services/groupUtils.js'

// 👈 2. CONFIGURAR O SERVIDOR HTTP DO EXPRESS AQUI
const app = express()
const port = process.env.PORT || 3000

// Rota padrão para o UptimeRobot ficar acessando
app.get('/', (req, res) => {
    res.send('Bot Online e Acordado! 🥥')
})

// Inicia o servidor na porta do Render
app.listen(port, () => {
    console.log(`💻 Servidor Web HTTP rodando na porta ${port}`)
})

// Garante que as pastas necessárias existam antes de iniciar
for (const dir of ['./temp', './auth_info_baileys']) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
    }
}

// Lista de comandos num Map só (nome + aliases apontando pro mesmo comando).
// Adicionar um comando novo agora é só: importar o arquivo e colocar aqui embaixo.
const commandModules = [
    stickerCmd,
    menuCmd,
    muteCmd,
    unmuteCmd,
    banCmd,
    pinterestCmd
]

const commands = new Map()

for (const cmd of commandModules) {
    commands.set(cmd.name, cmd)
    for (const alias of cmd.aliases || []) {
        commands.set(alias, cmd)
    }
}

const brincadeirasAliases = new Set(brincadeirasCmd.aliases)

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
})

function question(text) {
    return new Promise((resolve) => rl.question(text, resolve))
}

let pairingRequested = false

async function connectToWhatsApp() {
    const { state, saveCreds } =
        await useMultiFileAuthState('./auth_info_baileys')

    const { version } = await fetchLatestBaileysVersion()

    const logger = pino({ level: 'silent' })

    const client = makeWASocket({
        // makeCacheableSignalKeyStore evita que toda mensagem recebida dispare
        // leitura/escrita direta no arquivo da sessão. Sem isso, se o bot fica
        // offline e volta com várias mensagens acumuladas chegando de uma vez,
        // as chaves de sessão podem se corromper (erro "Bad MAC"/sessão inválida),
        // e aí só resolvia apagando ./auth_info_baileys e parenado de novo.
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, logger)
        },
        version,
        logger,
        printQRInTerminal: false,
        browser: Browsers.ubuntu('Chrome')
    })

    client.ev.on('creds.update', saveCreds)

    if (!state.creds.registered && !pairingRequested) {
        pairingRequested = true

        const phoneNumber = await question(
            '📱 Digite seu número (Ex: 55839XXXXXXXX): '
        )

        const formattedNumber = phoneNumber.replace(/\D/g, '')

        try {
            const code = await client.requestPairingCode(formattedNumber)

            console.log('\n🥥 PAIRING CODE:')
            console.log(code)
            console.log('⏱️  Insira esse código AGORA no WhatsApp (ele expira rápido). Não feche nem rode o bot de novo enquanto isso.')
        } catch (error) {
            console.log('❌ Erro ao gerar pairing:', error.message)
            pairingRequested = false
        }
    }

    client.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
        if (connection === 'open') {
            console.log('✅ Conectado ao WhatsApp! 🥥')
        }

        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode
            console.log(`🔌 Conexão fechada. Código: ${statusCode} — ${lastDisconnect?.error?.message || 'sem detalhes'}`)

            const shouldReconnect = statusCode !== DisconnectReason.loggedOut

            if (statusCode === DisconnectReason.loggedOut) {
                pairingRequested = false
                console.log('🚪 Sessão encerrada. Apague ./auth_info_baileys e gere um novo pairing code.')
                return
            }

            if (shouldReconnect) {
                console.log(
                    state.creds.registered
                        ? '♻️ Reconectando...'
                        : '♻️ Reconexão automática durante o pareamento, aguardando...'
                )
                setTimeout(connectToWhatsApp, 5000)
            }
        }
    })

    // Processa UMA mensagem (chamado pra cada item do lote recebido).
    async function handleMessage(message) {
        if (!message?.message) return

        const Jid = message.key.remoteJid
        const isGroup = Jid.endsWith('@g.us')
        const isFromBotOwner = message.key.fromMe

        // Se a mensagem é de alguém mutado, apaga na hora e nem processa
        // como comando. Mensagens mandadas pelo próprio dono do bot nunca
        // são apagadas nem checadas aqui.
        if (!isFromBotOwner && isGroup && isMuted(Jid, getSenderIdentities(message))) {
            for (let attempt = 1; attempt <= 3; attempt++) {
                try {
                    await client.sendMessage(Jid, { delete: message.key })
                    break
                } catch (error) {
                    console.error(`Tentativa ${attempt} de apagar msg de mutado falhou:`, error.message)
                }
            }
            return
        }

        // Mensagens de outras pessoas (que não o dono) continuam indo
        // pro roteamento de comando normalmente daqui pra baixo

        const body =
            message.message.conversation ||
            message.message.extendedTextMessage?.text ||
            message.message.imageMessage?.caption ||
            message.message.videoMessage?.caption ||
            ''

        const isCommand = body.startsWith('/')

        if (!isCommand) return

        const args = body.trim().slice(1).split(/\s+/)
        const commandName = args.shift()?.toLowerCase()

        if (!commandName) return

        const command = commands.get(commandName)

        if (command) {
            await command.execute(client, message, args)
            return
        }

        if (brincadeirasAliases.has(commandName)) {
            await brincadeirasCmd.execute(client, message, args, commandName)
        }
    }

    client.ev.on('messages.upsert', async ({ messages }) => {
        // ANTES: só `messages[0]` era processada. Quando a pessoa mutada
        // mandava várias mensagens de uma vez (chegam juntas no mesmo lote
        // do WhatsApp), só a primeira era vista/apagada — as outras ficavam
        // paradas no grupo. Agora processa TODAS as mensagens do lote, uma
        // por uma, cada uma com seu próprio try/catch pra um erro numa não
        // travar o processamento das outras.
        for (const message of messages || []) {
            try {
                await handleMessage(message)
            } catch (error) {
                console.error('Erro:', error.message)
            }
        }
    })
}

connectToWhatsApp()
