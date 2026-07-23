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
  documentation: string
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
  assetMatch: 'authored' | null
  supportingPoints: string[]
}
type WorkflowStep = 'source' | 'story' | 'voice' | 'export'
type StudioMode = 'landing' | 'overview' | 'shorts'

const starterRepository = 'https://github.com/Cloud2BR-TEC/ai-academy-101-ml'
const SLIDES_PER_SECTION = 10
const TEMPLATE_SLIDE_SECONDS = 12
const VOICE_RATE = 1.15
const BASE_NARRATION_WORDS_PER_MINUTE = 130
const PLAYBACK_SPEED_OPTIONS = [1, 1.25, 1.5, 1.75, 2, 2.5] as const
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
  const ignored = new Set(['about', 'after', 'before', 'documented', 'from', 'image', 'includes', 'information', 'into', 'project', 'provides', 'reference', 'repository', 'resource', 'slide', 'source', 'that', 'their', 'this', 'through', 'topic', 'using', 'visual', 'with', 'your'])
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
function isEditorialDirection(value: string) {
  return /^(?:begin|call attention|clarify|close|concentrate|connect|consolidate|define|describe|direct|distinguish|explain|focus|frame|highlight|identify|isolate|narrow|offer|orient|place|point|present|reduce|reinforce|relate|revisit|select|separate|show|shift|state|summarize|trace|treat|turn|use)\b/i.test(value.trim())
}
function extractBullets(narration: string): string[] {
  const seen = new Set<string>()
  return narration
    .replace(/([.!?])\s+/g, '$1\n')
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s.length > 18 && s.length < 170)
    .filter((sentence) => !isEditorialDirection(sentence))
    .filter((sentence) => {
      const key = normalizedSentence(sentence)
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    })
    .map((sentence) => sentence)
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
  assetMatch: null,
  supportingPoints: buildSupportingPoints(narration),
}))

function parseRepositoryUrl(value: string) {
  try {
    const trimmed = value.trim()
    const copiedUrl = (trimmed.match(/https?:\/\/(?:www\.)?github\.com\/[^\s)\]]+/i)?.[0] ?? trimmed).replace(/[,.;:>]+$/, '')
    const url = new URL(copiedUrl)
    const segments = url.pathname.replace(/^\/+|\/+$/g, '').split('/')
    const hostname = url.hostname.toLowerCase().replace(/^www\./, '')
    return hostname === 'github.com' && segments.length >= 2 && segments[0] && segments[1] ? { owner: segments[0], repo: segments[1].replace(/\.git$/, '') } : null
  } catch {
    return null
  }
}
async function fetchWithRetry(input: RequestInfo | URL, init: RequestInit, attempts = 3) {
  let lastError: unknown
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(input, init)
      if (response.ok || (response.status !== 429 && response.status < 500) || attempt === attempts) return response
    } catch (error) {
      if (init.signal?.aborted) throw error
      lastError = error
      if (attempt === attempts) throw error
    }
  }
  throw lastError instanceof Error ? lastError : new Error('GitHub request failed')
}

