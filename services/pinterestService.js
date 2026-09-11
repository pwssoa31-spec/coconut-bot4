const CRAWLER_USER_AGENT =
    'WhatsApp/2.24.6.77 A' // finge ser o crawler de preview do WhatsApp — o Pinterest
                            // libera as meta tags reais pra esse tipo de user-agent,
                            // em vez de mandar a página de login/consentimento

// Aceita link do app (pin.it/xxxx) e do site (pinterest.com/pin/xxxx ou br.pinterest.com/...)
export function isPinterestLink(text) {
    if (!text) return false
    return /(?:^|\/\/)(?:[a-z]{2}\.)?pinterest\.[a-z.]+\/|pin\.it\//i.test(text)
}

async function fetchHtml(url) {
    const response = await fetch(url, {
        redirect: 'follow',
        headers: {
            'User-Agent': CRAWLER_USER_AGENT,
            'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8'
        }
    })

    if (!response.ok) {
        throw new Error(`Pinterest respondeu com status ${response.status}`)
    }

    return { html: await response.text(), finalUrl: response.url }
}

// Pin com GIF vira, internamente, um vídeo curto (mp4) hospedado em
// v1.pinimg.com/videos/... — precisa achar esse link ANTES de procurar imagem,
// senão a gente pega só o quadro estático (thumbnail) e perde a animação.
function extractPinVideoUrl(html) {
    const match = html.match(
        /https:\\?\/\\?\/v\d?\.pinimg\.com\\?\/videos\\?\/[^\s"'\\]+\.mp4/i
    )

    return match ? match[0].replace(/\\\//g, '/') : null
}

function extractPinimgUrl(html) {
    // Procura em ordem de qualidade: original primeiro, depois as versões redimensionadas
    const sizes = ['originals', '736x', '564x', '474x', '236x']

    for (const size of sizes) {
        const regex = new RegExp(
            `https:\\\\?/\\\\?/i\\.pinimg\\.com\\\\?/${size}\\\\?/[^\\s"\\\\]+\\.(?:jpg|jpeg|png|gif)`,
            'i'
        )
        const match = html.match(regex)

        if (match) {
            return match[0].replace(/\\\//g, '/')
        }
    }

    return null
}

// Retorna { url, isVideo } — isVideo indica que é um gif/vídeo e precisa
// ser convertido como figurinha animada, não como imagem estática.
export async function resolvePinterestMedia(url) {
    let { html, finalUrl } = await fetchHtml(url)

    // Se o link curto não caiu direto numa página de pin específico, tenta
    // achar a URL real do pin escondida no HTML e busca ela também.
    if (!/\/pin\/\d+/.test(finalUrl)) {
        const canonicalMatch = html.match(
            /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i
        )

        const rawLinkMatch = html.match(
            /https:\\?\/\\?\/(?:[a-z]{2}\.)?pinterest\.[a-z.]+\\?\/pin\\?\/\d+[^\s"'\\]*/i
        )

        const realUrl =
            canonicalMatch?.[1] || rawLinkMatch?.[0]?.replace(/\\\//g, '/')

        if (realUrl && realUrl !== finalUrl) {
            ;({ html, finalUrl } = await fetchHtml(realUrl))
        }
    }

    const videoUrl = extractPinVideoUrl(html)

    if (videoUrl) {
        return { url: videoUrl, isVideo: true }
    }

    const pinimgUrl = extractPinimgUrl(html)

    if (pinimgUrl) {
        return { url: pinimgUrl, isVideo: false }
    }

    // Só aceita a og:image de fallback se for do domínio de mídia real do
    // Pinterest (i.pinimg.com) — senão é a imagem genérica de compartilhamento
    // (o gradiente rosa/laranja) e não presta pra virar figurinha.
    const ogMatch = html.match(
        /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i
    )

    if (ogMatch && /^https:\/\/i\.pinimg\.com\//i.test(ogMatch[1])) {
        return { url: ogMatch[1], isVideo: false }
    }

    return null
}

export async function downloadMedia(mediaUrl) {
    const response = await fetch(mediaUrl, {
        headers: { 'User-Agent': CRAWLER_USER_AGENT }
    })

    if (!response.ok) {
        throw new Error(`Não consegui baixar a mídia (status ${response.status})`)
    }

    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
}
