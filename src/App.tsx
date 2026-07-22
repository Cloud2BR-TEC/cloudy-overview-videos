import { useRef, useState } from 'react'
import './App.css'
import CloudyAvatar from './CloudyAvatar'

type Repository = {
  fullName: string
  description: string
  topics: string[]
  language: string | null
  defaultBranch: string
  license: string
  stars: number
  openIssues: number
  readme: string
  assets: string[]
}
type Scene = {
  id: number
  section: number
  slideInSection: number
  title: string
  duration: number
  narration: string
  visual: string
  bullets: string[]
  asset: string | null
  assets: string[]
  assetLabel: string
}
type WorkflowStep = 'source' | 'story' | 'voice' | 'export'

const starterRepository = 'https://github.com/Cloud2BR-TEC/ai-academy-101-ml'
const SLIDES_PER_SECTION = 10
const TEMPLATE_SLIDE_SECONDS = 12
const TARGET_NARRATION_WORDS = 26
const VOICE_RATE = 1.25
const BASE_NARRATION_WORDS_PER_MINUTE = 130
const SLIDE_FOCUS: Record<string, string> = {
  Overview: 'Begin with the central idea and the context needed to understand the repository.',
  Purpose: 'Clarify the problem this work is intended to address and why that goal matters.',
  Audience: 'Identify who can benefit from the material and what background will help them begin.',
  'Repository context': 'Place the project within its documented subject area and intended learning path.',
  'Main topic': 'Narrow the discussion to the primary concept supported by the repository evidence.',
  Technology: 'Connect the documented goal to the main language, platform, or technical approach in use.',
  'Project scope': 'Define what the repository covers while keeping expectations within its documented boundaries.',
  'Documentation map': 'Show where the documentation provides orientation, instructions, and supporting detail.',
  'Source visuals': 'Use the selected visual as evidence while the narration explains its broader significance.',
  'Repository recap': 'Summarize the repository introduction without repeating the earlier slide details.',
  'Learning goals': 'State the practical understanding a learner should build from the documented material.',
  'Core concepts': 'Separate the foundational ideas that support the rest of the learning sequence.',
  'Key features': 'Highlight the documented capabilities that most directly support the project purpose.',
  'Important terminology': 'Call attention to terms learners should recognize before following later explanations.',
  'Expected outcomes': 'Describe the documented result learners should be prepared to demonstrate or explain.',
  'Knowledge map': 'Connect related ideas so the learning sequence reads as one coherent path.',
  'Repository highlights': 'Select the strongest documented signals instead of repeating the full overview.',
  'Documentation signals': 'Explain what headings, examples, and instructions reveal about the project priorities.',
  'Practical context': 'Relate the documented concepts to the kind of task they are meant to support.',
  'Learning recap': 'Consolidate the learning goals into a distinct checkpoint before the project tour.',
  'Project structure': 'Orient the viewer to how the documented parts of the project fit together.',
  Architecture: 'Focus on relationships between components rather than repeating their individual names.',
  'Main components': 'Distinguish the primary building blocks and the responsibility each one carries.',
  Configuration: 'Explain the role of settings and environment choices in preparing the project.',
  Dependencies: 'Identify the supporting tools or packages the documented workflow relies upon.',
  'Setup path': 'Present preparation as an ordered path from prerequisites to a usable environment.',
  Documentation: 'Treat the documentation as an operational reference for completing the project successfully.',
  'Repository assets': 'Explain how examples and visual resources support understanding beyond the source text.',
  'Project workflow': 'Trace how documented project activities move from input through an observable result.',
  'Project recap': 'Close the project tour by connecting structure, setup, and workflow into one view.',
  'Getting started': 'Turn the documented prerequisites into a clear first action for the viewer.',
  'First step': 'Isolate the earliest meaningful task instead of summarizing the entire workflow again.',
  'Core workflow': 'Concentrate on the repeatable sequence that moves the project toward its outcome.',
  'Example path': 'Use the documented example as a route through the process, not as a second overview.',
  'Using the project': 'Shift from preparation to the actions a user performs with the project.',
  'Checking results': 'Explain how the documented outcome can be observed, reviewed, or validated.',
  'Common sequence': 'Reinforce the normal order of operations while avoiding earlier setup details.',
  'Source reference': 'Point to the source material that supports decisions during hands-on work.',
  'Practical outcome': 'Focus on the concrete result the documented workflow is designed to produce.',
  'Practice recap': 'Summarize the hands-on sequence as a checkpoint before discussing next steps.',
  Review: 'Revisit the most important documented idea from a final, outcome-oriented perspective.',
  'Key takeaway': 'Reduce the repository evidence to one durable lesson the viewer should retain.',
  'Further reading': 'Direct attention to documentation that can extend understanding after this presentation.',
  'Related resources': 'Distinguish supporting resources from the core material already covered.',
  'Open issues': 'Frame unresolved repository work as an opportunity for investigation or contribution.',
  Contributing: 'Explain how the repository documentation invites useful participation and responsible changes.',
  'Next experiment': 'Turn the documented concepts into a focused follow-up activity for continued practice.',
  'Repository reference': 'Position the repository as the authoritative place to revisit implementation details.',
  'Suggested next step': 'Offer one forward action that follows naturally from the documented learning path.',
  'Final recap': 'Close by connecting the project purpose, practical path, and next learning opportunity.',
}