function durationLabel(seconds: number) {
  const wholeSeconds = Math.floor(seconds)
  return `${Math.floor(wholeSeconds / 60)}:${String(wholeSeconds % 60).padStart(2, '0')}`
}
function timestamp(seconds: number) {
  const milliseconds = Math.round(seconds * 1_000)
  const hours = Math.floor(milliseconds / 3_600_000)
  const minutes = Math.floor((milliseconds % 3_600_000) / 60_000)
  const remainingSeconds = Math.floor((milliseconds % 60_000) / 1_000)
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}.${String(milliseconds % 1_000).padStart(3, '0')}`
}
function chapterTimestamp(seconds: number) {
  const wholeSeconds = Math.floor(seconds)
  return `${Math.floor(wholeSeconds / 60)}:${String(wholeSeconds % 60).padStart(2, '0')}`
}
function effectiveSceneDuration(scene: Scene, playbackSpeed: number) {
  return scene.duration / playbackSpeed
}
function speedLabel(playbackSpeed: number) {
  return `${playbackSpeed}x`
}
function decodeBase64(value: string) {
  return new TextDecoder().decode(Uint8Array.from(atob(value.replace(/\s/g, '')), (character) => character.charCodeAt(0)))
}
function isExcludedRepositoryPath(value: string) {
  const path = decodeURIComponent(value).toLowerCase().replace(/[?#].*$/, '')
  return /(^|\/)agenda\.ya?ml$/.test(path)
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
function isEnglishDocumentationPath(value: string) {
  return /^docs\//i.test(value) && /\.mdx?$/i.test(value) && isEnglishImagePath(value) && !isExcludedRepositoryPath(value)
}
function documentationLanguagePriority(path: string) {
  const normalized = decodeURIComponent(path).toLowerCase()
  const segments = normalized.split('/').filter(Boolean)
  const englishLocale = /^(?:en(?:[-_](?:us|gb|ca|au|nz|ie))?|english)$/
  const localizationIndex = segments.findIndex((segment) => /^(?:i18n|l10n|locale|locales|translation|translations)$/.test(segment))
  if (localizationIndex >= 0) return englishLocale.test(segments[localizationIndex + 1] ?? '') ? 3 : 0
  const fileName = segments.at(-1) ?? ''
  const localeSuffix = fileName.match(/[._-](en(?:[-_](?:us|gb|ca|au|nz|ie))?|english)(?=\.[^.]+$)/)?.[1]
  return localeSuffix ? 2 : 1
}
function documentationContentKey(path: string) {
  return decodeURIComponent(path)
    .toLowerCase()
    .replace(/^docs\//, '')
    .replace(/^(?:i18n|l10n|locale|locales|translation|translations)\/(?:en(?:[-_][a-z]{2,4})?|english)\//, '')
    .replace(/[._-](?:en(?:[-_][a-z]{2,4})?|english)(?=\.mdx?$)/, '')
}
function repositoryImageScore(path: string) {
  const normalized = path.toLowerCase()
  let score = 0
  if (/(^|\/)(screenshots?|images?|media|docs?|figures?|resources?)(\/|$)/.test(normalized)) score += 4
  if (/cover|hero|banner|screenshot|preview|demo|architecture|diagram|workflow/.test(normalized)) score += 3
  return score
}
function repositoryFileScore(path: string) {
  const normalized = path.toLowerCase()
  let score = 0
  if (/(^|\/)(docs?|examples?|notebooks?|lessons?|labs?|src|tutorials?)(\/|$)/.test(normalized)) score += 6
  if (/readme|guide|overview|architecture|workflow|setup|getting-started|\.md$|\.ipynb$/.test(normalized)) score += 4
  if (/(^|\/)(\.github|scripts?|tests?)(\/|$)|(^|\/)\./.test(normalized)) score -= 3
  return score
}
function repositoryAssetLabel(url: string) {
  try {
    const pathname = url.startsWith('http') ? new URL(url).pathname : url.replace(/[?#].*$/, '')
    const fileName = decodeURIComponent(pathname.split('/').pop() ?? 'Repository visual')
    return fileName.replace(/[-_]+/g, ' ').replace(/\.[^.]+$/, '')
  } catch {
    return 'Repository visual'
  }
}
function chooseRelevantAsset(assets: string[], sectionImageLabels: string[]) {
  if (!assets.length) return null
  const authoredAsset = assets.find((asset) => sectionImageLabels.some((label) => normalizedSentence(repositoryAssetLabel(asset)) === normalizedSentence(label)))
  if (authoredAsset) return { asset: authoredAsset, match: 'authored' as const }
  return null
}
function extractReadmeImageUrls(markdown: string, owner: string, repo: string, branch: string) {
  const urls = new Set<string>()
  const patterns = [/!\[[^\]]*\]\(([^)\s]+)/g, /<img[^>]*src=["']([^"']+)["']/gi]
  for (const pattern of patterns) {
    for (const match of markdown.matchAll(pattern)) {
      const raw = match[1]
      if (!raw) continue
      if (isExcludedRepositoryPath(raw)) continue
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
    /\b(?:list of references|click to expand)\b/i.test(text) ||
    /\b(?:provided as[- ]is|with all faults|demonstration purposes only|assumes no liability|official guidance|microsoft sales and support|price adjustments)\b/i.test(text) ||
    /^[\s\-=_]{3,}$/.test(text)
  )
}
function isNarratableText(value: string) {
  const text = value.replace(/\s+/g, ' ').trim()
  return text.split(/\s+/).length >= 4 && !isRepositoryNoise(text)
}
function parseReadmeSections(readme: string): Array<{ heading: string; body: string; imageLabels: string[] }> {
  const text = readme
    .replace(/^.*agenda\.ya?ml.*$/gim, ' ')
    .replace(/^[\s\-=_]{3,}$/gm, ' ')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<details\b[^>]*>[\s\S]*?<\/details>/gi, ' ')
    .replace(/^.*START\s+BADGE.*$[\s\S]*?^.*END\s+BADGE.*$/gim, ' ')
    .replace(/<!--\s*START\s+BADGE\s*-->[\s\S]*?<!--\s*END\s+BADGE\s*-->/gi, ' ')
    .replace(/<div\b[^>]*>[\s\S]*?(?:badge|shields\.io)[\s\S]*?<\/div>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/\[[^\]]+]\(https?:\/\/(?:www\.)?github\.com\/(?:Cloud2BR-TEC\/?|)?\)/gi, ' ')
    .replace(/`[^`\n]+`/g, ' ')
  const lines = text.split('\n')
  const sections: Array<{ heading: string; body: string; imageLabels: string[] }> = []
  let heading = ''
  let bodyLines: string[] = []
  const flush = () => {
    const rawBody = bodyLines.join('\n')
    const imageLabels = [
      ...Array.from(rawBody.matchAll(/!\[[^\]]*]\(([^)\s]+)/g), (match) => repositoryAssetLabel(match[1])),
      ...Array.from(rawBody.matchAll(/<img[^>]*src=["']([^"']+)["']/gi), (match) => repositoryAssetLabel(match[1])),
    ].filter((label) => label !== 'Repository visual')
    const body = bodyLines
      .map((l) =>
        l
          .replace(/<[^>]+>/g, ' ')
          .replace(/^(?:[>*+]\s*|-\s+)/, '')
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
    if (body.length > 15) sections.push({ heading, body, imageLabels })
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
function fitCanvasText(context: CanvasRenderingContext2D, text: string, maxWidth: number, maxHeight: number, maxFontSize: number, minFontSize: number, weight = '400') {
  for (let fontSize = maxFontSize; fontSize >= minFontSize; fontSize -= 1) {
    context.font = `${weight} ${fontSize}px Manrope, sans-serif`
    const lineHeight = Math.ceil(fontSize * 1.35)
    const lines = wrapCanvasText(context, text, maxWidth)
    if (lines.length * lineHeight <= maxHeight) return { fontSize, lineHeight, lines }
  }
  context.font = `${weight} ${minFontSize}px Manrope, sans-serif`
  return { fontSize: minFontSize, lineHeight: Math.ceil(minFontSize * 1.35), lines: wrapCanvasText(context, text, maxWidth) }
}
function fitCanvasPoints(context: CanvasRenderingContext2D, points: string[], maxWidth: number, maxHeight: number) {
  for (let fontSize = 28; fontSize >= 12; fontSize -= 1) {
    context.font = `400 ${fontSize}px Manrope, sans-serif`
    const lineHeight = Math.ceil(fontSize * 1.35)
    const linesByPoint = points.map((point) => wrapCanvasText(context, point, maxWidth))
    const textHeight = linesByPoint.reduce((height, lines) => height + lines.length * lineHeight, 0) + Math.max(0, points.length - 1) * lineHeight
    if (textHeight <= maxHeight) return { fontSize, lineHeight, linesByPoint }
  }
  context.font = '400 12px Manrope, sans-serif'
  return { fontSize: 12, lineHeight: 17, linesByPoint: points.map((point) => wrapCanvasText(context, point, maxWidth)) }
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
function rankedEvidenceSentences(primaryText: string, repositoryText: string, slideTitle: string, assetLabel: string) {
  const seen = new Set<string>()
  const primaryEvidence = new Set(
    (primaryText.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? []).map((sentence) => normalizedSentence(sentence)),
  )
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
  return [...sentences].sort((left, right) => {
    const relevance = (sentence: string) => (primaryEvidence.has(normalizedSentence(sentence)) ? 10 : 0) + topicOverlap(sentence, slideTitle) * 2 + topicOverlap(sentence, focus) * 2 + topicOverlap(sentence, assetLabel)
    return relevance(right) - relevance(left)
  })
}
function contentSimilarity(left: string, right: string) {
  const leftWords = contentWords(left)
  const rightWords = contentWords(right)
  if (!leftWords.size || !rightWords.size) return 0
  const sharedWords = Array.from(leftWords).filter((word) => rightWords.has(word)).length
  return sharedWords / Math.min(leftWords.size, rightWords.size)
}
function selectDistinctEvidence(primaryText: string, repositoryText: string, slideTitle: string, assetLabel: string, usedEvidence: string[]) {
  const evidence = rankedEvidenceSentences(primaryText, repositoryText, slideTitle, assetLabel).find(
    (candidate) => usedEvidence.every((used) => contentSimilarity(candidate, used) < 0.72),
  )
  if (!evidence) return null
  usedEvidence.push(evidence)
  return evidence
}
function buildEvidenceBullets(evidence: string, slideTitle: string) {
  return [`${slideTitle}: ${evidence.replace(/[.!?]+$/, '')}`]
}
function buildTemplateNarration(title: string, evidence: string) {
  return `${title}. ${evidence}`
}
function buildSupportingPoints(evidence: string) {
  return [evidence]
}
function hasUniqueSlideContent(scenes: Scene[]) {
  const titleKeys = scenes.map((scene) => normalizedSentence(scene.title)).filter(Boolean)
  const narrationKeys = scenes.map((scene) => normalizedSentence(scene.narration)).filter(Boolean)
  const bulletKeys = scenes.map((scene) => normalizedSentence(scene.bullets.join(' '))).filter(Boolean)
  if (new Set(titleKeys).size !== scenes.length || new Set(narrationKeys).size !== scenes.length || new Set(bulletKeys).size !== scenes.length) return false
  const evidenceText = (scene: Scene) => [scene.bullets[0]?.replace(/^[^:]+:\s*/, '') ?? '', ...scene.bullets.slice(1)].join(' ')
  return scenes.every((scene, index) =>
    scenes.slice(index + 1).every((other) => contentSimilarity(evidenceText(scene), evidenceText(other)) < 0.72),
  )
}
function hasVisualNarrationAlignment(scenes: Scene[]) {
  return scenes.every((scene) => !scene.asset || scene.assetMatch === 'authored')
}
function hasNarratedPresentationContent(scenes: Scene[]) {
  return scenes.every((scene) => {
    const narrationTerms = contentWords(scene.narration)
    const displayedContent = [scene.title, ...scene.bullets, ...scene.supportingPoints]
    return displayedContent.every((content) => {
      const contentTerms = Array.from(contentWords(content))
      const matchedTerms = contentTerms.filter((term) => narrationTerms.has(term)).length
      return !contentTerms.length || matchedTerms / contentTerms.length >= 0.8
    })
  })
}
function isMaterialSection(section: { heading: string; body: string; imageLabels: string[] }) {
  const heading = normalizedSentence(section.heading)
  const words = section.body.trim().split(/\s+/).filter(Boolean)
  return (
    heading.length > 3 &&
    words.length >= 8 &&
    !/^(?:contents?|table of contents|modules?|quick review links?|references?|resources?|navigation|repository|documentation)$/.test(heading) &&
    !/(?:repository structure|folder structure|contribut|license|github workflow|documentation map|demonstration purposes only|disclaimer|legal notice)/.test(heading)
  )
}
function materialPassages(section: { heading: string; body: string; imageLabels: string[] }) {
  return (section.body.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [])
    .map((sentence) => sentence.trim())
    .filter(isNarratableText)
    .filter((sentence) => sentence.split(/\s+/).length >= 8)
    .map((body, index) => ({
      heading: index === 0 ? section.heading : `${section.heading}: ${limitWords(body.replace(/[.!?]+$/, ''), 7)}`,
      body,
      sectionBody: section.body,
      imageLabels: index === 0 ? section.imageLabels : [],
    }))
}
function buildScenes(repo: Repository): Scene[] {
  const allSections = [...parseReadmeSections(repo.readme), ...parseReadmeSections(repo.documentation)]
  const materialSections = allSections.filter(isMaterialSection)
  const materialCandidates = [...materialSections, ...materialSections.flatMap(materialPassages)]
  const seenTitles = new Set<string>()
  const uniqueCandidates = materialCandidates.filter((section) => {
    const key = normalizedSentence(section.heading)
    if (seenTitles.has(key)) return false
    seenTitles.add(key)
    return true
  })
  const repositoryText = materialSections.map((section) => section.body).join(' ')

  const result: Scene[] = []
  const usedEvidence: string[] = []
  for (const material of uniqueCandidates) {
    if (result.length === 50) break
    const title = cleanSlideTitle(material.heading)
    const evidence = selectDistinctEvidence(material.body, repositoryText, title, 'No repository visual selected', usedEvidence)
    if (!evidence) continue
    const assetSelection = chooseRelevantAsset(repo.assets, material.imageLabels)
    const asset = assetSelection?.asset ?? null
    const assetLabel = asset ? repositoryAssetLabel(asset) : 'No repository visual selected'
    const narration = buildTemplateNarration(title, evidence)
    const supportingPoints = buildSupportingPoints(evidence)
    if (!asset && !supportingPoints.length) {
      usedEvidence.pop()
      continue
    }
    const index = result.length
    const scene: Scene = {
      id: index + 1,
      section: Math.floor(index / SLIDES_PER_SECTION) + 1,
      slideInSection: (index % SLIDES_PER_SECTION) + 1,
      title,
      duration: TEMPLATE_SLIDE_SECONDS,
      narration,
      visual: asset ? `Repository image: ${assetLabel}` : `Material focus: ${title}`,
      bullets: buildEvidenceBullets(evidence, title),
      asset,
      assets: asset ? [asset] : [],
      assetLabel,
      assetMatch: assetSelection?.match ?? null,
      supportingPoints,
    }
    if (!hasUniqueSlideContent([...result, scene])) {
      usedEvidence.pop()
      continue
    }
    result.push(scene)
  }
  if (result.length !== 50) throw new Error(`Cloudy found ${result.length} distinct material passages, but 50 are required. Add more substantive README or English docs content and try again.`)
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

function StudioLanding({ onSelect }: { onSelect: (mode: Exclude<StudioMode, 'landing'>) => void }) {
  return (
    <main className="studio-landing">
      <header className="landing-topbar">
        <div className="landing-brand" aria-label="Cloudy Video Studio">
          <CloudyAvatar size={48} />
          <span><strong>Cloudy</strong><small>Cloud2BR Video Studio</small></span>
        </div>
      </header>
      <section className="landing-content" aria-labelledby="studio-choice-title">
        <div className="landing-intro">
          <p className="eyebrow">Cloud2BR production desk</p>
          <h1 id="studio-choice-title">Choose your video format.</h1>
          <p>Turn public repository documentation into a detailed overview or a concise narrated short.</p>
        </div>
        <div className="mode-grid">
          <article className="mode-card overview-mode">
            <div className="mode-card-visual" aria-hidden="true">
              <CloudyAvatar size={116} />
              <span className="mode-frame frame-one"></span>
              <span className="mode-frame frame-two"></span>
            </div>
            <div className="mode-card-copy">
              <p className="eyebrow">Long form</p>
              <h2>Cloudy YouTube Overview Videos</h2>
              <p>Build a documented 8-12 minute explainer with an editable 50-slide storyboard, narration, captions, chapters, and publishing assets.</p>
              <button className="primary-button" type="button" onClick={() => onSelect('overview')}>Open overview studio</button>
            </div>
          </article>
          <article className="mode-card shorts-mode">
            <div className="shorts-card-visual" aria-hidden="true">
              <span className="shorts-signal signal-one"></span>
              <span className="shorts-signal signal-two"></span>
              <div className="shorts-phone"><CloudyAvatar size={76} /><span>60s</span></div>
            </div>
            <div className="mode-card-copy">
              <p className="eyebrow">Short form</p>
              <h2>Cloudy Short Videos</h2>
              <p>Create a one-minute, story-led explanation of a repository topic. Cloudy assembles a compact script and a reusable visual asset library from the documentation.</p>
              <button className="primary-button" type="button" onClick={() => onSelect('shorts')}>Open Shorts studio</button>
            </div>
          </article>
        </div>
      </section>
    </main>
  )
}

function App() {
  const [studioMode, setStudioMode] = useState<StudioMode>('landing')
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
  const [pausedVideoPreviewIndex, setPausedVideoPreviewIndex] = useState<number | null>(null)
  const [playbackSpeed, setPlaybackSpeed] = useState<(typeof PLAYBACK_SPEED_OPTIONS)[number]>(1)
  const [shortTopicId, setShortTopicId] = useState(1)
  const [isShortPreviewPlaying, setIsShortPreviewPlaying] = useState(false)
  const renderAbortRef = useRef(false)
  const renderAbortControllerRef = useRef<AbortController | null>(null)
  const videoPreviewAbortRef = useRef(false)
  const videoPreviewSceneIdxRef = useRef(0)
  const videoPreviewRunIdRef = useRef(0)
  const repositoryLoadAbortRef = useRef<AbortController | null>(null)
  const repositoryLoadIdRef = useRef(0)
  const totalDuration = scenes.reduce((total, scene) => total + scene.duration, 0)
  const effectiveTotalDuration = scenes.reduce((total, scene) => total + effectiveSceneDuration(scene, playbackSpeed), 0)
  const selectedScene = scenes.find((scene) => scene.id === selectedSceneId) ?? scenes[0]
  const selectedSceneIndex = scenes.findIndex((scene) => scene.id === selectedScene.id)
  const hasRepository = Boolean(repository)
  const inTargetRange = hasRepository && totalDuration >= 480 && totalDuration <= 720
  const narrationReady = hasRepository && scenes.length > 0 && scenes.every((scene) => scene.title.trim().length > 0 && scene.narration.trim().length > 0)
  const uniqueSlidesReady = hasRepository && scenes.length === 50 && hasUniqueSlideContent(scenes)
  const visualsReady = hasRepository && scenes.every((scene) => (scene.assetMatch === 'authored' && scene.asset) || scene.supportingPoints.length > 0)
  const visualNarrationReady = visualsReady && hasVisualNarrationAlignment(scenes)
  const captionsReady = hasRepository && narrationReady && scenes.every((scene) => Number.isFinite(scene.duration) && scene.duration > 0)
  const presentationNarrationReady = narrationReady && hasNarratedPresentationContent(scenes)
  const isExportReady = hasRepository && inTargetRange && narrationReady && uniqueSlidesReady && visualsReady && visualNarrationReady && captionsReady && presentationNarrationReady
  const cloudyLogo = new URL('./assets/branding/cloudy-logo.png', import.meta.url).href
  const apiHeaders: Record<string, string> = {
    Accept: 'application/vnd.github+json',
  }
  const videoPreviewScene = scenes[videoPreviewSceneIdx] ?? scenes[0]
  const presentedScene = isVideoPreviewPlaying ? videoPreviewScene : selectedScene
  const presentedAsset = presentedScene.asset
  const shortTopic = scenes.find((scene) => scene.id === shortTopicId) ?? scenes[0]
  const shortSourceScenes = scenes.filter((scene) => scene.section === shortTopic.section).slice(0, 5)
  const shortNarration = shortSourceScenes.map((scene) => scene.narration).join(' ')
  const shortRuntime = shortSourceScenes.reduce((total, scene) => total + effectiveSceneDuration(scene, playbackSpeed), 0)
  const shortAssetEntries = [
    { kind: 'cloudy', name: 'Cloudy host', detail: 'Narrator and guide', image: null },
    { kind: 'concept', name: shortTopic.title, detail: 'Primary concept', image: null },
    ...(shortTopic.assets.slice(0, 3).map((asset) => ({ kind: 'source', name: repositoryAssetLabel(asset), detail: 'Repository visual', image: asset }))),
    ...((repository?.topics ?? []).slice(0, 2).map((topic) => ({ kind: 'topic', name: topic, detail: 'Topic object', image: null }))),
  ]

  async function loadRepository(value: string) {
    const parsed = parseRepositoryUrl(value)
    if (!parsed) {
      setStatus('Paste a GitHub repository URL such as https://github.com/owner/repository.')
      return
    }
    repositoryLoadAbortRef.current?.abort()
    const loadId = ++repositoryLoadIdRef.current
    const loadController = new AbortController()
    repositoryLoadAbortRef.current = loadController
    const timeoutId = window.setTimeout(() => loadController.abort('timeout'), 60_000)
    setIsLoading(true)
    setStatus('Reviewing the repository README, folders, and images...')
    try {
      const [repositoryResponse, readmeResponse] = await Promise.all([
        fetchWithRetry(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}`, {
          headers: apiHeaders,
          signal: loadController.signal,
        }),
        fetchWithRetry(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}/readme`, { headers: apiHeaders, signal: loadController.signal }),
      ])
      if (!repositoryResponse.ok) {
        if (repositoryResponse.status === 404) throw new Error('Repository not found. Confirm that it is public and the URL is correct.')
        if (repositoryResponse.status === 403) throw new Error('GitHub API access is temporarily limited. Wait a few minutes and try again.')
        throw new Error(`GitHub could not read this repository (${repositoryResponse.status}).`)
      }
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
      setStatus('Repository found. Reading English documentation and visuals...')
      const treeResponse = await fetchWithRetry(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}/git/trees/${encodeURIComponent(data.default_branch)}?recursive=1`, { headers: apiHeaders, signal: loadController.signal })
      if (!treeResponse.ok) throw new Error(`GitHub could not read the repository files (${treeResponse.status}).`)
      const treeData = treeResponse.ok
        ? ((await treeResponse.json()) as {
            tree?: Array<{ path: string; type: string; size?: number }>
          })
        : null
      const treeEntries = treeData?.tree ?? []
      const documentationPaths = treeEntries
        .filter((entry) => entry.type === 'blob' && isEnglishDocumentationPath(entry.path) && (entry.size ?? 0) <= 500_000)
        .sort((left, right) => {
          const languagePriority = documentationLanguagePriority(right.path) - documentationLanguagePriority(left.path)
          return languagePriority || repositoryFileScore(right.path) - repositoryFileScore(left.path) || left.path.localeCompare(right.path)
        })
        .filter((entry, index, entries) => entries.findIndex((candidate) => documentationContentKey(candidate.path) === documentationContentKey(entry.path)) === index)
        .map((entry) => entry.path)
        .slice(0, 24)
      const documentationTexts = await Promise.all(
        documentationPaths.map(async (path) => {
          try {
            const response = await fetchWithRetry(`https://raw.githubusercontent.com/${parsed.owner}/${parsed.repo}/${encodeURIComponent(data.default_branch)}/${path.split('/').map(encodeURIComponent).join('/')}`, { signal: loadController.signal }, 2)
            return response.ok ? response.text() : ''
          } catch {
            if (loadController.signal.aborted) throw new DOMException('Repository load aborted', 'AbortError')
            return ''
          }
        }),
      )
      const documentation = documentationTexts.filter(Boolean).join('\n\n')
      const documentationFileCount = documentationTexts.filter(Boolean).length
      const storyboardSource = documentation || readmeText
      const repositoryImages = treeEntries
        .filter(
          (entry) =>
            entry.type === 'blob' &&
            !isExcludedRepositoryPath(entry.path) &&
            isIllustrativeImage(entry.path) &&
            isEnglishImagePath(entry.path) &&
            !/(^|\/)(node_modules|vendor|dist|build|coverage|\.next)(\/|$)/i.test(entry.path) &&
            (entry.size ?? 0) <= 10_000_000,
        )
        .sort((left, right) => repositoryImageScore(right.path) - repositoryImageScore(left.path))
        .map((entry) => `https://raw.githubusercontent.com/${parsed.owner}/${parsed.repo}/${encodeURIComponent(data.default_branch)}/${entry.path.split('/').map(encodeURIComponent).join('/')}`)
      const assets = Array.from(new Set([...readmeImages, ...repositoryImages])).slice(0, 100)
      const newRepo: Repository = {
        fullName: data.full_name,
        description: data.description ?? 'No repository description was provided.',
        topics: data.topics ?? [],
        language: data.language,
        defaultBranch: data.default_branch,
        license: data.license?.spdx_id ?? 'No license detected',
        stars: data.stargazers_count,
        openIssues: data.open_issues_count,
        readme: storyboardSource,
        documentation,
        assets,
      }
      setStatus('Repository content loaded. Building 50 distinct slides...')
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()))
      if (loadController.signal.aborted) throw new DOMException('Repository load aborted', 'AbortError')
      const generatedScenes = buildScenes(newRepo)
      setRepositoryUrl(`https://github.com/${data.full_name}`)
      setRepository(newRepo)
      setScenes(generatedScenes)
      setSelectedSceneId(generatedScenes[0].id)
      setShortTopicId(generatedScenes[0].id)
      const matchedImageCount = generatedScenes.filter((scene) => scene.asset).length
      const imageNote = assets.length ? `${matchedImageCount} slide${matchedImageCount === 1 ? '' : 's'} received a verified topic-matched image; unmatched slides use the material-focused placeholder.` : 'No English or default-language images found — Cloudy will present with a branded placeholder.'
      const documentationNote = documentationFileCount ? `Grounded in the main README and ${documentationFileCount} English documentation file${documentationFileCount === 1 ? '' : 's'}.` : 'No English docs/ Markdown files were loaded; using the main README and repository structure.'
      setStatus(`Storyboard ready: ${generatedScenes.length} unique slides, ${SLIDES_PER_SECTION} per section, ${durationLabel(generatedScenes.reduce((total, scene) => total + scene.duration, 0))} total. ${documentationNote} ${imageNote}`)
    } catch (error) {
      if (loadId !== repositoryLoadIdRef.current) return
      if (loadController.signal.reason === 'timeout') {
        setStatus('GitHub took too long to respond. Check your connection and try again.')
      } else if (!(error instanceof DOMException && error.name === 'AbortError')) {
        setStatus(error instanceof Error ? error.message : 'The repository could not be read. Check repository access and try again.')
      }
    } finally {
      window.clearTimeout(timeoutId)
      if (loadId === repositoryLoadIdRef.current) {
        repositoryLoadAbortRef.current = null
        setIsLoading(false)
      }
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
    downloadFile(`cloudy-video-project-${speedLabel(playbackSpeed)}.json`, JSON.stringify({ repositoryUrl, repository, scenes, playbackSpeed, runtime: effectiveTotalDuration }, null, 2), 'application/json')
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
        cursor += effectiveSceneDuration(scene, playbackSpeed)
        return `${index + 1}\n${start} --> ${timestamp(cursor)}\n${scene.narration}`
      })
      .join('\n\n')
    downloadFile(`cloudy-captions-${speedLabel(playbackSpeed)}.srt`, content, 'application/x-subrip')
    setStatus('Editable SRT captions downloaded.')
  }
  function exportWebVtt() {
    if (!isExportReady) {
      setStatus('Complete every export requirement before downloading captions.')
      return
    }
    let cursor = 0
    const content = scenes
      .map((scene) => {
        const start = timestamp(cursor).replace(',', '.')
        cursor += effectiveSceneDuration(scene, playbackSpeed)
        return `${start} --> ${timestamp(cursor).replace(',', '.')}\n${scene.narration}`
      })
      .join('\n\n')
    downloadFile(`cloudy-captions-${speedLabel(playbackSpeed)}.vtt`, `WEBVTT\n\n${content}\n`, 'text/vtt')
    setStatus('WebVTT captions downloaded. Add this file as the captions track when publishing the video.')
  }
  function exportTranscript() {
    if (!isExportReady) {
      setStatus('Complete every export requirement before downloading the transcript.')
      return
    }
    const content = scenes
      .map((scene, index) => `Slide ${index + 1}: ${scene.title}\n\n${scene.narration}`)
      .join('\n\n')
    downloadFile(`cloudy-video-transcript-${speedLabel(playbackSpeed)}.txt`, `Playback speed: ${speedLabel(playbackSpeed)}\n\n${content}`, 'text/plain')
    setStatus('Plain-text video transcript downloaded.')
  }
  function exportDescriptiveTranscript() {
    if (!isExportReady) {
      setStatus('Complete every export requirement before downloading the descriptive transcript.')
      return
    }
    let cursor = 0
    const content = scenes
      .map((scene, index) => {
        const visualDescription = scene.assets.length
          ? `Repository visual: ${scene.assets.map(repositoryAssetLabel).join('; ')}`
          : `Presentation content: ${scene.supportingPoints.join('; ')}`
        const entry = `[${timestamp(cursor).replace(',', '.')}] Slide ${index + 1}: ${scene.title}\nVisual description: ${visualDescription}\nNarration: ${scene.narration}`
        cursor += effectiveSceneDuration(scene, playbackSpeed)
        return entry
      })
      .join('\n\n')
    downloadFile(`cloudy-descriptive-transcript-${speedLabel(playbackSpeed)}.txt`, content, 'text/plain')
    setStatus('Descriptive transcript downloaded.')
  }
  function exportChapters() {
    if (!isExportReady) {
      setStatus('Complete every export requirement before downloading chapters.')
      return
    }
    let cursor = 0
    const chapters = scenes
      .filter((scene) => scene.slideInSection === 1)
      .map((scene) => {
        const totalSeconds = cursor
        const label = `Section ${scene.section}: ${scene.title}`
        cursor += scenes.filter((item) => item.section === scene.section).reduce((total, item) => total + effectiveSceneDuration(item, playbackSpeed), 0)
        return `${chapterTimestamp(totalSeconds)} ${label}`
      })
    downloadFile(`cloudy-youtube-chapters-${speedLabel(playbackSpeed)}.txt`, chapters.join('\n'), 'text/plain')
    setStatus('YouTube chapter markers downloaded.')
  }
  function exportPublishingPackage() {
    if (!isExportReady || !repository) {
      setStatus('Complete every export requirement before downloading the publishing package.')
      return
    }
    let cursor = 0
    const chapters = scenes
      .filter((scene) => scene.slideInSection === 1)
      .map((scene) => {
        const label = `${chapterTimestamp(cursor)} Section ${scene.section}: ${scene.title}`
        cursor += scenes.filter((item) => item.section === scene.section).reduce((total, item) => total + effectiveSceneDuration(item, playbackSpeed), 0)
        return label
      })
      .join('\n')
    const transcript = scenes
      .map((scene, index) => `### ${index + 1}. ${scene.title}\n\n${scene.narration}`)
      .join('\n\n')
    const content = `# ${repository.fullName} | Cloudy Overview\n\n## Video details\n\n- Runtime: ${durationLabel(effectiveTotalDuration)}\n- Playback speed: ${speedLabel(playbackSpeed)}\n- Source: ${repositoryUrl}\n- Language: English\n- Captions: Upload cloudy-captions-${speedLabel(playbackSpeed)}.vtt as the English captions track.\n\n## Description\n\n${repository.description}\n\nThis overview is grounded in the public repository documentation and visuals.\n\n## Chapters\n\n${chapters}\n\n## Accessibility assets\n\n- cloudy-captions-${speedLabel(playbackSpeed)}.srt\n- cloudy-captions-${speedLabel(playbackSpeed)}.vtt\n- cloudy-video-transcript-${speedLabel(playbackSpeed)}.txt\n- cloudy-descriptive-transcript-${speedLabel(playbackSpeed)}.txt\n\n## Transcript\n\n${transcript}\n`
    downloadFile(`cloudy-publishing-package-${speedLabel(playbackSpeed)}.md`, content, 'text/markdown')
    setStatus('Publishing package downloaded with video details, chapters, captions guidance, and transcript.')
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
    const usedAssets = Array.from(new Set(scenes.flatMap((scene) => scene.assets)))
    const assetImages = await Promise.all(usedAssets.map((asset) => loadImage(asset).catch(() => null)))
    const assetImageByUrl = new Map(usedAssets.map((asset, index) => [asset, assetImages[index]]))
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
    const totalSeconds = scenes.reduce((total, scene) => total + effectiveSceneDuration(scene, playbackSpeed), 0)
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
          sceneOffset += effectiveSceneDuration(item, playbackSpeed)
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
        source.playbackRate.value = VOICE_RATE * playbackSpeed
        source.connect(audioDestination)
        source.addEventListener('ended', () => {
          if (activeNarrationSource === source) setIsSpeaking(false)
        })
        activeNarrationSource = source
        setIsSpeaking(true)
        source.start()
      }
      const sceneDuration = effectiveSceneDuration(scene, playbackSpeed)
      const sceneElapsed = elapsedSeconds - (sceneOffset - sceneDuration)
      const sceneProgress = Math.min(1, sceneElapsed / sceneDuration)
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
      const titleLayout = fitCanvasText(context, scene.title, leftW, 200, scene.title.length > 20 ? 70 : 86, 34, '800')
      context.font = `800 ${titleLayout.fontSize}px Manrope, sans-serif`
      titleLayout.lines.forEach((line, index) => context.fillText(line, 100, 220 + index * titleLayout.lineHeight))
      context.restore()

      // Bullet points
      const bullets = scene.bullets ?? extractBullets(scene.narration)
      bullets.forEach((bullet, i) => {
        const alpha = Math.min(1, (eased - i * 0.15) / 0.4)
        if (alpha <= 0) return
        context.save()
        context.globalAlpha = alpha
        const bulletLayout = fitCanvasText(context, bullet, leftW - 128, 320 / Math.max(bullets.length, 1), 34, 16)
        const by = 450 + i * (320 / Math.max(bullets.length, 1))
        context.fillStyle = '#f5a975'
        context.beginPath()
        context.arc(108, by - 9, 6, 0, Math.PI * 2)
        context.fill()
        context.fillStyle = '#e4f0e8'
        context.font = `400 ${bulletLayout.fontSize}px Manrope, sans-serif`
        bulletLayout.lines.forEach((line, index) => context.fillText(line, 128, by + index * bulletLayout.lineHeight))
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
      } else {
        context.fillStyle = '#f5fafc'
        context.fillRect(rightX, 140, rightW, 700)
        const pointsLayout = fitCanvasPoints(context, scene.supportingPoints, rightW - 130, 510)
        context.fillStyle = '#294f4b'
        context.font = `400 ${pointsLayout.fontSize}px Manrope, sans-serif`
        let pointY = 220
        pointsLayout.linesByPoint.forEach((lines) => {
          context.fillStyle = '#d76639'
          context.beginPath()
          context.arc(rightX + 52, pointY - 9, 6, 0, Math.PI * 2)
          context.fill()
          context.fillStyle = '#294f4b'
          lines.forEach((line, index) => context.fillText(line, rightX + 78, pointY + index * pointsLayout.lineHeight))
          pointY += lines.length * pointsLayout.lineHeight + pointsLayout.lineHeight
        })
      }

      context.fillStyle = 'rgba(10, 31, 29, .84)'
      context.fillRect(0, 868, canvas.width, 172)
      context.fillStyle = 'rgba(245,169,117,.9)'
      context.font = '700 22px Manrope, sans-serif'
      context.fillText('CLOUDY IS SAYING:', 80, 906)
      context.fillStyle = '#ffffff'
      const narrationLayout = fitCanvasText(context, scene.narration, 1_750, 102, 30, 14)
      context.font = `400 ${narrationLayout.fontSize}px Manrope, sans-serif`
      narrationLayout.lines.forEach((line, index) => context.fillText(line, 80, 938 + index * narrationLayout.lineHeight))

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

      // Embed the publisher mark in every exported frame.
      const watermarkX = canvas.width - 198
      context.save()
      context.globalAlpha = 0.58
      context.shadowColor = 'rgba(0, 0, 0, .65)'
      context.shadowBlur = 5
      context.shadowOffsetY = 1
      context.fillStyle = '#d9eef6'
      context.font = '700 22px Manrope, sans-serif'
      context.fillText('Cloud2BR', watermarkX, canvas.height - 30)
      context.restore()

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
    link.download = `cloudy-video-${speedLabel(playbackSpeed)}.webm`
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
    const assistantVoices = /siri|samantha|ava|aria|jenny|sonia|natasha|libby|serena|alloy|nova/i
    const femaleNames = /zira|victoria|hazel|susan|karen|moira|tessa|fiona|allison|erin|eva|vicki|joanna|ivy|kendra|kimberly|salli|nicole|naja|marlene|mathilde/i
    const assistantVoice = voices.find((voice) => assistantVoices.test(voice.name) && voice.lang.startsWith('en'))
    const female = assistantVoice ?? voices.find((voice) => femaleNames.test(voice.name) && voice.lang.startsWith('en')) ?? voices.find((voice) => /female/i.test(voice.name)) ?? voices.find((voice) => voice.lang.startsWith('en-') && !/david|mark|james|alex|daniel|rishi|george|ryan/i.test(voice.name))
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
    utterance.rate = VOICE_RATE * playbackSpeed
    utterance.pitch = 1
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)
    setIsSpeaking(true)
    setStatus(femaleVoice ? `Cloudy is speaking with ${femaleVoice.name}.` : 'No female voice found. Using browser default.')
  }

  async function startVideoPreview(startIndex = 0) {
    if (isVideoPreviewPlaying) return
    const runId = ++videoPreviewRunIdRef.current
    videoPreviewAbortRef.current = false
    setIsVideoPreviewPlaying(true)
    setPausedVideoPreviewIndex(null)
    videoPreviewSceneIdxRef.current = startIndex
    setVideoPreviewSceneIdx(startIndex)
    const voice = await resolveVoice()
    for (let i = startIndex; i < scenes.length; i++) {
      if (videoPreviewAbortRef.current || runId !== videoPreviewRunIdRef.current) break
      videoPreviewSceneIdxRef.current = i
      setVideoPreviewSceneIdx(i)
      await new Promise<void>((resolve) => {
        window.speechSynthesis.cancel()
        const utterance = new SpeechSynthesisUtterance(scenes[i].narration)
        utterance.voice = voice
        utterance.lang = voice?.lang ?? 'en-US'
        utterance.rate = VOICE_RATE * playbackSpeed
        utterance.pitch = 1
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
      if (!videoPreviewAbortRef.current && runId === videoPreviewRunIdRef.current && i < scenes.length - 1) {
        await new Promise<void>((resolve) => window.setTimeout(resolve, 350))
      }
    }
    if (runId !== videoPreviewRunIdRef.current) return
    window.speechSynthesis.cancel()
    setIsSpeaking(false)
    setIsVideoPreviewPlaying(false)
    if (!videoPreviewAbortRef.current) {
      videoPreviewSceneIdxRef.current = 0
      setVideoPreviewSceneIdx(0)
    }
  }

  function pauseVideoPreview() {
    const pausedIndex = videoPreviewSceneIdxRef.current
    videoPreviewRunIdRef.current += 1
    videoPreviewAbortRef.current = true
    window.speechSynthesis.cancel()
    setIsSpeaking(false)
    setIsVideoPreviewPlaying(false)
    setPausedVideoPreviewIndex(pausedIndex)
    setSelectedSceneId(scenes[pausedIndex]?.id ?? scenes[0].id)
    setStatus(`Presentation paused at slide ${pausedIndex + 1} of ${scenes.length}.`)
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

  async function previewShort() {
    if (isShortPreviewPlaying || !shortNarration) return
    window.speechSynthesis.cancel()
    const voice = await resolveVoice()
    const utterance = new SpeechSynthesisUtterance(shortNarration)
    utterance.voice = voice
    utterance.lang = voice?.lang ?? 'en-US'
    utterance.rate = VOICE_RATE * playbackSpeed
    utterance.pitch = 1
    utterance.onend = () => setIsShortPreviewPlaying(false)
    utterance.onerror = () => setIsShortPreviewPlaying(false)
    window.speechSynthesis.speak(utterance)
    setIsShortPreviewPlaying(true)
    setStatus(`Cloudy is previewing the ${durationLabel(shortRuntime)} short at ${speedLabel(playbackSpeed)}.`)
  }

  function stopShortPreview() {
    window.speechSynthesis.cancel()
    setIsShortPreviewPlaying(false)
    setStatus('Cloudy Shorts preview stopped.')
  }

  function downloadShortScript() {
    if (!repository || !shortNarration) return
    const beats = shortSourceScenes.map((scene, index) => `${index + 1}. ${scene.title}\n${scene.narration}`).join('\n\n')
    const assets = shortAssetEntries.map((asset) => `- ${asset.name}: ${asset.detail}`).join('\n')
    const content = `# Cloudy Short: ${shortTopic.title}\n\n- Repository: ${repository.fullName}\n- Runtime: ${durationLabel(shortRuntime)} at ${speedLabel(playbackSpeed)}\n- Format: Vertical short\n\n## Narration\n\n${shortNarration}\n\n## Story beats\n\n${beats}\n\n## Production assets\n\n${assets}\n`
    downloadFile(`cloudy-short-${normalizedSentence(shortTopic.title).replace(/\s+/g, '-') || 'topic'}.md`, content, 'text/markdown')
    setStatus('Cloudy Shorts script downloaded.')
  }

  if (studioMode === 'landing') {
    return <StudioLanding onSelect={setStudioMode} />
  }

  if (studioMode === 'shorts') {
    return (
      <main className="shorts-shell">
        <header className="topbar studio-topbar">
          <button className="brand brand-button" type="button" onClick={() => setStudioMode('landing')}>
            <img src={cloudyLogo} alt="Cloudy" />
            <span><strong>Cloudy</strong><small>Cloud2BR Video Studio</small></span>
          </button>
          <nav className="studio-mode-tabs" aria-label="Video studios">
            <button type="button" onClick={() => setStudioMode('overview')}>Overview videos</button>
            <button type="button" className="active" aria-current="page">Cloudy Shorts</button>
          </nav>
        </header>
        <section className="shorts-workspace">
          <div className="shorts-heading">
            <div>
              <p className="eyebrow">Short-form story studio</p>
              <h1>Turn a documented topic into a one-minute Cloudy story.</h1>
            </div>
            <p className="status" aria-live="polite">{status}</p>
          </div>
          {!repository ? (
            <form className="shorts-source" onSubmit={(event) => { event.preventDefault(); void loadRepository(repositoryUrl) }}>
              <label htmlFor="shorts-repository-url">Public GitHub repository</label>
              <div className="url-entry">
                <input id="shorts-repository-url" type="text" inputMode="url" autoCapitalize="none" spellCheck={false} value={repositoryUrl} onChange={(event) => setRepositoryUrl(event.target.value)} placeholder="https://github.com/owner/repository" />
                <button className="primary-button" type="submit" disabled={isLoading}>{isLoading ? 'Reading...' : 'Build Shorts library'}</button>
              </div>
              <p>Cloudy will use English documentation and linked repository visuals to build short-form story material.</p>
            </form>
          ) : (
            <>
              <section className="shorts-controls" aria-label="Short video controls">
                <label htmlFor="short-topic">Topic to explain</label>
                <select id="short-topic" value={shortTopic.id} onChange={(event) => setShortTopicId(Number(event.target.value))} disabled={isShortPreviewPlaying}>
                  {scenes.map((scene) => <option key={scene.id} value={scene.id}>{scene.title}</option>)}
                </select>
                <span className="shorts-runtime">{durationLabel(shortRuntime)} short</span>
                {isShortPreviewPlaying ? (
                  <button className="secondary-button" type="button" onClick={stopShortPreview}>Stop preview</button>
                ) : (
                  <button className="primary-button" type="button" onClick={() => void previewShort()}>Preview short</button>
                )}
                <button className="secondary-button" type="button" onClick={downloadShortScript}>Download short script</button>
              </section>
              <section className="shorts-production-grid">
                <article className="short-stage" aria-label={`Cloudy Short preview: ${shortTopic.title}`}>
                  <div className="short-stage-copy">
                    <p className="eyebrow">Cloudy Short</p>
                    <h2>{shortTopic.title}</h2>
                    <p>{shortNarration}</p>
                  </div>
                  <div className="short-stage-host">
                    <CloudyAvatar speaking={isShortPreviewPlaying} size={156} />
                    <span>{durationLabel(shortRuntime)}</span>
                  </div>
                  <span className="shorts-watermark" aria-hidden="true">Cloud2BR</span>
                </article>
                <aside className="shorts-library" aria-labelledby="shorts-library-title">
                  <div>
                    <p className="eyebrow">Production assets</p>
                    <h2 id="shorts-library-title">Topic-aware library</h2>
                  </div>
                  <div className="short-asset-grid">
                    {shortAssetEntries.map((asset, index) => (
                      <article className={`short-asset ${asset.kind}`} key={`${asset.kind}-${asset.name}-${index}`}>
                        {asset.image ? <img src={asset.image} alt={`Repository asset: ${asset.name}`} /> : asset.kind === 'cloudy' ? <CloudyAvatar size={48} /> : <span className="short-asset-token">{asset.name.slice(0, 2).toUpperCase()}</span>}
                        <strong>{asset.name}</strong>
                        <small>{asset.detail}</small>
                      </article>
                    ))}
                  </div>
                </aside>
              </section>
              <section className="shorts-beats" aria-labelledby="shorts-beats-title">
                <div><p className="eyebrow">Narrative sequence</p><h2 id="shorts-beats-title">Five documented beats</h2></div>
                <ol>{shortSourceScenes.map((scene) => <li key={scene.id}><span>{String(scene.slideInSection).padStart(2, '0')}</span><div><strong>{scene.title}</strong><p>{scene.narration}</p></div></li>)}</ol>
              </section>
            </>
          )}
        </section>
      </main>
    )
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="brand brand-button" type="button" onClick={() => setStudioMode('landing')}>
          <img src={cloudyLogo} alt="Cloudy" />
          <span>
            <strong>Cloudy</strong>
            <small>Repository Video Studio</small>
          </span>
        </button>
        <nav className="studio-mode-tabs" aria-label="Video studios">
          <button type="button" className="active" aria-current="page">Overview videos</button>
          <button type="button" onClick={() => setStudioMode('shorts')}>Cloudy Shorts</button>
        </nav>
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
          <form className="repository-form" id="source-section" onSubmit={(event) => { event.preventDefault(); void loadRepository(repositoryUrl) }}>
            <p className="eyebrow">Public repository</p>
            <label htmlFor="repository-url">GitHub repository URL</label>
            <div className="url-entry">
              <input id="repository-url" type="text" inputMode="url" autoCapitalize="none" spellCheck={false} value={repositoryUrl} onChange={(event) => setRepositoryUrl(event.target.value)} placeholder="https://github.com/owner/repository" />
              <button className="primary-button" type="submit" disabled={isLoading}>
                {isLoading ? 'Reading...' : 'Generate explainer'}
              </button>
            </div>
            <p>Cloudy reads public repository details only. Private repositories are not available in this browser-only version.</p>
          </form>
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
                  {repository.assets.slice(0, 12).map((asset) => (
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
                  {durationLabel(effectiveTotalDuration)} <small>{speedLabel(playbackSpeed)} playback · {inTargetRange ? '10-minute base template' : 'Target: 8-12 min base template'}</small>
                </div>
              </div>
              <div className="story-grid">
                <div className="scene-picker">
                  <label htmlFor="scene-select">Choose a slide</label>
                  <div className="scene-picker-controls">
                    <button
                      type="button"
                      className="scene-arrow"
                      aria-label="Previous slide"
                      title="Previous slide"
                      disabled={selectedSceneIndex <= 0}
                      onClick={() => setSelectedSceneId(scenes[selectedSceneIndex - 1].id)}
                    >
                      ‹
                    </button>
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
                    <button
                      type="button"
                      className="scene-arrow"
                      aria-label="Next slide"
                      title="Next slide"
                      disabled={selectedSceneIndex >= scenes.length - 1}
                      onClick={() => setSelectedSceneId(scenes[selectedSceneIndex + 1].id)}
                    >
                      ›
                    </button>
                  </div>
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
                        <button className="primary-button" type="button" onClick={pauseVideoPreview}>
                          Pause
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
                          {pausedVideoPreviewIndex !== null && (
                            <button className="secondary-button" type="button" onClick={() => void startVideoPreview(pausedVideoPreviewIndex)} disabled={isSpeaking}>
                              &#9654; Resume slide {pausedVideoPreviewIndex + 1}
                            </button>
                          )}
                          <button className="primary-button" type="button" onClick={() => void startVideoPreview()} disabled={isSpeaking}>
                            &#9654; {pausedVideoPreviewIndex === null ? 'Play all' : 'Replay all'}
                          </button>
                        </>
                      )}
                      <label className="playback-speed" htmlFor="playback-speed">
                        Speed
                        <select id="playback-speed" value={playbackSpeed} onChange={(event) => setPlaybackSpeed(Number(event.target.value) as (typeof PLAYBACK_SPEED_OPTIONS)[number])} disabled={isVideoPreviewPlaying || isSpeaking}>
                          {PLAYBACK_SPEED_OPTIONS.map((speed) => <option key={speed} value={speed}>{speedLabel(speed)}</option>)}
                        </select>
                      </label>
                    </div>
                  </div>
                  <p className="sr-only" aria-live="polite" aria-atomic="true">
                    {isVideoPreviewPlaying
                      ? `Playing slide ${videoPreviewSceneIdx + 1} of ${scenes.length}: ${presentedScene.title}. ${presentedScene.narration}`
                      : `Selected slide ${selectedSceneIndex + 1} of ${scenes.length}: ${selectedScene.title}.`}
                  </p>
                  <div className={`slide-stage unified-stage ${isVideoPreviewPlaying ? 'is-playing' : ''}`} aria-label={`Video preview: ${presentedScene.title}`}>
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
                        <div className="slide-supporting-copy">
                          <ul>
                            {presentedScene.supportingPoints.map((point) => <li key={point}>{point}</li>)}
                          </ul>
                        </div>
                      )}
                      <figcaption className="sr-only">
                        {presentedScene.assets.length ? `Repository visuals for ${presentedScene.title}` : 'Supporting documented context'}
                      </figcaption>
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
                    <span className="preview-watermark" aria-hidden="true">Cloud2BR</span>
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
            <li className={uniqueSlidesReady ? 'done' : ''}>All 50 slides have distinct titles, narration, and evidence</li>
            <li className={visualsReady ? 'done' : ''}>Every slide has a visual or supporting content</li>
            <li className={visualNarrationReady ? 'done' : ''}>Narration relates to every visual</li>
            <li className={presentationNarrationReady ? 'done' : ''}>Cloudy narrates all displayed slide text</li>
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
              Download SRT captions
            </button>
            <button className="secondary-button" type="button" onClick={exportWebVtt} disabled={!isExportReady}>
              Download WebVTT captions
            </button>
            <button className="secondary-button" type="button" onClick={exportTranscript} disabled={!isExportReady}>
              Download transcript
            </button>
            <button className="secondary-button" type="button" onClick={exportDescriptiveTranscript} disabled={!isExportReady}>
              Download descriptive transcript
            </button>
            <button className="secondary-button" type="button" onClick={exportChapters} disabled={!isExportReady}>
              Download YouTube chapters
            </button>
            <button className="secondary-button" type="button" onClick={exportPublishingPackage} disabled={!isExportReady}>
              Download publishing package
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