function wordsToSeconds(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean).length
  return Math.min(15, Math.max(10, Math.round((words / (BASE_NARRATION_WORDS_PER_MINUTE * VOICE_RATE)) * 60)))
}
function limitWords(text: string, maxWords: number) {
  return text.trim().split(/\s+/).slice(0, maxWords).join(' ')
}
function cleanSlideTitle(value: string) {
  return value.replace(/^\s*#+\s*/, '')
}
function contentWords(value: string) {
  const ignored = new Set(['about', 'after', 'before', 'from', 'into', 'repository', 'slide', 'source', 'that', 'their', 'this', 'through', 'using', 'visual', 'with', 'your'])
  const domainTerms = new Set(['ai', 'api', 'cd', 'ci', 'ml', 'ui', 'ux'])
  return new Set(value.toLowerCase().match(/[a-z0-9]+/g)?.filter((word) => (word.length > 3 || domainTerms.has(word)) && !ignored.has(word)) ?? [])
}
function normalizedSentence(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}
function topicOverlap(value: string, topic: string) {
  const valueWords = contentWords(value)
  const topicWords = contentWords(topic)
  if (!valueWords.size || !topicWords.size) return 0
  return Array.from(topicWords).filter((word) => valueWords.has(word)).length / topicWords.size
}
function extractBullets(narration: string): string[] {
  const seen = new Set<string>()
  return narration
    .replace(/([.!?])\s+/g, '$1\n')
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s.length > 18 && s.length < 170)
    .filter((sentence) => {
      const key = normalizedSentence(sentence)
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, 4)
    .map((s) => {
      const words = s.split(/\s+/)
      return words.length > 15 ? words.slice(0, 15).join(' ') + '\u2026' : s
    })
}

const STARTER_NARRATIONS = [
  'Welcome to this repository. Cloudy is your guide through everything you need to know about this project. This presentation will walk you through the goals and objectives, help you understand the intended audience, and clarify what outcomes you can expect. Whether you are a beginner just getting started or an experienced developer looking to expand your skills, this material has been organized to be accessible and practical. By the time Cloudy finishes, you will have a solid overview of the project and a clear sense of what comes next in your learning journey. Let us begin.',
  'In this section Cloudy explains what problem this project is designed to solve and what skills you will gain. The learning goals are carefully connected to real-world outcomes described throughout the documentation. You will understand the core concepts, the architecture decisions behind the design, and the practical knowledge needed to apply what you learn here. Cloudy has reviewed all available documentation and organized the most important points so you can absorb the material at your own pace and revisit any section whenever you need a refresher.',
  'Explore the project structure with Cloudy as your guide. This section tours the key folders and files, highlights the practical exercises and code examples provided, and identifies the supporting resources that accompany the main content. Understanding how the repository is organized will help you navigate it confidently and find exactly what you need. Cloudy will point out the most important files and explain what role each part of the project plays in the overall learning experience.',
  'Now it is time to put things into practice. Follow the recommended sequence of steps and complete the hands-on exercises provided. Each exercise has been designed to reinforce a specific concept covered earlier in the presentation. Work through each step carefully, check your results against the expected outcomes, and use the documentation as your reference. Producing one concrete, shareable outcome by the end of this section will demonstrate everything you have learned and give you a strong foundation to build on.',
  'Well done for reaching this final section. Cloudy recaps the learning path you have followed, highlights the key insights from each section, and points you toward the next relevant resource for continued growth. The repository contains additional references, open issues you can contribute to, and links to related projects in the same topic area. Keep exploring, keep building, and remember that every step forward in your learning is a valuable investment in your future as a developer.',
]
const starterScenes: Scene[] = STARTER_NARRATIONS.map((narration, index) => ({
  id: index + 1,
  section: index + 1,
  slideInSection: 1,
  title: ['Welcome to the repository', 'What you will learn', 'Explore the project', 'Put it into practice', 'Keep learning'][index],
  duration: wordsToSeconds(narration),
  narration,
  visual: ['Repository cover and Cloudy host', 'README highlights and course map', 'Annotated repository tree', 'Workflow steps and source imagery', 'Next steps card'][index],
  bullets: extractBullets(narration),
  asset: null,
  assets: [],
  assetLabel: 'No repository visual selected',
}))

function parseRepositoryUrl(value: string) {
  try {
    const url = new URL(value.trim())
    const segments = url.pathname.replace(/^\/+|\/+$/g, '').split('/')
    return url.hostname === 'github.com' && segments.length === 2 && segments[0] && segments[1] ? { owner: segments[0], repo: segments[1].replace(/\.git$/, '') } : null
  } catch {
    return null
  }
}

function durationLabel(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}
function timestamp(seconds: number) {
  return `00:${durationLabel(seconds)}.000`
}
function decodeBase64(value: string) {
  return new TextDecoder().decode(Uint8Array.from(atob(value.replace(/\s/g, '')), (character) => character.charCodeAt(0)))
}
function isIllustrativeImage(url: string) {
  const normalized = decodeURIComponent(url).toLowerCase()
  return (
    /\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i.test(normalized) &&
    !/(^|[/_-])(badge|button|counter|status|views?|build|coverage|license|logo|icon|avatar|favicon)([/_?&.-]|$)|shields\.io|badgen|coveralls|travis-ci|circleci|codecov/i.test(normalized)
  )
}
function isEnglishImagePath(value: string) {
  const normalized = decodeURIComponent(value).toLowerCase().replace(/[?#].*$/, '')
  const segments = normalized.split('/').filter(Boolean)
  const englishLocale = /^(?:en(?:[-_](?:us|gb|ca|au|nz|ie))?|english)$/
  const nonEnglishLocale = /^(?:ar|bg|bn|ca|cs|cy|da|de|el|es|et|eu|fa|fi|fr|ga|he|hi|hr|hu|id|is|it|ja|ko|lt|lv|ms|mt|nb|nl|nn|no|pl|pt|ro|ru|sk|sl|sr|sv|sw|ta|te|th|tr|uk|ur|vi|zh)(?:[-_][a-z]{2,4})?$/
  const nonEnglishName = /^(?:arabic|chinese|dutch|french|german|hindi|italian|japanese|korean|polish|portuguese|russian|spanish|turkish)$/
  const localizationIndex = segments.findIndex((segment) => /^(?:i18n|l10n|locale|locales|translation|translations)$/.test(segment))
  if (localizationIndex >= 0) return segments.slice(localizationIndex + 1).some((segment) => englishLocale.test(segment))
  if (segments.some((segment) => nonEnglishLocale.test(segment) || nonEnglishName.test(segment))) return false

  const fileName = segments.at(-1) ?? ''
  const localeSuffix = fileName.match(/[._-]([a-z]{2}(?:[-_][a-z]{2,4})?)(?=\.[^.]+$)/)?.[1]
  return !localeSuffix || englishLocale.test(localeSuffix) || !nonEnglishLocale.test(localeSuffix)
}
function repositoryImageScore(path: string) {
  const normalized = path.toLowerCase()
  let score = 0
  if (/(^|\/)(screenshots?|images?|media|docs?|figures?|resources?)(\/|$)/.test(normalized)) score += 4
  if (/cover|hero|banner|screenshot|preview|demo|architecture|diagram|workflow/.test(normalized)) score += 3
  return score
}
function repositoryAssetLabel(url: string) {
  try {
    const fileName = decodeURIComponent(new URL(url).pathname.split('/').pop() ?? 'Repository visual')
    return fileName.replace(/[-_]+/g, ' ').replace(/\.[^.]+$/, '')
  } catch {
    return 'Repository visual'
  }
}
function repositoryAssetSubject(label: string) {
  return label.split(/\s+/).slice(0, 5).join(' ')
}
function chooseRelevantAsset(assets: string[], slideTitle: string, slideText: string, usage: Map<string, number>) {
  if (!assets.length) return null
  const context = `${slideTitle} ${SLIDE_FOCUS[slideTitle] ?? ''} ${slideText}`
  return [...assets].sort((left, right) => {
    const score = (asset: string) => {
      const label = repositoryAssetLabel(asset)
      const relevance = topicOverlap(context, label) + topicOverlap(label, context)
      return relevance * 20 - (usage.get(asset) ?? 0)
    }
    return score(right) - score(left) || assets.indexOf(left) - assets.indexOf(right)
  })[0]
}
function extractReadmeImageUrls(markdown: string, owner: string, repo: string, branch: string) {
  const urls = new Set<string>()
  const patterns = [/!\[[^\]]*\]\(([^)\s]+)/g, /<img[^>]*src=["']([^"']+)["']/gi]
  for (const pattern of patterns) {
    for (const match of markdown.matchAll(pattern)) {
      const raw = match[1]
      if (!raw) continue
      urls.add(raw.startsWith('http') ? raw : `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${raw.replace(/^\.?\//, '')}`)
    }
  }
  return Array.from(urls).filter((url) => isIllustrativeImage(url) && isEnglishImagePath(url))
}
function isRepositoryNoise(value: string) {
  const text = value.replace(/\s+/g, ' ').trim()
  return (
    /<|>|(?:src|href|alt|align)\s*=|https?:\/\/|www\.|START\s+BADGE|END\s+BADGE/i.test(text) ||
    /^(?:last\s+updated|updated|refresh\s+date|total\s+views?|views?|build|coverage|license)\s*:/i.test(text) ||
    /^(?:-{3,}|={3,}|_{3,})$/.test(text)
  )
}
function isNarratableText(value: string) {
  const text = value.replace(/\s+/g, ' ').trim()
  return text.split(/\s+/).length >= 4 && !isRepositoryNoise(text)
}
function parseReadmeSections(readme: string): Array<{ heading: string; body: string }> {
  const text = readme
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/^.*START\s+BADGE.*$[\s\S]*?^.*END\s+BADGE.*$/gim, ' ')
    .replace(/<!--\s*START\s+BADGE\s*-->[\s\S]*?<!--\s*END\s+BADGE\s*-->/gi, ' ')
    .replace(/<div\b[^>]*>[\s\S]*?(?:badge|shields\.io)[\s\S]*?<\/div>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/\[[^\]]+]\(https?:\/\/(?:www\.)?github\.com\/(?:Cloud2BR-TEC\/?|)?\)/gi, ' ')
    .replace(/!\[[^\]]*]\([^)]+\)/g, ' ')
    .replace(/<img\b[^>]*>/gi, ' ')
    .replace(/`[^`\n]+`/g, ' ')
  const lines = text.split('\n')
  const sections: Array<{ heading: string; body: string }> = []
  let heading = ''
  let bodyLines: string[] = []
  const flush = () => {
    const body = bodyLines
      .map((l) =>
        l
          .replace(/<[^>]+>/g, ' ')
          .replace(/^[>\-*+]\s*/, '')
          .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
          .replace(/https?:\/\/\S+/gi, ' ')
          .replace(/[*_#`|!()]/g, ' ')
          .replaceAll('[', ' ')
          .replaceAll(']', ' ')
          .trim(),
      )
      .filter(
        (l) =>
          l.length > 1 &&
          !isRepositoryNoise(l) &&
          !/^Cloud2BR\s+TEC$/i.test(l),
      )
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
    if (body.length > 15) sections.push({ heading, body })
    bodyLines = []
  }
  for (const line of lines) {
    const h = line.match(/^#{1,4}\s+(.+)/)
    if (h) {
      flush()
      heading = h[1].replace(/[*_`#]/g, '').trim()
    } else {
      bodyLines.push(line)
    }
  }
  flush()
  return sections
}
function downloadFile(name: string, contents: string, type: string) {
  const url = URL.createObjectURL(new Blob([contents], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  URL.revokeObjectURL(url)
}
function wrapCanvasText(context: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const lines: string[] = []
  let line = ''
  for (const word of text.split(/\s+/)) {
    const candidate = line ? `${line} ${word}` : word
    if (context.measureText(candidate).width > maxWidth && line) {
      lines.push(line)
      line = word
    } else {
      line = candidate
    }
  }
  if (line) lines.push(line)
  return lines
}
function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Image failed to load'))
    image.src = src
  })
}
function buildTemplateNarration(primaryText: string, repositoryText: string, slideTitle: string, assetLabel: string) {
  const seen = new Set<string>()
  const sentences = `${primaryText} ${repositoryText}`
    .match(/[^.!?]+[.!?]+|[^.!?]+$/g)
    ?.map((sentence) => sentence.trim())
    .filter(isNarratableText)
    .filter((sentence) => {
      const key = normalizedSentence(sentence)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    }) ?? []
  const focus = SLIDE_FOCUS[slideTitle] ?? `Focus this slide on ${slideTitle.toLowerCase()} using only the available repository evidence.`
  const visualSubject = assetLabel === 'No repository visual selected' ? '' : repositoryAssetSubject(assetLabel)
  const visualBridge = visualSubject ? `The ${visualSubject} visual anchors this explanation in repository evidence.` : ''
  if (!sentences.length) return [focus, visualBridge].filter(Boolean).join(' ')

  const ordered = [...sentences].sort((left, right) => {
    const relevance = (sentence: string) => topicOverlap(sentence, slideTitle) * 2 + topicOverlap(sentence, assetLabel)
    return relevance(right) - relevance(left)
  })

  const narration = [focus, visualBridge].filter(Boolean)
  let wordCount = narration.join(' ').split(/\s+/).length
  for (const sentence of ordered) {
    if (wordCount >= TARGET_NARRATION_WORDS) break
    const remaining = TARGET_NARRATION_WORDS + 4 - wordCount
    const words = sentence.split(/\s+/).slice(0, remaining)
    narration.push(words.join(' '))
    wordCount += words.length
  }
  return narration.join(' ').trim()
}
function hasUniqueSlideContent(scenes: Scene[]) {
  const titleKeys = scenes.map((scene) => normalizedSentence(scene.title)).filter(Boolean)
  const narrationKeys = scenes.map((scene) => normalizedSentence(scene.narration)).filter(Boolean)
  const bulletKeys = scenes.map((scene) => normalizedSentence(scene.bullets.join(' '))).filter(Boolean)
  return new Set(titleKeys).size === scenes.length && new Set(narrationKeys).size === scenes.length && new Set(bulletKeys).size === scenes.length
}
function hasVisualNarrationAlignment(scenes: Scene[]) {
  return scenes.every((scene) => {
    if (!scene.asset) return false
    const subject = repositoryAssetSubject(scene.assetLabel)
    return normalizedSentence(scene.narration).includes(normalizedSentence(subject)) || topicOverlap(scene.narration, scene.assetLabel) > 0
  })
}
function buildScenes(repo: Repository): Scene[] {
  const sections = parseReadmeSections(repo.readme)
  const find = (pattern: RegExp) => sections.find((s) => pattern.test(s.heading) && s.body.trim().split(/\s+/).length > 8)?.body ?? ''
  const fallback = (idx: number) => sections[idx]?.body ?? ''
  const MAX = 800
  const repositoryText = sections.map((section) => section.body).join(' ') || repo.description

  const groups = [
    {
      slideTitles: ['Overview', 'Purpose', 'Audience', 'Repository context', 'Main topic', 'Technology', 'Project scope', 'Documentation map', 'Source visuals', 'Repository recap'],
      visual: 'Repository cover and Cloudy host',
      text: limitWords([repo.description ?? '', repo.language ? `Built with ${repo.language}.` : '', repo.topics.length ? `Topics: ${repo.topics.slice(0, 4).join(', ')}.` : '', fallback(0)].filter(Boolean).join(' '), MAX),
    },
    {
      slideTitles: ['Learning goals', 'Core concepts', 'Key features', 'Important terminology', 'Expected outcomes', 'Knowledge map', 'Repository highlights', 'Documentation signals', 'Practical context', 'Learning recap'],
      visual: 'README highlights and course map',
      text: limitWords(find(/features?|overview|about\b|what\s+(it|this|we|you)|highlights?|key\s+point|objective|goal|purpose/i) || fallback(1) || `This repository contains ${repo.language || 'source'} code${repo.topics.length ? ` focused on ${repo.topics.slice(0, 3).join(', ')}` : ''}.`, MAX),
    },
    {
      slideTitles: ['Project structure', 'Architecture', 'Main components', 'Configuration', 'Dependencies', 'Setup path', 'Documentation', 'Repository assets', 'Project workflow', 'Project recap'],
      visual: repo.assets.length ? 'Repository images and guided source tour' : 'Annotated repository tree',
      text: limitWords(find(/install|setup|getting[\s-]started|structure|architecture|prerequisites?|requirements?|configur|depend/i) || fallback(2) || 'Follow the repository documentation and README to understand the project structure.', MAX),
    },
    {
      slideTitles: ['Getting started', 'First step', 'Core workflow', 'Example path', 'Using the project', 'Checking results', 'Common sequence', 'Source reference', 'Practical outcome', 'Practice recap'],
      visual: 'Workflow steps and source imagery',
      text: limitWords(find(/usage|example|how[\s-]to|tutorial|guide|quickstart|api\b|demo|walkthrough/i) || fallback(3) || `Clone the repository and follow the workflow described in the documentation.`, MAX),
    },
    {
      slideTitles: ['Review', 'Key takeaway', 'Further reading', 'Related resources', 'Open issues', 'Contributing', 'Next experiment', 'Repository reference', 'Suggested next step', 'Final recap'],
      visual: 'Next steps card',
      text: limitWords(find(/contribut|resource|further|next[\s-]step|learn[\s-]more|reference|acknowledgment|credit|community|roadmap/i) || sections[sections.length - 1]?.body || `Continue learning by exploring open issues and related projects.`, MAX),
    },
  ]

  const result: Scene[] = []
  const assetUsage = new Map<string, number>()
  let id = 1
  groups.forEach((group, groupIndex) => {
    group.slideTitles.forEach((slideTitle, slideIndex) => {
      const title = slideTitle
      const asset = chooseRelevantAsset(repo.assets, title, group.text, assetUsage)
      if (asset) assetUsage.set(asset, (assetUsage.get(asset) ?? 0) + 1)
      const assetLabel = asset ? repositoryAssetLabel(asset) : 'No repository visual selected'
      const narration = buildTemplateNarration(group.text, repositoryText, title, assetLabel)
      result.push({
        id: id++,
        section: groupIndex + 1,
        slideInSection: slideIndex + 1,
        title,
        duration: TEMPLATE_SLIDE_SECONDS,
        narration,
        visual: asset ? `Repository image: ${assetLabel}` : group.visual,
        bullets: extractBullets(narration),
        asset,
        assets: asset ? [asset] : [],
        assetLabel,
      })
    })
  })
  if (result.length !== 50 || !hasUniqueSlideContent(result)) throw new Error('The storyboard template produced duplicate slide content.')
  return result
}
function drawCoverImage(context: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, width: number, height: number, zoom: number) {
  const scale = Math.max(width / image.width, height / image.height) * zoom
  const drawWidth = image.width * scale
  const drawHeight = image.height * scale
  context.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight)
}
function drawContainImage(context: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, width: number, height: number) {
  const scale = Math.min(width / image.width, height / image.height)
  const drawWidth = image.width * scale
  const drawHeight = image.height * scale
  context.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight)
}
function generateNarrationAudio(
  scenes: Scene[],
  onProgress: (phase: 'model' | 'scene', progress: number) => void,
  signal: AbortSignal,
) {
  return new Promise<Blob[]>((resolve, reject) => {
    const worker = new Worker(new URL('./narration.worker.ts', import.meta.url), { type: 'module' })
    const audio = new Array<Blob>(scenes.length)
    const cleanup = () => {
      signal.removeEventListener('abort', onAbort)
      worker.terminate()
    }
    const fail = (error: Error) => {
      cleanup()
      reject(error)
    }
    const onAbort = () => fail(new DOMException('Narration generation cancelled.', 'AbortError'))
    signal.addEventListener('abort', onAbort, { once: true })
    worker.addEventListener('error', () => fail(new Error('The local narration worker could not start.')), { once: true })
    worker.addEventListener('message', (event: MessageEvent<{ type: string; index?: number; total?: number; progress?: number; audio?: Blob; message?: string }>) => {
      const message = event.data
      if (message.type === 'model') onProgress('model', message.progress ?? 0)
      if (message.type === 'scene' && message.index !== undefined && message.total) onProgress('scene', message.index / message.total)
      if (message.type === 'audio' && message.index !== undefined && message.audio) audio[message.index] = message.audio
      if (message.type === 'error') fail(new Error(message.message ?? 'Local narration generation failed.'))
      if (message.type === 'complete') {
        if (audio.filter(Boolean).length !== scenes.length) {
          fail(new Error('One or more narration clips could not be generated.'))
          return
        }
        cleanup()
        resolve(audio)
      }
    })
    worker.postMessage({ scenes: scenes.map(({ narration }) => ({ narration })) })
  })
}

function App() {
  const [repositoryUrl, setRepositoryUrl] = useState(starterRepository)
  const [repository, setRepository] = useState<Repository | null>(null)
  const [scenes, setScenes] = useState<Scene[]>(starterScenes)
  const [selectedSceneId, setSelectedSceneId] = useState(1)
  const [status, setStatus] = useState('Paste a public GitHub repository URL to create Cloudy’s explainer.')
  const [isLoading, setIsLoading] = useState(false)
  const [activeWorkflow, setActiveWorkflow] = useState<WorkflowStep>('source')
  const [isRenderingVideo, setIsRenderingVideo] = useState(false)
  const [renderProgress, setRenderProgress] = useState(0)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isVideoPreviewPlaying, setIsVideoPreviewPlaying] = useState(false)
  const [videoPreviewSceneIdx, setVideoPreviewSceneIdx] = useState(0)
  const renderAbortRef = useRef(false)
  const renderAbortControllerRef = useRef<AbortController | null>(null)
  const videoPreviewAbortRef = useRef(false)
  const totalDuration = scenes.reduce((total, scene) => total + scene.duration, 0)
  const selectedScene = scenes.find((scene) => scene.id === selectedSceneId) ?? scenes[0]
  const inTargetRange = totalDuration >= 480 && totalDuration <= 720
  const narrationReady = scenes.length > 0 && scenes.every((scene) => scene.title.trim().length > 0 && scene.narration.trim().length > 0)
  const uniqueSlidesReady = scenes.length === 50 && hasUniqueSlideContent(scenes)
  const visualsReady = Boolean(repository?.assets.length)
  const visualNarrationReady = visualsReady && hasVisualNarrationAlignment(scenes)
  const captionsReady = narrationReady && scenes.every((scene) => Number.isFinite(scene.duration) && scene.duration > 0)
  const isExportReady = Boolean(repository) && inTargetRange && narrationReady && uniqueSlidesReady && visualsReady && visualNarrationReady && captionsReady
  const cloudyLogo = new URL('./assets/branding/cloudy-logo.png', import.meta.url).href
  const apiHeaders: Record<string, string> = {
    Accept: 'application/vnd.github+json',
  }
  const videoPreviewScene = scenes[videoPreviewSceneIdx] ?? scenes[0]
  const presentedScene = isVideoPreviewPlaying ? videoPreviewScene : selectedScene
  const presentedAsset = presentedScene.asset

  async function loadRepository(value: string) {
    const parsed = parseRepositoryUrl(value)
    if (!parsed) {
      setStatus('Use a canonical URL such as https://github.com/owner/repository.')
      return
    }
    setIsLoading(true)
    setStatus('Reviewing the repository README, folders, and images...')
    try {
      const [repositoryResponse, readmeResponse] = await Promise.all([
        fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}`, {
          headers: apiHeaders,
        }),
        fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}/readme`, { headers: apiHeaders }),
      ])
      if (!repositoryResponse.ok) throw new Error('Repository unavailable')
      const data = (await repositoryResponse.json()) as {
        full_name: string
        description: string | null
        topics: string[]
        language: string | null
        default_branch: string
        license: { spdx_id: string } | null
        stargazers_count: number
        open_issues_count: number
      }
      const readmeData = readmeResponse.ok ? ((await readmeResponse.json()) as { content?: string }) : null
      const readmeText = readmeData?.content ? decodeBase64(readmeData.content) : ''
      const readmeImages = readmeText ? extractReadmeImageUrls(readmeText, parsed.owner, parsed.repo, data.default_branch) : []
      const treeResponse = await fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}/git/trees/${encodeURIComponent(data.default_branch)}?recursive=1`, { headers: apiHeaders })
      const treeData = treeResponse.ok
        ? ((await treeResponse.json()) as {
            tree?: Array<{ path: string; type: string; size?: number }>
          })
        : null
      const repositoryImages = (treeData?.tree ?? [])
        .filter(
          (entry) =>
            entry.type === 'blob' &&
            isIllustrativeImage(entry.path) &&
            isEnglishImagePath(entry.path) &&
            !/(^|\/)(node_modules|vendor|dist|build|coverage|\.next)(\/|$)/i.test(entry.path) &&
            (entry.size ?? 0) <= 10_000_000,
        )
        .sort((left, right) => repositoryImageScore(right.path) - repositoryImageScore(left.path))
        .map((entry) => `https://raw.githubusercontent.com/${parsed.owner}/${parsed.repo}/${encodeURIComponent(data.default_branch)}/${entry.path.split('/').map(encodeURIComponent).join('/')}`)
      const assets = Array.from(new Set([...readmeImages, ...repositoryImages])).slice(0, 12)
      const newRepo: Repository = {
        fullName: data.full_name,
        description: data.description ?? 'No repository description was provided.',
        topics: data.topics ?? [],
        language: data.language,
        defaultBranch: data.default_branch,
        license: data.license?.spdx_id ?? 'No license detected',
        stars: data.stargazers_count,
        openIssues: data.open_issues_count,
        readme: readmeText,
        assets,
      }
      setRepositoryUrl(`https://github.com/${data.full_name}`)
      setRepository(newRepo)
      const generatedScenes = buildScenes(newRepo)
      setScenes(generatedScenes)
      const imageNote = assets.length ? `Using ${assets.length} English or default-language repository image${assets.length === 1 ? '' : 's'}, one per slide.` : 'No English or default-language images found — Cloudy will present with a branded placeholder.'
      setStatus(`Storyboard ready: ${generatedScenes.length} unique slides, ${SLIDES_PER_SECTION} per section, ${durationLabel(generatedScenes.reduce((total, scene) => total + scene.duration, 0))} total. ${imageNote}`)
    } catch {
      setRepository(null)
      setStatus('The repository could not be read. Check repository access and try again.')
    } finally {
      setIsLoading(false)
    }
  }

  function updateScene(field: 'title' | 'narration', value: string) {
    setScenes((current) =>
      current.map((scene) => {
        if (scene.id !== selectedScene.id) return scene
        const updated = { ...scene, [field]: field === 'title' ? cleanSlideTitle(value) : value }
        if (field === 'narration') {
          updated.duration = wordsToSeconds(value)
          updated.bullets = extractBullets(value)
        }
        return updated
      }),
    )
  }
  function exportProject() {
    if (!isExportReady) {
      setStatus('Complete every export requirement before downloading the project setup.')
      return
    }
    downloadFile('cloudy-video-project.json', JSON.stringify({ repositoryUrl, repository, scenes }, null, 2), 'application/json')
    setStatus('Project JSON downloaded.')
  }
  function exportCaptions() {
    if (!isExportReady) {
      setStatus('Complete every export requirement before downloading captions.')
      return
    }
    let cursor = 0
    const content = scenes
      .map((scene, index) => {
        const start = timestamp(cursor)
        cursor += scene.duration
        return `${index + 1}\n${start} --> ${timestamp(cursor)}\n${scene.narration}`
      })
      .join('\n\n')
    downloadFile('cloudy-captions.srt', content, 'application/x-subrip')
    setStatus('Editable SRT captions downloaded.')
  }
  async function exportVideo() {
    if (!isExportReady) {
      setStatus('Complete every export requirement before downloading the video.')
      return
    }
    if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream || !window.AudioContext || !window.Worker) {
      setStatus('This browser cannot create a narrated video. Use a current Chromium browser.')
      return
    }
    const mimeType = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find((type) => MediaRecorder.isTypeSupported(type)) ?? 'video/webm'
    const canvas = document.createElement('canvas')
    canvas.width = 1920
    canvas.height = 1080
    const context = canvas.getContext('2d')
    if (!context) return
    const audioContext = new AudioContext()
    await audioContext.resume()
    renderAbortRef.current = false
    const renderAbortController = new AbortController()
    renderAbortControllerRef.current = renderAbortController
    setIsRenderingVideo(true)
    setRenderProgress(0)
    setStatus('Loading repository visuals for your video...')
    const cloudyImage = await loadImage(cloudyLogo).catch(() => null)
    const assetImages = repository?.assets.length ? await Promise.all(repository.assets.map((asset) => loadImage(asset).catch(() => null))) : []
    const assetImageByUrl = new Map(repository?.assets.map((asset, index) => [asset, assetImages[index]]) ?? [])
    let narrationBuffers: AudioBuffer[]
    try {
      const narrationBlobs = await generateNarrationAudio(
        scenes,
        (phase, progress) => {
          if (phase === 'model') setStatus(`Preparing Cloudy’s local voice model ${Math.round(progress * 100)}%...`)
          if (phase === 'scene') {
            setRenderProgress(Math.round(progress * 25))
            setStatus(`Generating Cloudy narration ${Math.min(scenes.length, Math.floor(progress * scenes.length) + 1)} of ${scenes.length}...`)
          }
        },
        renderAbortController.signal,
      )
      setStatus('Decoding Cloudy narration for the video...')
      narrationBuffers = await Promise.all(narrationBlobs.map(async (blob) => audioContext.decodeAudioData(await blob.arrayBuffer())))
    } catch (error) {
      await audioContext.close()
      renderAbortControllerRef.current = null
      setIsRenderingVideo(false)
      setRenderProgress(0)
      setStatus(error instanceof DOMException && error.name === 'AbortError' ? 'Video rendering cancelled.' : 'Cloudy’s local narration could not be generated. Check the connection and try again.')
      return
    }
    renderAbortControllerRef.current = null
    if (renderAbortRef.current) {
      await audioContext.close()
      setIsRenderingVideo(false)
      setRenderProgress(0)
      setStatus('Video rendering cancelled.')
      return
    }
    window.speechSynthesis.cancel()
    const canvasStream = canvas.captureStream(30)
    const audioDestination = audioContext.createMediaStreamDestination()
    const stream = new MediaStream([...canvasStream.getVideoTracks(), ...audioDestination.stream.getAudioTracks()])
    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 6_000_000,
      audioBitsPerSecond: 128_000,
    })
    const chunks: BlobPart[] = []
    recorder.addEventListener('dataavailable', (event) => {
      if (event.data.size) chunks.push(event.data)
    })
    const videoReady = new Promise<Blob>((resolve) => recorder.addEventListener('stop', () => resolve(new Blob(chunks, { type: 'video/webm' })), { once: true }))
    const totalSeconds = scenes.reduce((total, scene) => total + scene.duration, 0)
    const startedAt = performance.now()
    setRenderProgress(0)
    setStatus('Rendering the complete video with automatic Cloudy narration. Keep this tab active.')
    recorder.start(1_000)
    let narratedSceneId: number | null = null
    let activeNarrationSource: AudioBufferSourceNode | null = null

    const drawFrame = (elapsedSeconds: number) => {
      let sceneOffset = 0
      let sceneIndex = scenes.length - 1
      const scene =
        scenes.find((item, index) => {
          sceneOffset += item.duration
          if (elapsedSeconds < sceneOffset) {
            sceneIndex = index
            return true
          }
          return false
        }) ?? scenes[scenes.length - 1]
      if (scene.id !== narratedSceneId) {
        narratedSceneId = scene.id
        try {
          activeNarrationSource?.stop()
        } catch {
          // The previous clip already ended.
        }
        const source = audioContext.createBufferSource()
        source.buffer = narrationBuffers[sceneIndex]
        source.playbackRate.value = VOICE_RATE
        source.connect(audioDestination)
        source.addEventListener('ended', () => {
          if (activeNarrationSource === source) setIsSpeaking(false)
        })
        activeNarrationSource = source
        setIsSpeaking(true)
        source.start()
      }
      const sceneElapsed = elapsedSeconds - (sceneOffset - scene.duration)
      const sceneProgress = Math.min(1, sceneElapsed / scene.duration)
      const pulse = 0.5 + Math.sin(sceneElapsed * 1.2) * 0.5
      const entrance = Math.min(1, sceneElapsed / 0.6)
      const eased = 1 - (1 - entrance) ** 3

      const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height)
      gradient.addColorStop(0, '#123b39')
      gradient.addColorStop(0.55, '#1d5b51')
      gradient.addColorStop(1, '#d76639')
      context.fillStyle = gradient
      context.fillRect(0, 0, canvas.width, canvas.height)

      const sceneAssetImages = scene.assets.map((asset) => assetImageByUrl.get(asset)).filter((image): image is HTMLImageElement => Boolean(image))
      const sceneImage = sceneAssetImages.length ? sceneAssetImages[Math.min(sceneAssetImages.length - 1, Math.floor(sceneProgress * sceneAssetImages.length))] : null
      if (sceneImage) {
        context.save()
        context.globalAlpha = 0.28
        drawCoverImage(context, sceneImage, 0, 0, canvas.width, canvas.height, 1 + sceneProgress * 0.04)
        context.restore()
        context.fillStyle = 'rgba(8, 24, 22, 0.78)'
        context.fillRect(0, 0, canvas.width, canvas.height)
      }

      context.fillStyle = `rgba(255, 255, 255, ${0.04 + pulse * 0.05})`
      for (let column = -240; column < canvas.width + 240; column += 120) context.fillRect(column + sceneElapsed * 18, 0, 2, canvas.height)

      // ── Left panel: accent bar + scene label + slide title + bullets ──
      const leftW = 1_060
      context.fillStyle = '#f5a975'
      context.fillRect(80, 140, 7, 340)
      context.save()
      context.globalAlpha = eased
      context.translate((1 - eased) * -60, 0)
      context.fillStyle = '#ffffff'
      context.font = `800 ${scene.title.length > 20 ? 70 : 86}px Manrope, sans-serif`
      const titleLines = wrapCanvasText(context, scene.title, leftW)
      titleLines.slice(0, 2).forEach((line, i) => context.fillText(line, 100, 220 + i * 96))
      context.restore()

      // Bullet points
      const bullets = scene.bullets ?? extractBullets(scene.narration)
      bullets.forEach((bullet, i) => {
        const alpha = Math.min(1, (eased - i * 0.15) / 0.4)
        if (alpha <= 0) return
        context.save()
        context.globalAlpha = alpha
        const by = 450 + i * 80
        context.fillStyle = '#f5a975'
        context.beginPath()
        context.arc(108, by - 9, 6, 0, Math.PI * 2)
        context.fill()
        context.fillStyle = '#e4f0e8'
        context.font = '400 34px Manrope, sans-serif'
        context.fillText(bullet, 128, by)
        context.restore()
      })

      // ── Right panel: repo image ──
      const rightX = 1_120
      const rightW = canvas.width - rightX - 60
      const panelImage = sceneImage
      if (panelImage) {
        context.save()
        context.beginPath()
        context.roundRect(rightX, 140, rightW, 700, 14)
        context.clip()
        context.globalAlpha = 0.92
        context.fillStyle = '#f5fafc'
        context.fillRect(rightX, 140, rightW, 700)
        drawContainImage(context, panelImage, rightX + 24, 164, rightW - 48, 652)
        context.restore()
      }

      context.fillStyle = 'rgba(10, 31, 29, .84)'
      context.fillRect(0, 868, canvas.width, 172)
      context.fillStyle = 'rgba(245,169,117,.9)'
      context.font = '700 22px Manrope, sans-serif'
      context.fillText('CLOUDY IS SAYING:', 80, 906)
      context.fillStyle = '#ffffff'
      context.font = '400 30px Manrope, sans-serif'
      wrapCanvasText(context, scene.narration, 1_750)
        .slice(0, 3)
        .forEach((line, index) => context.fillText(line, 80, 938 + index * 38))

      const bob = Math.sin(elapsedSeconds * 1.6) * 10
      const walkX = 1_725 + Math.sin(elapsedSeconds * 0.9) * 90
      const tilt = Math.sin(elapsedSeconds * 1.6) * 0.14
      const stepScale = 1 + Math.sin(elapsedSeconds * 1.6) * 0.05 + eased * 0.06
      if (cloudyImage) {
        context.save()
        context.translate(walkX, 182 + bob)
        context.rotate(tilt)
        context.scale(stepScale, stepScale)
        context.drawImage(cloudyImage, -58, -58, 116, 116)
        context.restore()
      } else {
        context.save()
        context.translate(walkX, 182 + bob)
        context.rotate(tilt)
        context.fillStyle = '#f5a975'
        context.beginPath()
        context.arc(0, 0, 56 + pulse * 6, 0, Math.PI * 2)
        context.fill()
        context.fillStyle = '#173d3a'
        context.font = '800 26px Manrope, sans-serif'
        context.fillText('C', -9, 9)
        context.restore()
      }

      const overallProgress = Math.min(1, elapsedSeconds / totalSeconds)
      context.fillStyle = 'rgba(255, 255, 255, .18)'
      context.fillRect(0, canvas.height - 8, canvas.width, 8)
      context.fillStyle = '#f5a975'
      context.fillRect(0, canvas.height - 8, canvas.width * overallProgress, 8)
    }

    const renderFrame = () => {
      const elapsedSeconds = (performance.now() - startedAt) / 1_000
      drawFrame(elapsedSeconds)
      setRenderProgress(Math.min(100, Math.round((elapsedSeconds / totalSeconds) * 100)))
      if (renderAbortRef.current || elapsedSeconds >= totalSeconds) {
        try {
          activeNarrationSource?.stop()
        } catch {
          // The final clip already ended.
        }
        setIsSpeaking(false)
        recorder.stop()
        return
      }
      window.requestAnimationFrame(renderFrame)
    }

    window.requestAnimationFrame(renderFrame)
    const video = await videoReady
    stream.getTracks().forEach((track) => track.stop())
    await audioContext.close()
    setIsRenderingVideo(false)
    setRenderProgress(0)
    if (renderAbortRef.current) {
      setStatus('Video rendering cancelled.')
      return
    }
    const url = URL.createObjectURL(video)
    const link = document.createElement('a')
    link.href = url
    link.download = 'cloudy-video.webm'
    link.click()
    URL.revokeObjectURL(url)
    setStatus('Complete WebM video downloaded with Cloudy narration and on-screen captions.')
  }
  function cancelVideoExport() {
    renderAbortRef.current = true
    renderAbortControllerRef.current?.abort()
    setStatus('Stopping video render...')
  }

  function pickFemaleVoice() {
    const voices = window.speechSynthesis.getVoices()
    const femaleNames = /zira|samantha|victoria|ava|aria|hazel|susan|karen|moira|tessa|fiona|allison|erin|eva|vicki|joanna|ivy|kendra|kimberly|salli|nicole|naja|marlene|mathilde/i
    const female = voices.find((voice) => femaleNames.test(voice.name) && voice.lang.startsWith('en')) ?? voices.find((voice) => /female/i.test(voice.name)) ?? voices.find((voice) => voice.lang.startsWith('en-') && !/david|mark|james|alex|daniel|rishi|george|ryan/i.test(voice.name))
    return female ?? null
  }

  async function resolveVoice() {
    const immediate = pickFemaleVoice()
    if (immediate) return immediate
    return new Promise<SpeechSynthesisVoice | null>((resolve) => {
      const onVoicesChanged = () => {
        window.speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged)
        resolve(pickFemaleVoice())
      }
      window.speechSynthesis.addEventListener('voiceschanged', onVoicesChanged)
      window.setTimeout(() => {
        window.speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged)
        resolve(pickFemaleVoice())
      }, 2_000)
    })
  }

  function stopVoice() {
    window.speechSynthesis.cancel()
    setIsSpeaking(false)
    setStatus('Voice preview stopped.')
  }

  async function previewVoice() {
    window.speechSynthesis.cancel()
    const femaleVoice = await resolveVoice()
    const utterance = new SpeechSynthesisUtterance(selectedScene.narration)
    utterance.voice = femaleVoice
    utterance.lang = femaleVoice?.lang ?? 'en-US'
    utterance.rate = VOICE_RATE
    utterance.pitch = 1.1
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)
    setIsSpeaking(true)
    setStatus(femaleVoice ? `Cloudy is speaking with ${femaleVoice.name}.` : 'No female voice found. Using browser default.')
  }

  async function startVideoPreview() {
    if (isVideoPreviewPlaying) return
    videoPreviewAbortRef.current = false
    setIsVideoPreviewPlaying(true)
    setVideoPreviewSceneIdx(0)
    const voice = await resolveVoice()
    for (let i = 0; i < scenes.length; i++) {
      if (videoPreviewAbortRef.current) break
      setVideoPreviewSceneIdx(i)
      await new Promise<void>((resolve) => {
        window.speechSynthesis.cancel()
        const utterance = new SpeechSynthesisUtterance(scenes[i].narration)
        utterance.voice = voice
        utterance.lang = voice?.lang ?? 'en-US'
        utterance.rate = VOICE_RATE
        utterance.pitch = 1.1
        utterance.onstart = () => setIsSpeaking(true)
        utterance.onend = () => {
          setIsSpeaking(false)
          resolve()
        }
        utterance.onerror = () => {
          setIsSpeaking(false)
          resolve()
        }
        window.speechSynthesis.speak(utterance)
      })
      if (!videoPreviewAbortRef.current && i < scenes.length - 1) {
        await new Promise<void>((resolve) => window.setTimeout(resolve, 350))
      }
    }
    window.speechSynthesis.cancel()
    setIsSpeaking(false)
    setIsVideoPreviewPlaying(false)
    setVideoPreviewSceneIdx(0)
  }

  function stopVideoPreview() {
    videoPreviewAbortRef.current = true
    window.speechSynthesis.cancel()
    setIsSpeaking(false)
    setIsVideoPreviewPlaying(false)
    setVideoPreviewSceneIdx(0)
  }

  function navigateToWorkflow(step: WorkflowStep) {
    if ((step === 'story' || step === 'voice') && !repository) {
      setActiveWorkflow('source')
      setStatus('Generate an explainer before opening Story or Voice.')
      document.getElementById('source-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }
    setActiveWorkflow(step)
    document.getElementById(`${step}-section`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="https://github.com/Cloud2BR-TEC/Cloudy-overview-videos" target="_blank" rel="noreferrer">
          <img src={cloudyLogo} alt="Cloudy" />
          <span>
            <strong>Cloudy</strong>
            <small>Repository Video Studio</small>
          </span>
        </a>
      </header>
      <section className="workspace">
        <aside className="rail" aria-label="Project workflow">
          <button className={`rail-item ${activeWorkflow === 'source' ? 'active' : ''}`} type="button" onClick={() => navigateToWorkflow('source')} aria-current={activeWorkflow === 'source' ? 'step' : undefined}>
            <span>01</span>
            <strong>Source</strong>
          </button>
          <button className={`rail-item ${activeWorkflow === 'story' ? 'active' : ''}`} type="button" onClick={() => navigateToWorkflow('story')} aria-current={activeWorkflow === 'story' ? 'step' : undefined}>
            <span>02</span>
            <strong>Story</strong>
          </button>
          <button className={`rail-item ${activeWorkflow === 'voice' ? 'active' : ''}`} type="button" onClick={() => navigateToWorkflow('voice')} aria-current={activeWorkflow === 'voice' ? 'step' : undefined}>
            <span>03</span>
            <strong>Voice</strong>
          </button>
          <button className={`rail-item ${activeWorkflow === 'export' ? 'active' : ''}`} type="button" onClick={() => navigateToWorkflow('export')} aria-current={activeWorkflow === 'export' ? 'step' : undefined}>
            <span>04</span>
            <strong>Export</strong>
          </button>
        </aside>
        <section className="content-column">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Cloudy overview video</p>
              <h1>Choose the repository Cloudy will explain.</h1>
            </div>
            <p className="status" aria-live="polite">
              {status}
            </p>
          </div>
          <section className="repository-form" id="source-section">
            <p className="eyebrow">Public repository</p>
            <label htmlFor="repository-url">GitHub repository URL</label>
            <div className="url-entry">
              <input id="repository-url" type="url" value={repositoryUrl} onChange={(event) => setRepositoryUrl(event.target.value)} placeholder="https://github.com/owner/repository" />
              <button className="primary-button" type="button" onClick={() => void loadRepository(repositoryUrl)} disabled={isLoading}>
                {isLoading ? 'Reading...' : 'Generate explainer'}
              </button>
            </div>
            <p>Cloudy reads public repository details only. Private repositories are not available in this browser-only version.</p>
          </section>
          {repository && (
            <section className="repository-card" aria-label="Repository source">
              <div className="repository-title">
                <div>
                  <p className="eyebrow">Source evidence</p>
                  <h2>{repository.fullName}</h2>
                  <p>{repository.description}</p>
                </div>
              </div>
              <div className="metadata-grid">
                <span>
                  <small>Default branch</small>
                  {repository.defaultBranch}
                </span>
                <span>
                  <small>Primary language</small>
                  {repository.language ?? 'Not detected'}
                </span>
                <span>
                  <small>License</small>
                  {repository.license}
                </span>
                <span>
                  <small>Signals</small>
                  {repository.stars} stars · {repository.openIssues} issues
                </span>
              </div>
              {repository.assets.length > 0 && (
                <div className="asset-strip">
                  {repository.assets.map((asset) => (
                    <img key={asset} src={asset} alt="Repository source asset" />
                  ))}
                </div>
              )}
              {repository.topics.length > 0 && (
                <div className="tags">
                  {repository.topics.slice(0, 6).map((topic) => (
                    <span key={topic}>{topic}</span>
                  ))}
                </div>
              )}
            </section>
          )}
          {repository ? (
            <section className="story-area" id="story-section">
              <div className="story-head">
                <div>
                  <p className="eyebrow">Storyboard</p>
                  <h2>Cloudy’s explainer</h2>
                </div>
                <div className={`duration-pill ${inTargetRange ? 'ready' : ''}`}>
                  {durationLabel(totalDuration)} <small>{inTargetRange ? 'Within 8-12 minute target' : 'Target: 8-12 min'}</small>
                </div>
              </div>
              <div className="story-grid">
                <div className="scene-picker">
                  <label htmlFor="scene-select">Choose a slide</label>
                  <select id="scene-select" value={selectedScene.id} onChange={(event) => setSelectedSceneId(Number(event.target.value))}>
                    {Array.from({ length: 5 }, (_, sectionIndex) => sectionIndex + 1).map((section) => (
                      <optgroup key={section} label={`Section ${section}`}>
                        {scenes.filter((scene) => scene.section === section).map((scene) => (
                          <option key={scene.id} value={scene.id}>
                            {scene.section}.{String(scene.slideInSection).padStart(2, '0')} · {scene.title} · {durationLabel(scene.duration)}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <span>{selectedScene.visual}</span>
                </div>
                <article className="scene-editor">
                  <div className="presentation-toolbar" id="voice-section">
                    <div>
                      <p className="eyebrow">Live presentation</p>
                      <strong>{isVideoPreviewPlaying ? `Presenting section ${videoPreviewSceneIdx + 1} of ${scenes.length}` : 'Review and edit the selected section'}</strong>
                    </div>
                    <div className="presentation-actions">
                      {isVideoPreviewPlaying ? (
                        <button className="primary-button" type="button" onClick={stopVideoPreview}>
                          Stop
                        </button>
                      ) : (
                        <>
                          {isSpeaking ? (
                            <button className="secondary-button voice-button" type="button" onClick={stopVoice}>
                              &#9646;&#9646; Stop preview
                            </button>
                          ) : (
                            <button className="secondary-button voice-button" type="button" onClick={() => void previewVoice()}>
                              Preview selected
                            </button>
                          )}
                          <button className="primary-button" type="button" onClick={() => void startVideoPreview()} disabled={isSpeaking}>
                            &#9654; Play all
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className={`slide-stage unified-stage ${isVideoPreviewPlaying ? 'is-playing' : ''}`}>
                    <div className="slide-left markdown-slide-copy">
                      <h2 className="slide-title">{presentedScene.title}</h2>
                      <ul className="slide-bullets">
                        {(presentedScene.bullets?.length ? presentedScene.bullets : extractBullets(presentedScene.narration)).map((bullet, i) => (
                          <li key={i}>{bullet}</li>
                        ))}
                      </ul>
                    </div>
                    <figure className={`slide-source-visual ${presentedAsset ? '' : 'empty'}`}>
                      {presentedScene.assets.length ? (
                        <div className={`slide-source-grid count-${Math.min(presentedScene.assets.length, 4)}`}>
                          {presentedScene.assets.map((asset) => (
                            <img key={asset} src={asset} alt={`Repository visual: ${repositoryAssetLabel(asset)}`} />
                          ))}
                        </div>
                      ) : (
                        <span>No repository image available</span>
                      )}
                    </figure>
                    <div className="slide-right">
                      <div className={`slide-cloudy ${isSpeaking ? 'speaking' : ''}`}>
                        <CloudyAvatar speaking={isSpeaking} size={88} />
                        {isSpeaking && (
                          <span className="talk-badge" aria-label="Cloudy is speaking" title="Cloudy is speaking">
                          <span className="talk-bars">
                            <span></span>
                            <span></span>
                            <span></span>
                          </span>
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="slide-narration">
                      <span className="slide-narration-label">{isVideoPreviewPlaying ? 'Now reading' : 'Cloudy narration'}</span>
                      <p>{presentedScene.narration}</p>
                    </div>
                  </div>
                  <div className="video-scene-progress" aria-label="Presentation sections">
                    {scenes.map((scene, index) => (
                      <button
                        key={scene.id}
                        type="button"
                        className={`vsp-dot ${isVideoPreviewPlaying && index < videoPreviewSceneIdx ? 'done' : presentedScene.id === scene.id ? 'active' : ''}`}
                        onClick={() => {
                          if (!isVideoPreviewPlaying) setSelectedSceneId(scene.id)
                        }}
                        disabled={isVideoPreviewPlaying}
                        title={scene.title}
                      >
                        {String(index + 1).padStart(2, '0')}
                      </button>
                    ))}
                  </div>
                  <div className="editor-fields">
                    <label>
                      Slide title
                      <input value={selectedScene.title} onChange={(event) => updateScene('title', event.target.value)} />
                    </label>
                    <label>
                      Cloudy narration
                      <textarea rows={4} value={selectedScene.narration} onChange={(event) => updateScene('narration', event.target.value)} />
                    </label>
                    <div className="duration-info">
                      <span className="duration-info-label">Slide time · 10-15 second template</span>
                      <span className="duration-info-value">
                        {durationLabel(selectedScene.duration)}
                        <small>
                          {' '}
                          ({selectedScene.narration.trim().split(/\s+/).filter(Boolean).length} words · {selectedScene.duration}s)
                        </small>
                      </span>
                    </div>
                  </div>
                </article>
              </div>
            </section>
          ) : (
            <section className="story-placeholder" id="story-section">
              <p className="eyebrow">Storyboard</p>
              <h2>Generate an explainer to begin</h2>
              <p>
                Paste a public GitHub repository URL above and select <strong>Generate explainer</strong>. Cloudy will read the repository and build a live, editable storyboard here.
              </p>
            </section>
          )}
        </section>
        <aside className={`review-panel ${repository ? '' : 'placeholder'}`} id="export-section">
          <div>
            <p className="eyebrow">Export requirements</p>
            <h2>{isExportReady ? 'Downloads ready' : 'Complete before download'}</h2>
            {!isExportReady && <p>All requirements below must be complete before video, captions, or project files can be downloaded.</p>}
          </div>
          <ul className="checklist">
            <li className={repository ? 'done' : ''}>Repository source captured</li>
            <li className={inTargetRange ? 'done' : ''}>8-12 minute runtime</li>
            <li className={narrationReady ? 'done' : ''}>Every slide has a title and narration</li>
            <li className={uniqueSlidesReady ? 'done' : ''}>All 50 slides have unique content</li>
            <li className={visualsReady ? 'done' : ''}>Source visuals selected</li>
            <li className={visualNarrationReady ? 'done' : ''}>Narration relates to every visual</li>
            <li className={captionsReady ? 'done' : ''}>Caption timings ready</li>
          </ul>
          <div className="export-actions">
            {isRenderingVideo ? (
              <button className="primary-button" type="button" onClick={cancelVideoExport}>
                Cancel video render {renderProgress}%
              </button>
            ) : (
              <button className="primary-button" type="button" onClick={() => void exportVideo()} disabled={!isExportReady}>
                Download narrated video
              </button>
            )}
            <button className="secondary-button" type="button" onClick={exportCaptions} disabled={!isExportReady}>
              Download captions
            </button>
            <button className="secondary-button" type="button" onClick={exportProject} disabled={!isExportReady}>
              Download project setup
            </button>
          </div>
        </aside>
      </section>
    </main>
  )
}

export default App
