import { useRef, useState, useLayoutEffect, type CSSProperties } from 'react'
import './App.css'
import CloudyAvatar from './CloudyAvatar'

// Every short slide remains visible for at least this long, then extends until Cloudy finishes speaking.
const SHORT_SLIDE_SECONDS = 10

// Full library of short-form background templates. Order here defines their index in templateImages.
const SHORT_TEMPLATES = [
  { key: 'hero', url: new URL('./assets/templates/short-hero.svg', import.meta.url).href },
  { key: 'intro', url: new URL('./assets/templates/short-intro.svg', import.meta.url).href },
  { key: 'presenting', url: new URL('./assets/templates/short-presenting.svg', import.meta.url).href },
  { key: 'whiteboard', url: new URL('./assets/templates/short-whiteboard.svg', import.meta.url).href },
  { key: 'diagram', url: new URL('./assets/templates/short-diagram.svg', import.meta.url).href },
  { key: 'timeline', url: new URL('./assets/templates/short-timeline.svg', import.meta.url).href },
  { key: 'comparison', url: new URL('./assets/templates/short-comparison.svg', import.meta.url).href },
  { key: 'quote', url: new URL('./assets/templates/short-quote.svg', import.meta.url).href },
  { key: 'stats', url: new URL('./assets/templates/short-stats.svg', import.meta.url).href },
  { key: 'code', url: new URL('./assets/templates/short-code.svg', import.meta.url).href },
  { key: 'terminal', url: new URL('./assets/templates/short-terminal.svg', import.meta.url).href },
  { key: 'steps', url: new URL('./assets/templates/short-steps.svg', import.meta.url).href },
  { key: 'question', url: new URL('./assets/templates/short-question.svg', import.meta.url).href },
  { key: 'checklist', url: new URL('./assets/templates/short-checklist.svg', import.meta.url).href },
  { key: 'gallery', url: new URL('./assets/templates/short-gallery.svg', import.meta.url).href },
  { key: 'callout', url: new URL('./assets/templates/short-callout.svg', import.meta.url).href },
  { key: 'roadmap', url: new URL('./assets/templates/short-roadmap.svg', import.meta.url).href },
  { key: 'recap', url: new URL('./assets/templates/short-recap.svg', import.meta.url).href },
  { key: 'outro', url: new URL('./assets/templates/short-outro.svg', import.meta.url).href },
] as const

const SHORT_TEMPLATE_INDEX: Record<string, number> = Object.fromEntries(SHORT_TEMPLATES.map((template, index) => [template.key, index]))

type ShortRect = readonly [x: number, y: number, width: number, height: number]
type ShortTemplateLayout = {
  title: ShortRect
  items: readonly ShortRect[]
  media?: readonly ShortRect[]
  format?: 'caption' | 'code' | 'metric' | 'sequence' | 'statement'
  titleColor: string
  contentColor: string
  align?: 'left' | 'center'
  mono?: boolean
  // Plate = subtle backing panel that demarcates a text zone so text always fits legibly on top.
  dark?: boolean // dark background → dark translucent plate behind light text (else white plate)
  contentPlate?: boolean // draw plates behind items (for templates whose content area has no built-in card)
  noTitlePlate?: boolean // template already has a demarcated title area, skip the title plate
}

// Where the animated Cloudy avatar is overlaid (templates no longer bake in the mascot).
const SHORT_CLOUDY_RECT: ShortRect = [170, 315, 340, 320]
// Title sits in the left identity column ABOVE Cloudy (avatar centers around y=430), never over it.
const LEFT_TITLE: ShortRect = [80, 120, 505, 175]

const SHORT_TEMPLATE_LAYOUTS: Record<string, ShortTemplateLayout> = {
  hero: { title: [660, 300, 1120, 210], items: [[660, 560, 1060, 150]], format: 'statement', titleColor: '#ffffff', contentColor: '#cceee8', align: 'center', dark: true, contentPlate: true, noTitlePlate: true },
  intro: { title: [640, 150, 1165, 90], items: [[640, 285, 570, 92], [1235, 285, 570, 92], [640, 405, 570, 92], [1235, 405, 570, 92], [690, 630, 1050, 60]], format: 'caption', titleColor: '#153f39', contentColor: '#244b45' },
  presenting: { title: LEFT_TITLE, items: [[808, 165, 710, 54], [808, 255, 900, 210]], media: [[760, 120, 1020, 600]], titleColor: '#17384b', contentColor: '#17384b', contentPlate: true },
  whiteboard: { title: LEFT_TITLE, items: [[690, 300, 215, 105], [1100, 300, 180, 105], [1450, 300, 270, 105], [690, 540, 370, 100], [1320, 540, 400, 100]], titleColor: '#203946', contentColor: '#17384b', align: 'center' },
  diagram: { title: LEFT_TITLE, items: [[620, 215, 210, 130], [620, 545, 210, 130], [1120, 360, 330, 175]], titleColor: '#173c30', contentColor: '#173c30', align: 'center' },
  timeline: { title: LEFT_TITLE, items: [[620, 205, 260, 150], [900, 555, 260, 150], [1240, 205, 260, 150], [1520, 555, 260, 150]], format: 'sequence', titleColor: '#f2fdff', contentColor: '#17475b', align: 'center', dark: true },
  comparison: { title: LEFT_TITLE, items: [[665, 225, 470, 440], [1265, 225, 470, 440]], titleColor: '#303f78', contentColor: '#303f78', align: 'center' },
  quote: { title: LEFT_TITLE, items: [[700, 260, 1020, 360]], titleColor: '#eef5f2', contentColor: '#263f3d', align: 'center', dark: true },
  stats: { title: LEFT_TITLE, items: [[640, 210, 500, 180], [1200, 210, 500, 180], [640, 500, 500, 180], [1200, 500, 500, 180]], format: 'metric', titleColor: '#303f78', contentColor: '#303f78', align: 'center' },
  code: { title: LEFT_TITLE, items: [[725, 215, 940, 66], [725, 290, 940, 66], [725, 365, 940, 66], [725, 440, 940, 66], [725, 515, 940, 66]], format: 'code', titleColor: '#d9f2ef', contentColor: '#a5e0d9', mono: true, dark: true },
  terminal: { title: LEFT_TITLE, items: [[700, 215, 960, 66], [700, 290, 960, 66], [700, 365, 960, 66], [700, 440, 960, 66], [700, 515, 960, 66]], format: 'code', titleColor: '#d9f2ef', contentColor: '#a5e0d9', mono: true, dark: true },
  steps: { title: LEFT_TITLE, items: [[755, 165, 920, 75], [755, 295, 920, 75], [755, 425, 920, 75], [755, 555, 920, 75], [755, 685, 920, 75]], format: 'sequence', titleColor: '#592a1d', contentColor: '#74341f' },
  question: { title: LEFT_TITLE, items: [[820, 320, 900, 300]], titleColor: '#ffffff', contentColor: '#ffffff', align: 'center', dark: true, contentPlate: true },
  checklist: { title: LEFT_TITLE, items: [[755, 165, 920, 75], [755, 295, 920, 75], [755, 425, 920, 75], [755, 555, 920, 75], [755, 685, 920, 75]], format: 'sequence', titleColor: '#17384b', contentColor: '#17384b' },
  gallery: { title: LEFT_TITLE, items: [[780, 350, 450, 46], [1310, 350, 450, 46], [780, 640, 450, 46], [1310, 640, 450, 46]], media: [[760, 160, 490, 176], [1290, 160, 490, 176], [760, 450, 490, 176], [1290, 450, 490, 176]], format: 'caption', titleColor: '#24445a', contentColor: '#24445a', align: 'center', contentPlate: true },
  callout: { title: LEFT_TITLE, items: [[700, 270, 1000, 340]], titleColor: '#ffffff', contentColor: '#ffffff', align: 'center', dark: true, contentPlate: true },
  roadmap: { title: LEFT_TITLE, items: [[580, 560, 220, 95], [860, 300, 220, 95], [1140, 640, 220, 95], [1400, 275, 220, 95], [1620, 420, 220, 95]], titleColor: '#ffffff', contentColor: '#ffffff', align: 'center', dark: true, contentPlate: true },
  recap: { title: [640, 150, 1150, 90], items: [[690, 285, 460, 130], [1280, 285, 460, 130], [690, 495, 460, 130], [1280, 495, 460, 130]], titleColor: '#603419', contentColor: '#603419' },
  outro: { title: [890, 300, 700, 200], items: [[990, 535, 500, 120]], titleColor: '#ffffff', contentColor: '#e8dcff', align: 'center', dark: true, contentPlate: true, noTitlePlate: true },
}

function shortRectStyle([x, y, width, height]: ShortRect): CSSProperties {
  return { left: `${x / 19.2}%`, top: `${y / 10.8}%`, width: `${width / 19.2}%`, height: `${height / 10.8}%` }
}

// Content-aware keyword rules used to pick the most fitting template for each slide's text.
const SHORT_TEMPLATE_KEYWORDS: { key: string; pattern: RegExp }[] = [
  { key: 'code', pattern: /\b(code|function|class|method|api|syntax|variable|parameter|import|export|snippet)\b/i },
  { key: 'terminal', pattern: /\b(terminal|command|cli|bash|shell|run|install|npm|yarn|build|deploy|script|compile)\b/i },
  { key: 'comparison', pattern: /\b(compare|comparison|versus|vs\.?|difference|better|worse|pros|cons|trade-?off|alternative)\b/i },
  { key: 'steps', pattern: /\b(step|first|second|third|then|next|finally|process|setup|configure|guide|tutorial|follow)\b/i },
  { key: 'timeline', pattern: /\b(timeline|history|evolution|phase|stage|began|started|origin|milestone|over time)\b/i },
  { key: 'roadmap', pattern: /\b(roadmap|future|upcoming|vision|plan|goal|next steps|direction)\b/i },
  { key: 'stats', pattern: /\b(stat|statistic|number|percent|metric|performance|benchmark|faster|speed|growth|scale|users)\b/i },
  { key: 'quote', pattern: /\b(quote|said|according|philosophy|principle|belief|motto|says|famously)\b/i },
  { key: 'question', pattern: /\b(question|why|what if|ever wondered|imagine|consider|curious|ask yourself)\b/i },
  { key: 'checklist', pattern: /\b(checklist|requirement|ensure|must|need to|best practice|guideline|criteria|rules?)\b/i },
  { key: 'gallery', pattern: /\b(gallery|example|showcase|screenshot|visual|images?|photos?|demo|preview)\b/i },
  { key: 'callout', pattern: /\b(warning|important|caution|note|avoid|careful|mistake|pitfall|watch out|critical)\b/i },
  { key: 'diagram', pattern: /\b(diagram|architecture|structure|component|system|relationship|flow|module|layer|pipeline)\b/i },
  { key: 'whiteboard', pattern: /\b(concept|explain|idea|theory|learn|understand|fundamental|basics|principle)\b/i },
  { key: 'presenting', pattern: /\b(feature|overview|introduction|introduce|present|demo|capability|highlight|showcase)\b/i },
]

// Candidate body templates (hero/intro/recap/outro are reserved for opening and closing beats).
const SHORT_TEMPLATE_ROTATION = ['presenting', 'whiteboard', 'diagram', 'timeline', 'steps', 'stats', 'gallery', 'comparison', 'checklist', 'roadmap', 'code', 'terminal', 'quote', 'question', 'callout']

// Custom template system: JSON-defined templates for extensibility
type CustomTemplateDefinition = {
  key: string
  name: string
  svgUrl: string
  layout: {
    title: [number, number, number, number]
    items: Array<[number, number, number, number]>
    media?: Array<[number, number, number, number]>
    format?: 'caption' | 'code' | 'metric' | 'sequence' | 'statement'
    titleColor: string
    contentColor: string
    align?: 'left' | 'center'
    mono?: boolean
    dark?: boolean
    contentPlate?: boolean
    noTitlePlate?: boolean
  }
  keywords?: string[]
}

function validateCustomTemplate(data: unknown): data is CustomTemplateDefinition {
  if (typeof data !== 'object' || data === null) return false
  const template = data as CustomTemplateDefinition
  if (typeof template.key !== 'string' || template.key.length === 0) return false
  if (typeof template.name !== 'string') return false
  if (typeof template.svgUrl !== 'string' || !template.svgUrl.match(/^https?:\/\/.+\.svg$/i)) return false
  if (!template.layout || typeof template.layout !== 'object') return false
  if (!Array.isArray(template.layout.title) || template.layout.title.length !== 4) return false
  if (!Array.isArray(template.layout.items) || template.layout.items.length === 0) return false
  if (typeof template.layout.titleColor !== 'string') return false
  if (typeof template.layout.contentColor !== 'string') return false
  return true
}

function loadCustomTemplatesFromJson(json: string): CustomTemplateDefinition[] {
  try {
    const parsed = JSON.parse(json)
    const templates = Array.isArray(parsed) ? parsed : [parsed]
    return templates.filter(validateCustomTemplate)
  } catch (error) {
    console.error('Failed to parse custom templates JSON:', error)
    return []
  }
}

// Reserved for future full integration when template system is refactored
/*
function customTemplateToLayout(template: CustomTemplateDefinition): ShortTemplateLayout {
  return {
    title: template.layout.title as ShortRect,
    items: template.layout.items as readonly ShortRect[],
    media: template.layout.media as readonly ShortRect[] | undefined,
    format: template.layout.format,
    titleColor: template.layout.titleColor,
    contentColor: template.layout.contentColor,
    align: template.layout.align,
    mono: template.layout.mono,
    dark: template.layout.dark,
    contentPlate: template.layout.contentPlate,
    noTitlePlate: template.layout.noTitlePlate,
  }
}
*/

// Note: Custom templates foundation is in place. Full integration requires refactoring
// template selection functions to accept dynamic template sets as parameters.

function shortSlideDuration(playbackSpeed: number) {
  return SHORT_SLIDE_SECONDS / playbackSpeed
}

// How many text and media slots a template exposes — the basis for matching a template to content volume.
function shortTemplateCapacity(key: string) {
  const layout = SHORT_TEMPLATE_LAYOUTS[key]
  return { items: layout?.items.length ?? 0, media: layout?.media?.length ?? 0 }
}

// Score how well a template fits a slide: keyword relevance + how closely its slot count matches the
// amount of information available, so busy slides get grid templates and sparse slides get big-statement ones.
function scoreShortTemplate(key: string, text: string, pointCount: number, mediaCount: number) {
  const { items, media } = shortTemplateCapacity(key)
  let score = 0
  const keyword = SHORT_TEMPLATE_KEYWORDS.find((entry) => entry.key === key)
  if (keyword?.pattern.test(text)) score += 6
  // Smart detection bonus: boost steps template for tutorial content
  if (key === 'steps' && /\b(tutorial|guide|how to|step|walkthrough|numbered)\b/i.test(text)) score += 8
  // Smart detection bonus: boost comparison template for versus content
  if (key === 'comparison' && /\b(compar|versus|vs\.?|difference|alternative)\b/i.test(text)) score += 8
  // Smart detection bonus: boost stats template for metrics/benchmarks
  if (key === 'stats' && /\b(performance|benchmark|metric|speed|\d+(?:\.\d+)?(?:%|x|ms|faster))\b/i.test(text)) score += 8
  // Smart detection bonus: boost terminal/code templates for installation commands
  if ((key === 'terminal' || key === 'code') && /\b(npm|yarn|pip|cargo|install|setup)\b/i.test(text)) score += 6
  // Smart detection bonus: boost checklist for requirements/best practices
  if (key === 'checklist' && /\b(requirement|must|need to|best practice|guideline|ensure)\b/i.test(text)) score += 6
  if (media > 0) {
    // Image-led templates only make sense when the repository actually provides enough visuals.
    if (mediaCount >= media) score += 6
    else if (mediaCount >= 1) score += 1
    else score -= 8
  } else if (items > 0) {
    const filled = Math.min(items, pointCount)
    const emptySlots = Math.max(0, items - pointCount)
    const overflow = Math.max(0, pointCount - items)
    // Reward filled slots, penalise leaving slots empty, and gently penalise dropping extra points.
    score += filled * 1.6 - emptySlots * 1.4 - overflow * 0.3
    if (pointCount <= 1 && items === 1) score += 4 // single strong statement
    if (pointCount >= 4 && items >= 4) score += 2 // dense grid for dense content
  }
  return score
}

// Choose the best-fitting template for a slide from its content volume, media, keywords, and position.
function pickShortTemplateKey(text: string, pointCount: number, mediaCount: number, index: number, total: number, usedKeys: Set<string>) {
  if (index === 0) return 'hero'
  if (total > 1 && index === total - 1) return 'outro'
  const available = SHORT_TEMPLATE_ROTATION.filter((key) => !usedKeys.has(key))
  const pool = available.length ? available : SHORT_TEMPLATE_ROTATION
  let bestKey = pool[0]
  let bestScore = -Infinity
  pool.forEach((key, poolIndex) => {
    // Tiny position-based tiebreaker keeps variety when several templates score equally.
    const score = scoreShortTemplate(key, text, pointCount, mediaCount) - ((poolIndex + index) % pool.length) * 0.05
    if (score > bestScore) {
      bestScore = score
      bestKey = key
    }
  })
  return bestKey
}

// Build the per-slide template index list, matching each template to the slide's information volume.
function planShortTemplateIndices(slides: Scene[], repository: Repository | null) {
  const usedKeys = new Set<string>()
  return slides.map((slide, index) => {
    const pointCount = shortContentPool(slide, repository).length
    const mediaCount = slide.assets.length || (slide.asset ? 1 : 0)
    const key = pickShortTemplateKey(`${slide.title} ${slide.narration}`, pointCount, mediaCount, index, slides.length, usedKeys)
    usedKeys.add(key)
    return SHORT_TEMPLATE_INDEX[key] ?? 0
  })
}

type ShortAction = 'intro' | 'presenting' | 'whiteboard' | 'diagram' | 'farewell'

function shortActionForTemplate(templateKey: string): ShortAction {
  if (['recap', 'outro'].includes(templateKey)) return 'farewell'
  if (['diagram', 'roadmap'].includes(templateKey)) return 'diagram'
  if (['whiteboard', 'steps', 'timeline', 'checklist'].includes(templateKey)) return 'whiteboard'
  if (['presenting', 'comparison', 'stats', 'gallery', 'code', 'terminal'].includes(templateKey)) return 'presenting'
  return 'intro'
}

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

// User-configurable generation settings
type GenerationSettings = {
  slidesPerSection: number
  templateSlideDuration: number
  voiceRate: number
  narrationWordsPerMinute: number
  shortSlideDuration: number
  maxScenes: number
  includeMetrics: boolean
  // Custom branding
  customLogoUrl?: string
  customBrandName?: string
  customOutroMessage?: string
  customThemeColor?: string
  // Internationalization
  uiLanguage: 'en' | 'es' | 'pt' | 'fr' | 'de'
  detectRepositoryLanguage: boolean
}

const DEFAULT_SETTINGS: GenerationSettings = {
  slidesPerSection: 10,
  templateSlideDuration: 12,
  voiceRate: 1.15,
  narrationWordsPerMinute: 130,
  shortSlideDuration: 10,
  maxScenes: 50,
  includeMetrics: true,
  customLogoUrl: '',
  customBrandName: 'Cloudy',
  customOutroMessage: 'Keep learning and building amazing things!',
  customThemeColor: '#17384b',
  uiLanguage: 'en',
  detectRepositoryLanguage: true,
}

// Basic internationalization support
const UI_STRINGS: Record<string, Record<string, string>> = {
  en: {
    repositoryUrl: 'GitHub repository URL',
    generateExplainer: 'Generate explainer',
    readingRepository: 'Reading repository',
    projectName: 'Project name',
    saveProject: 'Save Project',
    exportJson: 'Export JSON',
    importJson: 'Import JSON',
    clearCache: 'Clear Cache',
    customTemplates: 'Custom Templates',
    customBranding: 'Custom Branding',
    batchProcessing: 'Batch Processing',
    startBatch: 'Start Batch Processing',
    cancelBatch: 'Cancel Batch',
  },
  es: {
    repositoryUrl: 'URL del repositorio de GitHub',
    generateExplainer: 'Generar explicación',
    readingRepository: 'Leyendo repositorio',
    projectName: 'Nombre del proyecto',
    saveProject: 'Guardar Proyecto',
    exportJson: 'Exportar JSON',
    importJson: 'Importar JSON',
    clearCache: 'Limpiar Caché',
    customTemplates: 'Plantillas Personalizadas',
    customBranding: 'Marca Personalizada',
    batchProcessing: 'Procesamiento por Lotes',
    startBatch: 'Iniciar Lote',
    cancelBatch: 'Cancelar Lote',
  },
  pt: {
    repositoryUrl: 'URL do repositório do GitHub',
    generateExplainer: 'Gerar explicação',
    readingRepository: 'Lendo repositório',
    projectName: 'Nome do projeto',
    saveProject: 'Salvar Projeto',
    exportJson: 'Exportar JSON',
    importJson: 'Importar JSON',
    clearCache: 'Limpar Cache',
    customTemplates: 'Modelos Personalizados',
    customBranding: 'Marca Personalizada',
    batchProcessing: 'Processamento em Lote',
    startBatch: 'Iniciar Lote',
    cancelBatch: 'Cancelar Lote',
  },
  fr: {
    repositoryUrl: 'URL du dépôt GitHub',
    generateExplainer: 'Générer une explication',
    readingRepository: 'Lecture du dépôt',
    projectName: 'Nom du projet',
    saveProject: 'Enregistrer le Projet',
    exportJson: 'Exporter JSON',
    importJson: 'Importer JSON',
    clearCache: 'Effacer le Cache',
    customTemplates: 'Modèles Personnalisés',
    customBranding: 'Marque Personnalisée',
    batchProcessing: 'Traitement par Lots',
    startBatch: 'Démarrer le Lot',
    cancelBatch: 'Annuler le Lot',
  },
  de: {
    repositoryUrl: 'GitHub-Repository-URL',
    generateExplainer: 'Erklärung generieren',
    readingRepository: 'Repository lesen',
    projectName: 'Projektname',
    saveProject: 'Projekt Speichern',
    exportJson: 'JSON Exportieren',
    importJson: 'JSON Importieren',
    clearCache: 'Cache Leeren',
    customTemplates: 'Benutzerdefinierte Vorlagen',
    customBranding: 'Benutzerdefiniertes Branding',
    batchProcessing: 'Stapelverarbeitung',
    startBatch: 'Stapel Starten',
    cancelBatch: 'Stapel Abbrechen',
  },
}

function t(key: string, lang: string = 'en'): string {
  return UI_STRINGS[lang]?.[key] || UI_STRINGS.en[key] || key
}

// Analytics and quality metrics
type AnalyticsEvent = {
  timestamp: number
  type: 'repository_loaded' | 'video_exported' | 'short_exported' | 'template_used' | 'error_occurred'
  data: Record<string, any>
}

const ANALYTICS_STORAGE_KEY = 'cloudy-analytics'
const MAX_ANALYTICS_EVENTS = 100

function trackAnalytics(type: AnalyticsEvent['type'], data: Record<string, any>) {
  try {
    const stored = localStorage.getItem(ANALYTICS_STORAGE_KEY)
    const events: AnalyticsEvent[] = stored ? JSON.parse(stored) : []
    events.push({ timestamp: Date.now(), type, data })
    // Keep only last 100 events
    const trimmed = events.slice(-MAX_ANALYTICS_EVENTS)
    localStorage.setItem(ANALYTICS_STORAGE_KEY, JSON.stringify(trimmed))
  } catch (error) {
    console.error('Failed to track analytics:', error)
  }
}

function getAnalytics(): AnalyticsEvent[] {
  try {
    const stored = localStorage.getItem(ANALYTICS_STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch (error) {
    console.error('Failed to load analytics:', error)
    return []
  }
}

function calculateQualityScore(repository: Repository | null, scenes: Scene[]): { score: number; feedback: string[] } {
  if (!repository) return { score: 0, feedback: ['No repository loaded'] }
  
  const feedback: string[] = []
  let score = 0
  
  // Documentation quality (0-30 points)
  const docLength = repository.readme.length + repository.documentation.length
  if (docLength > 10000) {
    score += 30
    feedback.push('✓ Excellent documentation coverage')
  } else if (docLength > 5000) {
    score += 20
    feedback.push('⚠ Good documentation, could be more detailed')
  } else {
    score += 10
    feedback.push('⚠ Limited documentation, consider adding more content')
  }
  
  // Visual assets (0-20 points)
  if (repository.assets.length >= 10) {
    score += 20
    feedback.push('✓ Rich visual content')
  } else if (repository.assets.length >= 5) {
    score += 10
    feedback.push('⚠ Some visuals present, more would improve quality')
  } else {
    feedback.push('⚠ Few or no visuals, add diagrams and screenshots')
  }
  
  // Scene quality (0-30 points)
  const avgSceneLength = scenes.reduce((sum, s) => sum + s.narration.length, 0) / scenes.length
  if (avgSceneLength > 200) {
    score += 30
    feedback.push('✓ Detailed scene narrations')
  } else if (avgSceneLength > 100) {
    score += 20
    feedback.push('⚠ Adequate scene detail')
  } else {
    score += 10
    feedback.push('⚠ Brief scenes, could be more explanatory')
  }
  
  // Content diversity (0-20 points)
  const uniqueTemplates = new Set(scenes.map(s => s.visual)).size
  if (uniqueTemplates > 10) {
    score += 20
    feedback.push('✓ Diverse content presentation')
  } else if (uniqueTemplates > 5) {
    score += 10
    feedback.push('⚠ Some content variety')
  } else {
    feedback.push('⚠ Limited content variety')
  }
  
  return { score, feedback }
}

// Persistent project storage for save/load functionality
type SavedProject = {
  version: number
  name: string
  repositoryUrl: string
  timestamp: number
  settings: GenerationSettings
  scenes: Scene[]
  repository: Repository | null
  topic: string
  playbackSpeed: number
  mode: StudioMode
}

const PROJECT_VERSION = 1
const PROJECTS_STORAGE_KEY = 'cloudy-projects'
const MAX_SAVED_PROJECTS = 10

function saveProject(project: Omit<SavedProject, 'version' | 'timestamp'>) {
  const saved: SavedProject = { ...project, version: PROJECT_VERSION, timestamp: Date.now() }
  const existing = loadProjects()
  const updated = [saved, ...existing.filter((p) => p.name !== project.name)].slice(0, MAX_SAVED_PROJECTS)
  try {
    localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(updated))
  } catch (error) {
    console.error('Failed to save project to localStorage:', error)
  }
}

function loadProjects(): SavedProject[] {
  try {
    const stored = localStorage.getItem(PROJECTS_STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch (error) {
    console.error('Failed to load projects from localStorage:', error)
    return []
  }
}

function deleteProject(projectName: string) {
  const existing = loadProjects()
  const updated = existing.filter((p) => p.name !== projectName)
  try {
    localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(updated))
  } catch (error) {
    console.error('Failed to delete project from localStorage:', error)
  }
}

function exportProjectJson(project: SavedProject): string {
  return JSON.stringify(project, null, 2)
}

function importProjectJson(json: string): SavedProject | null {
  try {
    const project = JSON.parse(json)
    if (project.version === PROJECT_VERSION && project.name && project.repositoryUrl) {
      return project as SavedProject
    }
  } catch (error) {
    console.error('Failed to import project JSON:', error)
  }
  return null
}

// Performance optimization: Repository data caching
const REPOSITORY_CACHE_KEY = 'cloudy-repo-cache'
const CACHE_EXPIRY_MS = 1000 * 60 * 30 // 30 minutes

type CachedRepository = {
  url: string
  timestamp: number
  repository: Repository
  scenes: Scene[]
}

function getCachedRepository(url: string): { repository: Repository; scenes: Scene[] } | null {
  try {
    const stored = localStorage.getItem(REPOSITORY_CACHE_KEY)
    if (!stored) return null
    const cache: CachedRepository[] = JSON.parse(stored)
    const entry = cache.find((c) => c.url === url)
    if (!entry) return null
    // Check if cache is expired
    if (Date.now() - entry.timestamp > CACHE_EXPIRY_MS) {
      // Remove expired entry
      const updated = cache.filter((c) => c.url !== url && (Date.now() - c.timestamp <= CACHE_EXPIRY_MS))
      localStorage.setItem(REPOSITORY_CACHE_KEY, JSON.stringify(updated))
      return null
    }
    return { repository: entry.repository, scenes: entry.scenes }
  } catch (error) {
    console.error('Failed to load repository cache:', error)
    return null
  }
}

function cacheRepository(url: string, repository: Repository, scenes: Scene[]) {
  try {
    const stored = localStorage.getItem(REPOSITORY_CACHE_KEY)
    const cache: CachedRepository[] = stored ? JSON.parse(stored) : []
    // Remove old entry if exists
    const filtered = cache.filter((c) => c.url !== url)
    // Add new entry (keep only last 5 repositories)
    const updated = [{ url, timestamp: Date.now(), repository, scenes }, ...filtered].slice(0, 5)
    localStorage.setItem(REPOSITORY_CACHE_KEY, JSON.stringify(updated))
  } catch (error) {
    console.error('Failed to cache repository:', error)
  }
}

function clearRepositoryCache() {
  try {
    localStorage.removeItem(REPOSITORY_CACHE_KEY)
  } catch (error) {
    console.error('Failed to clear repository cache:', error)
  }
}

const CLOUDY_NARRATOR = 'Lessac'
const PLAYBACK_SPEED_OPTIONS = [1, 1.25, 1.5, 1.75, 2, 2.5, 3] as const
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

function wordsToSeconds(text: string, settings: GenerationSettings = DEFAULT_SETTINGS) {
  const words = text.trim().split(/\s+/).filter(Boolean).length
  return Math.min(15, Math.max(10, Math.round((words / (settings.narrationWordsPerMinute * settings.voiceRate)) * 60)))
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
function sharedContentWordCount(left: string, right: string) {
  const leftWords = contentWords(left)
  return Array.from(contentWords(right)).filter((word) => leftWords.has(word)).length
}
function hasDuplicateContent(candidate: string, existing: readonly string[]) {
  const normalized = normalizedSentence(candidate)
  return !normalized || existing.some((item) => {
    const itemNormalized = normalizedSentence(item)
    return itemNormalized === normalized || itemNormalized.includes(normalized) || normalized.includes(itemNormalized) || contentSimilarity(candidate, item) >= 0.72
  })
}
function uniqueContentPoints(candidates: readonly string[], excluded: readonly string[] = []) {
  const unique: string[] = []
  candidates.forEach((candidate) => {
    const text = candidate.trim().replace(/\s+/g, ' ')
    if (text && !hasDuplicateContent(text, [...excluded, ...unique])) unique.push(text)
  })
  return unique
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

// Build a rich pool of dynamic content points drawn from the shared repository's scene text.
function shortContentPool(scene: Scene, repository: Repository | null, settings: GenerationSettings = DEFAULT_SETTINGS): string[] {
  const pool: string[] = []
  const add = (raw: string) => {
    const text = cleanRepositoryProse(raw)
    if (text.length < 14 || text.length > 220 || !isNarratableText(text)) return
    if (hasDuplicateContent(text, pool)) return
    pool.push(text)
  }
  ;(scene.bullets ?? []).forEach(add)
  scene.narration
    .replace(/([.!?])\s+/g, '$1\n')
    .split('\n')
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 14 && sentence.length < 220 && !isEditorialDirection(sentence))
    .forEach(add)
  scene.supportingPoints.forEach(add)
  // A scene begins with one selected evidence passage; pull additional, title-relevant facts from
  // the repository documentation so larger templates can use distinct supporting information.
  if (repository) {
    const sceneEvidence = `${scene.title}. ${scene.narration} ${scene.supportingPoints.join(' ')}`
    const repositoryEvidence = rankedEvidenceSentences(sceneEvidence, `${repository.documentation}\n${repository.readme}`, scene.title, scene.assetLabel)
      .filter((point) => sharedContentWordCount(point, scene.title) >= 1 || sharedContentWordCount(point, scene.narration) >= 2)
      .slice(0, 8)
    repositoryEvidence.forEach(add)
    // Include repository metrics when enabled and relevant to scene
    if (settings.includeMetrics && /\b(stat|metric|number|star|issue|license|popular)\b/i.test(scene.title)) {
      if (repository.stars > 0) add(`${repository.stars} GitHub stars`)
      if (repository.openIssues > 0) add(`${repository.openIssues} open issues`)
      if (repository.license) add(`Licensed under ${repository.license}`)
    }
    // Smart detection: Add installation instructions for setup/install scenes
    if (/\b(install|setup|getting started|quick start|begin|start)\b/i.test(scene.title)) {
      detectInstallationInstructions(repository).forEach(add)
    }
    // Smart detection: Add tutorial steps for guide/tutorial/how-to scenes
    if (/\b(tutorial|guide|how to|step|walkthrough|example)\b/i.test(scene.title)) {
      detectTutorialStructure(repository).forEach(add)
    }
    // Smart detection: Add comparison content for versus/compare scenes
    if (/\b(compar|versus|vs\.?|difference|alternative)\b/i.test(scene.title)) {
      const comparison = detectComparisonContent(repository)
      if (comparison) {
        comparison.left.forEach(add)
        comparison.right.forEach(add)
      }
    }
    // Smart detection: Add metrics for performance/benchmark scenes
    if (/\b(performance|benchmark|metric|speed|fast|efficiency)\b/i.test(scene.title)) {
      detectMetricsBenchmarks(repository).forEach(add)
    }
  }
  ;(repository?.topics ?? []).forEach((topic) => add(topic.replace(/[-_]/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())))
  if (repository?.description) add(repository.description)
  return pool
}

// Smart content detection: Parse package.json for installation commands
function detectInstallationInstructions(repository: Repository | null): string[] {
  if (!repository) return []
  const instructions: string[] = []
  const packageJsonMatch = repository.readme.match(/```(?:json)?\s*\n({[\s\S]*?"name"\s*:\s*"[^"]+[\s\S]*?})\s*```/i)
  if (packageJsonMatch) {
    try {
      const pkg = JSON.parse(packageJsonMatch[1])
      if (pkg.name) instructions.push(`Install with npm install ${pkg.name}`)
      if (pkg.name) instructions.push(`Install with yarn add ${pkg.name}`)
    } catch {
      // Invalid JSON
    }
  }
  // Look for installation commands in readme
  const installMatch = repository.readme.match(/(?:npm|yarn|pip|cargo|go get)\s+(?:install\s+)?(?:add\s+)?[-@\w/.]+/gi)
  if (installMatch) {
    installMatch.slice(0, 3).forEach((cmd) => instructions.push(cmd))
  }
  return instructions
}

// Smart content detection: Identify tutorial structure (numbered steps, ordered lists)
function detectTutorialStructure(repository: Repository | null): string[] {
  if (!repository) return []
  const steps: string[] = []
  const content = `${repository.readme}\n${repository.documentation}`
  // Find numbered steps (1. First step, 2. Second step, etc.)
  const numberedSteps = content.match(/^\s*\d+\.\s+.+$/gm)
  if (numberedSteps && numberedSteps.length >= 3) {
    numberedSteps.slice(0, 5).forEach((step) => {
      const cleaned = cleanRepositoryProse(step.replace(/^\s*\d+\.\s*/, ''))
      if (cleaned.length >= 10 && cleaned.length < 150) steps.push(cleaned)
    })
  }
  // Find "Step N" or "Stage N" patterns
  const stepPatterns = content.match(/(?:step|stage|phase)\s+\d+[\s:]+[^\n]{10,100}/gi)
  if (stepPatterns) {
    stepPatterns.slice(0, 5).forEach((pattern) => {
      const cleaned = cleanRepositoryProse(pattern)
      if (cleaned && !steps.includes(cleaned)) steps.push(cleaned)
    })
  }
  return steps
}

// Smart content detection: Find comparison tables or versus content
function detectComparisonContent(repository: Repository | null): { left: string[]; right: string[] } | null {
  if (!repository) return null
  const content = `${repository.readme}\n${repository.documentation}`
  // Look for "vs", "versus", "compared to" patterns
  const vsMatch = content.match(/(?:^|\n)([^\n]+)\s+(?:vs\.?|versus)\s+([^\n]+)/gi)
  if (vsMatch && vsMatch.length > 0) {
    const comparisons = vsMatch.slice(0, 2).map((match) => {
      const parts = match.split(/\s+(?:vs\.?|versus)\s+/i)
      return { left: cleanRepositoryProse(parts[0] || ''), right: cleanRepositoryProse(parts[1] || '') }
    })
    return {
      left: comparisons.map((c) => c.left).filter(Boolean),
      right: comparisons.map((c) => c.right).filter(Boolean),
    }
  }
  // Look for markdown tables with two columns
  const tableMatch = content.match(/\|[^\n]+\|[^\n]+\|\s*\n\|[-:\s|]+\|\s*\n(?:\|[^\n]+\|[^\n]+\|\s*\n){2,}/g)
  if (tableMatch) {
    const rows = tableMatch[0].split('\n').slice(2).map((row) => {
      const cells = row.split('|').map((cell) => cleanRepositoryProse(cell)).filter(Boolean)
      return { left: cells[0], right: cells[1] }
    })
    return {
      left: rows.map((r) => r.left).filter(Boolean).slice(0, 4),
      right: rows.map((r) => r.right).filter(Boolean).slice(0, 4),
    }
  }
  return null
}

// Smart content detection: Locate metrics and benchmarks
function detectMetricsBenchmarks(repository: Repository | null): string[] {
  if (!repository) return []
  const metrics: string[] = []
  const content = `${repository.readme}\n${repository.documentation}`
  // Find percentages, numbers with units, performance metrics
  const metricPatterns = content.match(/\d+(?:\.\d+)?(?:\s?(?:%|x|ms|sec|seconds?|kb|mb|gb|faster|slower|improvement|speedup|throughput))/gi)
  if (metricPatterns) {
    const uniqueMetrics = [...new Set(metricPatterns)].slice(0, 6)
    uniqueMetrics.forEach((metric) => {
      // Find the sentence containing this metric
      const sentenceMatch = content.match(new RegExp(`[^.!?]*${metric.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^.!?]*[.!?]`, 'i'))
      if (sentenceMatch) {
        const sentence = cleanRepositoryProse(sentenceMatch[0])
        if (sentence.length >= 15 && sentence.length < 180 && isNarratableText(sentence)) {
          metrics.push(sentence)
        }
      }
    })
  }
  return metrics
}

function shortNarrationForScene(scene: Scene, repository: Repository | null): string {
  const narration = cleanRepositoryProse(scene.narration)
  if (narration) {
    const sentences = narration.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [narration]
    return uniqueContentPoints(sentences, [scene.title]).join(' ') || scene.title.trim()
  }
  return shortContentPool(scene, repository).slice(0, 3).join(' ') || scene.title.trim() || repository?.description?.trim() || 'Repository overview'
}

function shortTitleForScene(scene: Scene) {
  return cleanRepositoryProse(scene.title) || 'Repository insight'
}

function shortSpokenText(scene: Scene, layout: ShortTemplateLayout, repository: Repository | null): string {
  const narration = shortNarrationForScene(scene, repository)
  const parts = uniqueContentPoints([shortTitleForScene(scene), narration, ...shortItemsForLayout(scene, layout, repository)])
  return parts.join('. ').replace(/\.{2,}/g, '.')
}

function shortSpokenSeconds(text: string, playbackSpeed: number, settings: GenerationSettings = DEFAULT_SETTINGS) {
  const words = text.trim().split(/\s+/).filter(Boolean).length
  const spokenSeconds = (words / (settings.narrationWordsPerMinute * settings.voiceRate * playbackSpeed)) * 60
  return Math.max(settings.shortSlideDuration / playbackSpeed, spokenSeconds + 0.6)
}

function splitSpokenText(text: string, maxCharacters = 180): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((sentence) => sentence.trim()).filter(Boolean) ?? [text]
  const chunks: string[] = []
  sentences.forEach((sentence) => {
    const words = sentence.split(/\s+/).filter(Boolean)
    let chunk = ''
    words.forEach((word) => {
      const candidate = chunk ? `${chunk} ${word}` : word
      if (chunk && candidate.length > maxCharacters) {
        chunks.push(chunk)
        chunk = word
      } else {
        chunk = candidate
      }
    })
    if (chunk) chunks.push(chunk)
  })
  return chunks
}

function concatenateAudioBuffers(audioContext: AudioContext, buffers: AudioBuffer[]): AudioBuffer {
  if (buffers.length === 0) throw new Error('Cloudy did not produce audio for this beat.')
  if (buffers.length === 1) return buffers[0]
  const sampleRate = buffers[0].sampleRate
  if (!buffers.every((buffer) => buffer.sampleRate === sampleRate)) throw new Error('Cloudy produced incompatible audio sample rates.')
  const channels = Math.max(...buffers.map((buffer) => buffer.numberOfChannels))
  const length = buffers.reduce((total, buffer) => total + buffer.length, 0)
  const combined = audioContext.createBuffer(channels, length, sampleRate)
  let offset = 0
  buffers.forEach((buffer) => {
    for (let channel = 0; channel < channels; channel += 1) {
      combined.getChannelData(channel).set(buffer.getChannelData(Math.min(channel, buffer.numberOfChannels - 1)), offset)
    }
    offset += buffer.length
  })
  return combined
}

function formatShortPoint(point: string, format: ShortTemplateLayout['format'], index: number) {
  const clean = cleanRepositoryProse(point).replace(/^[\s>*#`\-+\d.)]+/, '').trim()
  if (format === 'code') return clean.replace(/^run\s+/i, '')
  if (format === 'metric') {
    const metric = clean.match(/(?:\$|€|£)?\d[\d,.]*(?:\s?(?:%|ms|s|sec|seconds?|minutes?|hours?|kb|mb|gb|stars?|issues?|files?|steps?|modules?|users?))?/i)?.[0]
    return metric ? `${metric} — ${clean.replace(metric, '').replace(/^\s*[:—-]\s*/, '')}` : clean
  }
  const complete = /[.!?]$/.test(clean) ? clean : `${clean}.`
  if (format === 'sequence') return `${index + 1}. ${complete}`
  return complete
}

function shortPointWordLimit(format: ShortTemplateLayout['format']) {
  if (format === 'caption') return 12
  if (format === 'code') return 16
  if (format === 'metric') return 18
  if (format === 'sequence') return 22
  if (format === 'statement') return 42
  return 30
}

function completePointsForLayout(pool: string[], layout: ShortTemplateLayout) {
  const maxWords = shortPointWordLimit(layout.format)
  return pool.filter((point) => point.split(/\s+/).length <= maxWords)
}

// Fill every content slot with repository evidence formatted for that template's visual grammar.
function shortItemsForLayout(scene: Scene, layout: ShortTemplateLayout, repository: Repository | null): string[] {
  const itemCount = layout.items.length
  if (itemCount <= 0) return []
  const narration = shortNarrationForScene(scene, repository)
  const pool = uniqueContentPoints(shortContentPool(scene, repository), [scene.title, narration])
  if (pool.length === 0) return []
  const completePoints = completePointsForLayout(pool, layout)
  // A single box receives one complete repository fact; it is never cut or joined mid-thought.
  if (itemCount === 1) return [formatShortPoint(completePoints[0], layout.format, 0)]
  const points: string[] = []
  for (let i = 0; i < itemCount && i < completePoints.length; i++) points.push(completePoints[i])
  return points.map((point, index) => formatShortPoint(point, layout.format, index))
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

async function mapWithConcurrency<T, R>(items: readonly T[], limit: number, mapper: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length)
  let nextIndex = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex
      nextIndex += 1
      results[index] = await mapper(items[index])
    }
  })
  await Promise.all(workers)
  return results
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
function cleanRepositoryProse(value: string) {
  return value
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<svg\b[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[([^\]]*)]\([^)]+\)/g, '$1 ')
    .replace(/\[([^\]]+)]\([^)]+\)/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s*(?:[-+*]|\d+[.)])\s+/gm, '')
    .replace(/https?:\/\/\S+/gi, ' ')
    .replace(/\b[^\s)]+\.svg\)?/gi, ' ')
    .replace(/\b(?:svg|path|rect|circle|viewBox|xmlns|fill|stroke|width|height)\s*[=:)]?/gi, ' ')
    .replace(/[*_`|{}[\]\\]/g, ' ')
    .replace(/\s+[),;:](?=\s|$)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
function isNarratableText(value: string) {
  const text = cleanRepositoryProse(value)
  const words = text.split(/\s+/).filter(Boolean)
  return words.length >= 4 && words.every((word) => word.length <= 45) && !isRepositoryNoise(text) && !/[<>]|\b(?:svg|viewBox|xmlns)\b/i.test(text)
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
  const sentences = cleanRepositoryProse(`${primaryText}\n${repositoryText}`)
    .match(/[^.!?]+[.!?]+|[^.!?]+$/g)
    ?.map((sentence) => cleanRepositoryProse(sentence))
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
function buildScenes(repo: Repository, settings: GenerationSettings = DEFAULT_SETTINGS): Scene[] {
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
    if (result.length === settings.maxScenes) break
    const title = cleanRepositoryProse(cleanSlideTitle(material.heading))
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
      section: Math.floor(index / settings.slidesPerSection) + 1,
      slideInSection: (index % settings.slidesPerSection) + 1,
      title,
      duration: settings.templateSlideDuration,
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
  if (result.length < Math.ceil(settings.maxScenes * 0.6)) throw new Error(`Cloudy found ${result.length} distinct material passages, but at least ${Math.ceil(settings.maxScenes * 0.6)} are required. Add more substantive README or English docs content and try again.`)
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
  scenes: Array<{ narration: string }>,
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
              <div className="shorts-phone"><CloudyAvatar size={76} /><span>FULL</span></div>
            </div>
            <div className="mode-card-copy">
              <p className="eyebrow">Short form</p>
              <h2>Cloudy Short Videos</h2>
              <p>Create a concise, story-led explanation of a repository topic. Cloudy reads every generated point and assembles a reusable visual asset library from the documentation.</p>
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
  const [shortPreviewBeatIdx, setShortPreviewBeatIdx] = useState(0)
  const [pausedShortBeatIndex, setPausedShortBeatIndex] = useState<number | null>(null)
  const [isRenderingShort, setIsRenderingShort] = useState(false)
  const [shortRenderProgress, setShortRenderProgress] = useState(0)
  const [settings, setSettings] = useState<GenerationSettings>(DEFAULT_SETTINGS)
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>(loadProjects())
  const [projectName, setProjectName] = useState('')
  const [customTemplates, setCustomTemplates] = useState<CustomTemplateDefinition[]>([])
  const [batchUrls, setBatchUrls] = useState<string>('')
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 })
  const [isBatchProcessing, setIsBatchProcessing] = useState(false)
  const shortRenderAbortRef = useRef(false)
  const shortRenderAbortControllerRef = useRef<AbortController | null>(null)
  const shortPreviewRunIdRef = useRef(0)
  const shortPreviewAbortRef = useRef(false)
  const renderAbortRef = useRef(false)
  const renderAbortControllerRef = useRef<AbortController | null>(null)
  const videoPreviewAbortRef = useRef(false)
  const videoPreviewSceneIdxRef = useRef(0)
  const videoPreviewRunIdRef = useRef(0)
  const browserVoiceRef = useRef<SpeechSynthesisVoice | null | undefined>(undefined)
  const repositoryLoadAbortRef = useRef<AbortController | null>(null)
  const repositoryLoadIdRef = useRef(0)
  // Note: Custom templates are loaded and stored, but full integration requires
  // refactoring global template constants into parameter-based functions.
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
  const shortTopicIndex = scenes.findIndex((scene) => scene.id === shortTopic.id)
  const shortFollowingScenes = scenes.slice(Math.max(0, shortTopicIndex) + 1, Math.max(0, shortTopicIndex) + 5)
  const shortLeadingScenes = scenes.slice(Math.max(0, shortTopicIndex - Math.max(0, 4 - shortFollowingScenes.length)), Math.max(0, shortTopicIndex))
  const shortSourceScenes = [shortTopic, ...shortFollowingScenes, ...shortLeadingScenes]
  const shortTemplateIndices = planShortTemplateIndices(shortSourceScenes, repository)
  const shortSpokenScripts = shortSourceScenes.map((scene, index) => {
    const template = SHORT_TEMPLATES[shortTemplateIndices[index] ?? 0] ?? SHORT_TEMPLATES[0]
    return shortSpokenText(scene, SHORT_TEMPLATE_LAYOUTS[template.key], repository)
  })
  const shortNarration = shortSpokenScripts.join(' ')
  const shortRuntime = shortSpokenScripts.reduce((total, script) => total + shortSpokenSeconds(script, playbackSpeed), 0)
  const activeShortTemplate = SHORT_TEMPLATES[shortTemplateIndices[shortPreviewBeatIdx] ?? 0] ?? SHORT_TEMPLATES[0]
  const activeShortScene = shortSourceScenes[shortPreviewBeatIdx] ?? shortTopic
  const activeShortLayout = SHORT_TEMPLATE_LAYOUTS[activeShortTemplate.key]
  const activeShortAssets = activeShortScene.assets.length ? activeShortScene.assets.slice(0, 4) : activeShortScene.asset ? [activeShortScene.asset] : []
  const activeShortItems = shortItemsForLayout(activeShortScene, activeShortLayout, repository)
  // Auto-fit every preview text zone: shrink font until the text fits its shape (never clips/overflows).
  const shortStageRef = useRef<HTMLElement | null>(null)
  const shortBulletsKey = activeShortItems.join('|')
  
  function saveCurrentProject() {
    if (!projectName.trim()) {
      alert('Please enter a project name before saving.')
      return
    }
    saveProject({
      name: projectName.trim(),
      repositoryUrl,
      settings,
      scenes,
      repository,
      topic: shortTopic.title,
      playbackSpeed,
      mode: studioMode,
    })
    setSavedProjects(loadProjects())
    setStatus(`Project "${projectName.trim()}" saved successfully.`)
  }
  
  function loadProjectById(name: string) {
    const project = savedProjects.find((p) => p.name === name)
    if (!project) return
    setProjectName(project.name)
    setRepositoryUrl(project.repositoryUrl)
    setSettings(project.settings)
    setScenes(project.scenes)
    setRepository(project.repository)
    // Validate playbackSpeed is in valid options
    if (PLAYBACK_SPEED_OPTIONS.includes(project.playbackSpeed as typeof PLAYBACK_SPEED_OPTIONS[number])) {
      setPlaybackSpeed(project.playbackSpeed as typeof PLAYBACK_SPEED_OPTIONS[number])
    }
    setStudioMode(project.mode)
    const topicScene = project.scenes.find((s) => s.title === project.topic)
    if (topicScene) setShortTopicId(topicScene.id)
    setStatus(`Project "${name}" loaded successfully.`)
  }
  
  function deleteProjectById(name: string) {
    if (confirm(`Are you sure you want to delete project "${name}"?`)) {
      deleteProject(name)
      setSavedProjects(loadProjects())
      setStatus(`Project "${name}" deleted.`)
    }
  }
  
  function exportCurrentProject() {
    if (!projectName.trim()) {
      alert('Please enter a project name before exporting.')
      return
    }
    const project: SavedProject = {
      version: PROJECT_VERSION,
      timestamp: Date.now(),
      name: projectName.trim(),
      repositoryUrl,
      settings,
      scenes,
      repository,
      topic: shortTopic.title,
      playbackSpeed,
      mode: studioMode,
    }
    const json = exportProjectJson(project)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${projectName.trim()}.cloudy.json`
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
    setStatus(`Project "${projectName.trim()}" exported.`)
  }
  
  function importProjectFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      const json = e.target?.result as string
      const project = importProjectJson(json)
      if (project) {
        saveProject(project)
        setSavedProjects(loadProjects())
        loadProjectById(project.name)
      } else {
        alert('Failed to import project. Please check the file format.')
      }
    }
    reader.readAsText(file)
    event.target.value = '' // Reset file input
  }
  
  function importCustomTemplatesFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      const json = e.target?.result as string
      const templates = loadCustomTemplatesFromJson(json)
      if (templates.length > 0) {
        setCustomTemplates((prev) => {
          const existing = new Set(prev.map((t) => t.key))
          const newTemplates = templates.filter((t) => !existing.has(t.key))
          return [...prev, ...newTemplates]
        })
        setStatus(`Loaded ${templates.length} custom template${templates.length === 1 ? '' : 's'}.`)
      } else {
        alert('No valid templates found in the file.')
      }
    }
    reader.readAsText(file)
    event.target.value = '' // Reset file input
  }
  
  function clearCustomTemplates() {
    if (confirm(`Clear all ${customTemplates.length} custom template${customTemplates.length === 1 ? '' : 's'}?`)) {
      setCustomTemplates([])
      setStatus('Custom templates cleared.')
    }
  }
  
  async function startBatchProcessing() {
    const urls = batchUrls
      .split('\n')
      .map((url) => url.trim())
      .filter(Boolean)
    
    if (urls.length === 0) {
      alert('Please enter at least one repository URL.')
      return
    }
    
    if (urls.length > 10) {
      alert('Batch processing is limited to 10 repositories at a time to avoid rate limits.')
      return
    }
    
    setBatchProgress({ current: 0, total: urls.length })
    setIsBatchProcessing(true)
    
    for (let i = 0; i < urls.length; i++) {
      if (!isBatchProcessing) break // Allow cancellation
      setBatchProgress({ current: i + 1, total: urls.length })
      setStatus(`Batch processing ${i + 1} of ${urls.length}: Loading ${urls[i]}`)
      try {
        await loadRepository(urls[i])
        // Auto-save each loaded repository as a project
        const parsed = parseRepositoryUrl(urls[i])
        if (parsed && repository) {
          const autoName = `${parsed.owner}-${parsed.repo}-${Date.now()}`
          saveProject({
            name: autoName,
            repositoryUrl: urls[i],
            settings,
            scenes,
            repository,
            topic: scenes[0]?.title || '',
            playbackSpeed,
            mode: studioMode,
          })
        }
        // Wait a bit between requests to avoid rate limits
        await new Promise((resolve) => setTimeout(resolve, 2000))
      } catch (error) {
        console.error(`Failed to process ${urls[i]}:`, error)
        setStatus(`Batch error on ${i + 1}/${urls.length}: ${error instanceof Error ? error.message : 'Unknown error'}. Continuing...`)
        await new Promise((resolve) => setTimeout(resolve, 3000))
      }
    }
    
    setIsBatchProcessing(false)
    setBatchProgress({ current: 0, total: 0 })
    setSavedProjects(loadProjects())
    setStatus(`Batch processing complete: ${urls.length} repositories processed and saved as projects.`)
  }
  
  function cancelBatchProcessing() {
    setIsBatchProcessing(false)
    setBatchProgress({ current: 0, total: 0 })
    setStatus('Batch processing cancelled.')
  }
  
  useLayoutEffect(() => {
    const stage = shortStageRef.current
    if (!stage) return
    const fitAll = () => {
      const stageHeight = stage.clientHeight
      if (!stageHeight) return
      stage.querySelectorAll<HTMLElement>('[data-fit-frac]').forEach((element) => {
        const frac = Number(element.dataset.fitFrac)
        const cap = Number(element.dataset.fitCap ?? 40)
        let size = Math.min(cap, Math.max(7, stageHeight * frac))
        element.style.fontSize = `${size}px`
        let guard = 0
        while ((element.scrollHeight > element.clientHeight + 1 || element.scrollWidth > element.clientWidth + 1) && size > 5 && guard < 260) {
          size -= 0.5
          element.style.fontSize = `${size}px`
          guard += 1
        }
      })
    }
    fitAll()
    const observer = new ResizeObserver(fitAll)
    observer.observe(stage)
    return () => observer.disconnect()
  }, [activeShortTemplate.key, shortPreviewBeatIdx, activeShortScene.title, shortBulletsKey])
  const shortAssetEntries = [
    { kind: 'cloudy', name: 'Cloudy', detail: 'Protagonist — flies through each world', image: null },
    { kind: 'concept', name: shortTopic.title, detail: 'Topic environment theme', image: null },
    ...(shortTopic.assets.slice(0, 3).map((asset) => ({ kind: 'source', name: repositoryAssetLabel(asset), detail: 'Landscape backdrop', image: asset }))),
    ...((repository?.topics ?? []).slice(0, 4).map((topic) => ({ kind: 'topic', name: topic, detail: 'Floating world object', image: null }))),
  ]

  async function loadRepository(value: string) {
    const parsed = parseRepositoryUrl(value)
    if (!parsed) {
      setStatus('Enter a GitHub repository URL in the format: https://github.com/owner/repository')
      return
    }
    // Performance optimization: Check cache first
    const repoUrl = `https://github.com/${parsed.owner}/${parsed.repo}`
    const cached = getCachedRepository(repoUrl)
    if (cached) {
      setRepository(cached.repository)
      setScenes(cached.scenes)
      setRepositoryUrl(repoUrl)
      setSelectedSceneId(cached.scenes[0].id)
      setShortTopicId(cached.scenes[0].id)
      setStatus(`Loaded from cache: ${cached.scenes.length} slides ready. Cache expires in ${Math.round((CACHE_EXPIRY_MS - (Date.now() - (cached.repository as any).cachedAt || 0)) / 60000)} minutes.`)
      return
    }
    repositoryLoadAbortRef.current?.abort()
    const loadId = ++repositoryLoadIdRef.current
    const loadController = new AbortController()
    repositoryLoadAbortRef.current = loadController
    const timeoutId = window.setTimeout(() => loadController.abort('timeout'), 60_000)
    setIsLoading(true)
    setStatus('Connecting to GitHub and validating repository access.')
    try {
      const [repositoryResponse, readmeResponse] = await Promise.all([
        fetchWithRetry(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}`, {
          headers: apiHeaders,
          signal: loadController.signal,
        }),
        fetchWithRetry(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}/readme`, { headers: apiHeaders, signal: loadController.signal }),
      ])
      // Enhanced error handling: Better messages for common issues
      if (!repositoryResponse.ok) {
        if (repositoryResponse.status === 404) {
          throw new Error('Repository not found. Verify the URL is correct and the repository is public. Private repositories are not supported in the browser version.')
        }
        if (repositoryResponse.status === 403 || repositoryResponse.status === 429) {
          const retryAfter = repositoryResponse.headers.get('Retry-After')
          const resetAt = repositoryResponse.headers.get('X-RateLimit-Reset')
          const wait = retryAfter ? `${retryAfter} seconds` : resetAt ? `until ${new Date(Number(resetAt) * 1_000).toLocaleTimeString()}` : '5-10 minutes'
          throw new Error(`GitHub API rate limit exceeded. Please wait ${wait} before trying again. Tip: Consider using fewer repositories in quick succession.`)
        }
        throw new Error(`GitHub returned status ${repositoryResponse.status}. The repository may be unavailable or access is restricted.`)
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
        size: number
      }
      if (!data.default_branch) throw new Error('This repository has no default branch. It may be empty or newly created. Add a README and some documentation, then try again.')
      // Repository quality validation
      if (!readmeResponse.ok || data.size === 0) {
        throw new Error('This repository has no README. Cloudy requires a README with substantive content to generate explainer videos. Add a README with at least 500 words and try again.')
      }
      const readmeData = readmeResponse.ok ? ((await readmeResponse.json()) as { content?: string }) : null
      const readmeText = readmeData?.content ? decodeBase64(readmeData.content) : ''
      const readmeWordCount = readmeText.split(/\s+/).filter(Boolean).length
      if (readmeWordCount < 300) {
        throw new Error(`This README is too short (${readmeWordCount} words). Cloudy needs at least 300 words of documentation to create meaningful explainer content. Expand your README with more detail about what the project does, how to use it, and what problems it solves.`)
      }
      setStatus('Repository validated. Reading documentation and extracting visuals.')
      const readmeImages = readmeText ? extractReadmeImageUrls(readmeText, parsed.owner, parsed.repo, data.default_branch) : []
      const treeResponse = await fetchWithRetry(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}/git/trees/${encodeURIComponent(data.default_branch)}?recursive=1`, { headers: apiHeaders, signal: loadController.signal })
      if (!treeResponse.ok) {
        if (treeResponse.status === 429 || treeResponse.status === 403) {
          const retryAfter = treeResponse.headers.get('Retry-After')
          const resetAt = treeResponse.headers.get('X-RateLimit-Reset')
          const wait = retryAfter ? `${retryAfter} seconds` : resetAt ? `until ${new Date(Number(resetAt) * 1_000).toLocaleTimeString()}` : '5-10 minutes'
          throw new Error(`GitHub API rate limit exceeded while reading repository files. Please wait ${wait} and try again.`)
        }
        throw new Error(`GitHub could not read the repository file tree (status ${treeResponse.status}). The repository may be too large or temporarily unavailable.`)
      }
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
      let completedDocuments = 0
      const documentationTexts = await mapWithConcurrency(documentationPaths, 5, async (path) => {
          try {
            const response = await fetchWithRetry(`https://raw.githubusercontent.com/${parsed.owner}/${parsed.repo}/${encodeURIComponent(data.default_branch)}/${path.split('/').map(encodeURIComponent).join('/')}`, { signal: loadController.signal }, 2)
            completedDocuments += 1
            setStatus(`Reading documentation ${completedDocuments} of ${documentationPaths.length}.`)
            return response.ok ? response.text() : ''
          } catch {
            if (loadController.signal.aborted) throw new DOMException('Repository load aborted', 'AbortError')
            return ''
          }
        })
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
      setStatus(`Repository content loaded. Building up to ${settings.maxScenes} distinct slides.`)
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()))
      if (loadController.signal.aborted) throw new DOMException('Repository load aborted', 'AbortError')
      let generatedScenes: Scene[]
      try {
        generatedScenes = buildScenes(newRepo, settings)
      } catch (error) {
        // Enhanced error handling: Provide actionable guidance for content issues
        const message = error instanceof Error ? error.message : 'Unknown error'
        if (message.includes('distinct material passages')) {
          const currentCount = message.match(/\d+/)?.[0] || '0'
          const requiredCount = Math.ceil(settings.maxScenes * 0.6)
          throw new Error(`Not enough unique content found (${currentCount} passages found, ${requiredCount} required). Suggestions: 
1. Add more detailed sections to your README
2. Include documentation files in a docs/ folder
3. Add examples, tutorials, or usage guides
4. Explain features, architecture, and implementation details
5. Try reducing maxScenes setting if content is intentionally concise`)
        }
        throw error
      }
      setRepositoryUrl(`https://github.com/${data.full_name}`)
      setRepository(newRepo)
      setScenes(generatedScenes)
      setSelectedSceneId(generatedScenes[0].id)
      setShortTopicId(generatedScenes[0].id)
      // Performance optimization: Cache repository data for faster reloads
      cacheRepository(`https://github.com/${data.full_name}`, newRepo, generatedScenes)
      // Analytics: Track successful repository load
      trackAnalytics('repository_loaded', {
        repositoryName: data.full_name,
        sceneCount: generatedScenes.length,
        assetCount: newRepo.assets.length,
        documentationLength: documentation.length,
      })
      // Content quality warnings (non-blocking)
      const warnings: string[] = []
      if (documentation.length === 0) {
        warnings.push('No documentation files found. Consider adding a docs/ folder with guides and examples for richer content.')
      }
      if (assets.length === 0) {
        warnings.push('No images found. Add diagrams, screenshots, or illustrations to make videos more engaging.')
      }
      if (assets.length < 10 && generatedScenes.length >= 30) {
        warnings.push(`Only ${assets.length} images found for ${generatedScenes.length} slides. More visuals will improve video quality.`)
      }
      const matchedImageCount = generatedScenes.filter((scene) => scene.asset).length
      const imageNote = assets.length ? `${matchedImageCount} slide${matchedImageCount === 1 ? '' : 's'} received a verified topic-matched image; unmatched slides use the material-focused placeholder.` : 'No English or default-language images found — Cloudy will present with a branded placeholder.'
      const documentationNote = documentationFileCount ? `Grounded in the main README and ${documentationFileCount} English documentation file${documentationFileCount === 1 ? '' : 's'}.` : 'No English docs/ Markdown files were loaded; using the main README and repository structure.'
      const warningNote = warnings.length > 0 ? ` Suggestions: ${warnings.join(' ')}` : ''
      setStatus(`Storyboard ready: ${generatedScenes.length} unique slides, ${settings.slidesPerSection} per section, ${durationLabel(generatedScenes.reduce((total, scene) => total + scene.duration, 0))} total. ${documentationNote} ${imageNote}${warningNote}`)
    } catch (error) {
      if (loadId !== repositoryLoadIdRef.current) return
      if (loadController.signal.reason === 'timeout') {
        setStatus('GitHub API request timed out after 60 seconds. This may indicate network issues or a very large repository. Try again with a stable connection.')
      } else if (!(error instanceof DOMException && error.name === 'AbortError')) {
        setStatus(error instanceof Error ? error.message : 'Unexpected error loading repository. Please verify the URL and try again.')
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
    setStatus('Loading repository visuals for your video.')
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
      setStatus('Decoding Cloudy narration for the video.')
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
        source.playbackRate.value = settings.voiceRate * playbackSpeed
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
    setStatus('Stopping video render.')
  }

  function pickFemaleVoice() {
    const voices = window.speechSynthesis.getVoices()
    const assistantVoices = /lessac|siri|samantha|ava|aria|jenny|sonia|natasha|libby|serena|alloy|nova/i
    const femaleNames = /zira|victoria|hazel|susan|karen|moira|tessa|fiona|allison|erin|eva|vicki|joanna|ivy|kendra|kimberly|salli|nicole|naja|marlene|mathilde/i
    const assistantVoice = voices.find((voice) => assistantVoices.test(voice.name) && voice.lang.startsWith('en'))
    const female = assistantVoice ?? voices.find((voice) => femaleNames.test(voice.name) && voice.lang.startsWith('en')) ?? voices.find((voice) => /female/i.test(voice.name))
    return female ?? null
  }

  async function resolveVoice() {
    if (browserVoiceRef.current !== undefined) return browserVoiceRef.current
    const immediate = pickFemaleVoice()
    if (immediate) {
      browserVoiceRef.current = immediate
      return immediate
    }
    return new Promise<SpeechSynthesisVoice | null>((resolve) => {
      const finish = () => {
        window.speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged)
        browserVoiceRef.current = pickFemaleVoice()
        resolve(browserVoiceRef.current)
      }
      const onVoicesChanged = () => {
        finish()
      }
      window.speechSynthesis.addEventListener('voiceschanged', onVoicesChanged)
      window.setTimeout(() => {
        finish()
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
    if (!femaleVoice) {
      setStatus(`No compatible female browser voice is available. Video exports use Cloudy’s ${CLOUDY_NARRATOR} voice.`)
      return
    }
    const utterance = new SpeechSynthesisUtterance(selectedScene.narration)
    utterance.voice = femaleVoice
    utterance.lang = femaleVoice?.lang ?? 'en-US'
    utterance.rate = settings.voiceRate * playbackSpeed
    utterance.pitch = 1
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)
    setIsSpeaking(true)
    setStatus(`Cloudy is speaking with ${femaleVoice.name}.`)
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
    if (!voice) {
      setIsVideoPreviewPlaying(false)
      setStatus(`No compatible female browser voice is available. Video exports use Cloudy’s ${CLOUDY_NARRATOR} voice.`)
      return
    }
    for (let i = startIndex; i < scenes.length; i++) {
      if (videoPreviewAbortRef.current || runId !== videoPreviewRunIdRef.current) break
      videoPreviewSceneIdxRef.current = i
      setVideoPreviewSceneIdx(i)
      await new Promise<void>((resolve) => {
        window.speechSynthesis.cancel()
        const utterance = new SpeechSynthesisUtterance(scenes[i].narration)
        utterance.voice = voice
        utterance.lang = voice?.lang ?? 'en-US'
        utterance.rate = settings.voiceRate * playbackSpeed
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

  async function previewShort(startBeat = 0) {
    if (isShortPreviewPlaying || !shortNarration) return
    window.speechSynthesis.cancel()
    const voice = await resolveVoice()
    if (!voice) {
      setStatus(`No compatible female browser voice is available. Video exports use Cloudy’s ${CLOUDY_NARRATOR} voice.`)
      return
    }
    const runId = ++shortPreviewRunIdRef.current
    shortPreviewAbortRef.current = false
    setIsShortPreviewPlaying(true)
    setPausedShortBeatIndex(null)
    setShortPreviewBeatIdx(startBeat)
    for (let i = startBeat; i < shortSourceScenes.length; i++) {
      if (shortPreviewAbortRef.current || runId !== shortPreviewRunIdRef.current) break
      setShortPreviewBeatIdx(i)
      const beatStartedAt = performance.now()
      const speechChunks = splitSpokenText(shortSpokenScripts[i])
      for (const chunk of speechChunks) {
        if (shortPreviewAbortRef.current || runId !== shortPreviewRunIdRef.current) break
        let spoken = false
        for (let attempt = 0; attempt < 2 && !spoken && !shortPreviewAbortRef.current; attempt += 1) {
          spoken = await new Promise<boolean>((resolve) => {
            let settled = false
            const words = chunk.split(/\s+/).filter(Boolean).length
            const timeout = window.setTimeout(() => {
              window.speechSynthesis.cancel()
              finish(false)
            }, Math.max(8_000, (words / (settings.narrationWordsPerMinute * settings.voiceRate * playbackSpeed)) * 60_000 + 4_000))
            const finish = (completed: boolean) => {
              if (settled) return
              settled = true
              window.clearTimeout(timeout)
              resolve(completed)
            }
            const utterance = new SpeechSynthesisUtterance(chunk)
            utterance.voice = voice
            utterance.lang = voice.lang ?? 'en-US'
            utterance.rate = settings.voiceRate * playbackSpeed
            utterance.pitch = 1
            utterance.onend = () => finish(true)
            utterance.onerror = () => finish(false)
            window.speechSynthesis.resume()
            window.speechSynthesis.speak(utterance)
          })
        }
        if (!spoken && !shortPreviewAbortRef.current) {
          shortPreviewAbortRef.current = true
          setStatus(`Cloudy could not finish beat ${i + 1} after retrying. Replay it or export the video to use Cloudy's local voice.`)
          break
        }
      }
      const minimumBeatMs = shortSlideDuration(playbackSpeed) * 1000
      const remainingMs = minimumBeatMs - (performance.now() - beatStartedAt)
      if (remainingMs > 0 && !shortPreviewAbortRef.current && runId === shortPreviewRunIdRef.current) {
        await new Promise<void>((resolve) => window.setTimeout(resolve, remainingMs))
      }
      if (!shortPreviewAbortRef.current && runId === shortPreviewRunIdRef.current && i < shortSourceScenes.length - 1) {
        await new Promise<void>((resolve) => window.setTimeout(resolve, 150))
      }
    }
    if (runId !== shortPreviewRunIdRef.current) return
    window.speechSynthesis.cancel()
    setIsShortPreviewPlaying(false)
    setShortPreviewBeatIdx(0)
  }

  function stopShortPreview() {
    const pausedAt = shortPreviewBeatIdx
    shortPreviewRunIdRef.current += 1
    shortPreviewAbortRef.current = true
    window.speechSynthesis.cancel()
    setIsShortPreviewPlaying(false)
    setPausedShortBeatIndex(pausedAt)
    setStatus(`Paused at beat ${pausedAt + 1} of ${shortSourceScenes.length}.`)
  }

  function seekShortToBeat(beatIndex: number) {
    if (isShortPreviewPlaying) stopShortPreview()
    setShortPreviewBeatIdx(beatIndex)
    setPausedShortBeatIndex(beatIndex)
    setStatus(`Ready at beat ${beatIndex + 1}. Click Play or Resume to start audio.`)
  }

  function downloadShortScript() {
    if (!repository || !shortNarration) return
    const beats = shortSourceScenes.map((scene, index) => `${index + 1}. ${scene.title}\n${shortSpokenScripts[index]}`).join('\n\n')
    const assets = shortAssetEntries.map((asset) => `- ${asset.name}: ${asset.detail}`).join('\n')
    const content = `# Cloudy Short: ${shortTopic.title}\n\n- Repository: ${repository.fullName}\n- Runtime: ${durationLabel(shortRuntime)} at ${speedLabel(playbackSpeed)}\n- Format: Horizontal 1920x1080\n\n## Narration\n\n${shortNarration}\n\n## Story beats\n\n${beats}\n\n## Production assets\n\n${assets}\n`
    downloadFile(`cloudy-short-${normalizedSentence(shortTopic.title).replace(/\s+/g, '-') || 'topic'}.md`, content, 'text/markdown')
    setStatus('Cloudy Shorts script downloaded.')
  }

  async function exportShortVideo() {
    if (!repository || !shortNarration || shortSourceScenes.length === 0) {
      setStatus('Select a topic with documented content before exporting the short video.')
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
    const ctxMaybe = canvas.getContext('2d')
    if (!ctxMaybe) return
    const ctx: CanvasRenderingContext2D = ctxMaybe
    const audioContext = new AudioContext()
    await audioContext.resume()
    shortRenderAbortRef.current = false
    const abortController = new AbortController()
    shortRenderAbortControllerRef.current = abortController
    setIsRenderingShort(true)
    setShortRenderProgress(0)
    setStatus('Loading visuals for Cloudy Short video.')
    const usedAssets = Array.from(new Set(shortSourceScenes.flatMap((scene) => scene.assets)))
    const assetImages = await Promise.all(usedAssets.map((asset) => loadImage(asset).catch(() => null)))
    const assetImageByUrl = new Map(usedAssets.map((asset, i) => [asset, assetImages[i]]))
    const templateImages: (HTMLCanvasElement | null)[] = await Promise.all(
      SHORT_TEMPLATES.map(async ({ url }) => {
        const templateController = new AbortController()
        const timeoutId = window.setTimeout(() => templateController.abort(), 8_000)
        try {
          const response = await fetch(url, { signal: templateController.signal })
          if (!response.ok) return null
          const svgText = await response.text()
          const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' })
          const objectUrl = URL.createObjectURL(blob)
          const img = new Image()
          img.width = 1920
          img.height = 1080
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve()
            img.onerror = () => reject()
            img.src = objectUrl
          })
          const offscreen = document.createElement('canvas')
          offscreen.width = 1920
          offscreen.height = 1080
          const offCtx = offscreen.getContext('2d')
          offCtx?.drawImage(img, 0, 0, 1920, 1080)
          URL.revokeObjectURL(objectUrl)
          return offscreen
        } catch {
          return null
        } finally {
          window.clearTimeout(timeoutId)
        }
      }),
    )
    let narrationBuffers: AudioBuffer[]
    try {
      const shortSpeechChunks = shortSpokenScripts.map((script) => splitSpokenText(script))
      const chunkOffsets = shortSpeechChunks.reduce<number[]>((offsets, chunks) => [...offsets, offsets[offsets.length - 1] + chunks.length], [0])
      const narrationBlobs = await generateNarrationAudio(
        shortSpeechChunks.flat().map((narration) => ({ narration })),
        (phase, progress) => {
          if (phase === 'model') setStatus(`Preparing Cloudy's voice model ${Math.round(progress * 100)}%...`)
          if (phase === 'scene') {
            setShortRenderProgress(Math.round(progress * 30))
            setStatus(`Generating narration ${Math.min(shortSourceScenes.length, Math.floor(progress * shortSourceScenes.length) + 1)} of ${shortSourceScenes.length}...`)
          }
        },
        abortController.signal,
      )
      const chunkBuffers = await Promise.all(narrationBlobs.map(async (blob, index) => {
        try {
          return await audioContext.decodeAudioData(await blob.arrayBuffer())
        } catch (error) {
          throw new Error(`Cloudy audio fragment ${index + 1} could not be decoded: ${error instanceof Error ? error.message : 'unknown error'}`)
        }
      }))
      narrationBuffers = shortSpeechChunks.map((_chunks, index) => concatenateAudioBuffers(audioContext, chunkBuffers.slice(chunkOffsets[index], chunkOffsets[index + 1])))
    } catch (error) {
      await audioContext.close()
      shortRenderAbortControllerRef.current = null
      setIsRenderingShort(false)
      setShortRenderProgress(0)
      setStatus(error instanceof DOMException && error.name === 'AbortError' ? 'Short video cancelled.' : 'Narration could not be generated. Check connection and try again.')
      return
    }
    shortRenderAbortControllerRef.current = null
    if (shortRenderAbortRef.current) {
      await audioContext.close()
      setIsRenderingShort(false)
      setShortRenderProgress(0)
      setStatus('Short video cancelled.')
      return
    }
    window.speechSynthesis.cancel()
    const canvasStream = canvas.captureStream(30)
    const audioDestination = audioContext.createMediaStreamDestination()
    const stream = new MediaStream([...canvasStream.getVideoTracks(), ...audioDestination.stream.getAudioTracks()])
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 5_000_000, audioBitsPerSecond: 128_000 })
    const chunks: BlobPart[] = []
    recorder.addEventListener('dataavailable', (event) => { if (event.data.size) chunks.push(event.data) })
    const videoReady = new Promise<Blob>((resolve) => recorder.addEventListener('stop', () => resolve(new Blob(chunks, { type: 'video/webm' })), { once: true }))
    const narrationRate = settings.voiceRate * playbackSpeed
    const sceneDurations = narrationBuffers.map((buffer) => Math.max(shortSlideDuration(playbackSpeed), buffer.duration / narrationRate + 0.35))
    const totalSeconds = sceneDurations.reduce((total, duration) => total + duration, 0)
    // Content-aware template per slide; each remains until its complete narration finishes.
    const slideTemplateIndices = planShortTemplateIndices(shortSourceScenes, repository)
    const startedAt = performance.now()
    setShortRenderProgress(30)
    setStatus('Rendering your Cloudy Short film. Keep this tab active.')
    recorder.start(1_000)
    let narratedIdx: number | null = null
    let activeSource: AudioBufferSourceNode | null = null

    const drawShortFrame = (elapsed: number) => {
      let offset = 0
      let sceneIdx = shortSourceScenes.length - 1
      const scene = shortSourceScenes.find((_item, i) => {
        offset += sceneDurations[i]
        if (elapsed < offset) { sceneIdx = i; return true }
        return false
      }) ?? shortSourceScenes[shortSourceScenes.length - 1]
      if (sceneIdx !== narratedIdx) {
        narratedIdx = sceneIdx
        try { activeSource?.stop() } catch { /* ended */ }
        const source = audioContext.createBufferSource()
        source.buffer = narrationBuffers[sceneIdx]
        source.playbackRate.value = narrationRate
        source.connect(audioDestination)
        activeSource = source
        source.start()
      }
      const sceneDuration = sceneDurations[sceneIdx]
      const sceneElapsed = elapsed - (offset - sceneDuration)
      const sceneProgress = Math.min(1, sceneElapsed / sceneDuration)
      const entrance = Math.min(1, sceneElapsed / 0.6)
      const eased = 1 - (1 - entrance) ** 3
      const W = canvas.width
      const H = canvas.height
      const t = elapsed

      // Match the foreground composition to the content-selected background template.
      const selectedTemplate = SHORT_TEMPLATES[slideTemplateIndices[sceneIdx] ?? 0] ?? SHORT_TEMPLATES[0]
      const action = shortActionForTemplate(selectedTemplate.key)

      // ── Background: content-aware template or fallback gradient ──
      const tpl = templateImages[slideTemplateIndices[sceneIdx] ?? 0]
      if (tpl) {
        ctx.drawImage(tpl, 0, 0, W, H)
      } else {
        const bgColors = [
          ['#e8f4f8', '#d0e8f2'],
          ['#f0e8f8', '#e0d4f0'],
          ['#e8f8e8', '#d0f0d0'],
          ['#fdf4e8', '#f8e8d0'],
          ['#e8f0f8', '#d4e4f4'],
        ]
        const [bgTop, bgBot] = bgColors[sceneIdx % bgColors.length]
        const bgGrad = ctx.createLinearGradient(0, 0, 0, H)
        bgGrad.addColorStop(0, bgTop)
        bgGrad.addColorStop(1, bgBot)
        ctx.fillStyle = bgGrad
        ctx.fillRect(0, 0, W, H)
      }

      // Floor
      ctx.fillStyle = 'rgba(0,0,0,0.06)'
      ctx.fillRect(0, H * 0.72, W, H * 0.28)
      ctx.strokeStyle = 'rgba(0,0,0,0.08)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(0, H * 0.72)
      ctx.lineTo(W, H * 0.72)
      ctx.stroke()

      // ── Draw Cloudy cartoon character ──
      // Cloudy: cloud-shaped head, round body, stick arms and legs, big eyes, mouth
      function drawCloudy(cx: number, cy: number, scale: number, pose: 'wave' | 'point-right' | 'point-up' | 'walk' | 'think' | 'present' | 'celebrate') {
        const s = scale
        ctx.save()
        ctx.translate(cx, cy)

        // ── Legs (animated walk cycle or standing) ──
        ctx.strokeStyle = '#4a7c9c'
        ctx.lineWidth = 8 * s
        ctx.lineCap = 'round'
        const walkCycle = Math.sin(t * 6)
        const legSpread = pose === 'walk' ? walkCycle * 18 * s : 0
        // Left leg
        ctx.beginPath()
        ctx.moveTo(-16 * s, 50 * s)
        ctx.lineTo((-16 - legSpread) * s, 100 * s)
        ctx.stroke()
        // Left foot
        ctx.fillStyle = '#3a6a88'
        ctx.beginPath()
        ctx.ellipse((-16 - legSpread) * s, 104 * s, 12 * s, 6 * s, 0, 0, Math.PI * 2)
        ctx.fill()
        // Right leg
        ctx.beginPath()
        ctx.moveTo(16 * s, 50 * s)
        ctx.lineTo((16 + legSpread) * s, 100 * s)
        ctx.stroke()
        // Right foot
        ctx.beginPath()
        ctx.ellipse((16 + legSpread) * s, 104 * s, 12 * s, 6 * s, 0, 0, Math.PI * 2)
        ctx.fill()

        // ── Body (round cloud-like torso) ──
        ctx.fillStyle = '#f0f8ff'
        ctx.strokeStyle = '#b0d4e8'
        ctx.lineWidth = 3 * s
        ctx.beginPath()
        ctx.ellipse(0, 20 * s, 42 * s, 36 * s, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()

        // ── Arms (change per pose) ──
        ctx.strokeStyle = '#4a7c9c'
        ctx.lineWidth = 7 * s
        ctx.lineCap = 'round'
        if (pose === 'wave') {
          // Left arm resting
          ctx.beginPath()
          ctx.moveTo(-40 * s, 16 * s)
          ctx.lineTo(-60 * s, 40 * s)
          ctx.stroke()
          // Right arm waving (animated)
          const waveAngle = Math.sin(t * 5) * 0.4
          ctx.save()
          ctx.translate(40 * s, 10 * s)
          ctx.rotate(-1.2 + waveAngle)
          ctx.beginPath()
          ctx.moveTo(0, 0)
          ctx.lineTo(50 * s, 0)
          ctx.stroke()
          // Hand
          ctx.fillStyle = '#f0f8ff'
          ctx.beginPath()
          ctx.arc(52 * s, 0, 8 * s, 0, Math.PI * 2)
          ctx.fill()
          ctx.restore()
        } else if (pose === 'point-right' || pose === 'present') {
          // Left arm on hip
          ctx.beginPath()
          ctx.moveTo(-40 * s, 14 * s)
          ctx.quadraticCurveTo(-56 * s, 30 * s, -44 * s, 46 * s)
          ctx.stroke()
          // Right arm extended pointing
          const pointBob = Math.sin(t * 3) * 4 * s
          ctx.beginPath()
          ctx.moveTo(40 * s, 14 * s)
          ctx.lineTo(90 * s, -10 * s + pointBob)
          ctx.stroke()
          // Pointing hand
          ctx.fillStyle = '#f0f8ff'
          ctx.beginPath()
          ctx.arc(92 * s, -12 * s + pointBob, 7 * s, 0, Math.PI * 2)
          ctx.fill()
          // Pointing finger
          ctx.strokeStyle = '#f0f8ff'
          ctx.lineWidth = 4 * s
          ctx.beginPath()
          ctx.moveTo(97 * s, -14 * s + pointBob)
          ctx.lineTo(108 * s, -20 * s + pointBob)
          ctx.stroke()
        } else if (pose === 'point-up') {
          // Left arm resting
          ctx.beginPath()
          ctx.moveTo(-40 * s, 16 * s)
          ctx.lineTo(-55 * s, 42 * s)
          ctx.stroke()
          // Right arm pointing up
          const upBob = Math.sin(t * 2.5) * 5 * s
          ctx.beginPath()
          ctx.moveTo(38 * s, 10 * s)
          ctx.lineTo(50 * s, -40 * s + upBob)
          ctx.stroke()
          ctx.fillStyle = '#f0f8ff'
          ctx.beginPath()
          ctx.arc(52 * s, -44 * s + upBob, 7 * s, 0, Math.PI * 2)
          ctx.fill()
          ctx.strokeStyle = '#f0f8ff'
          ctx.lineWidth = 4 * s
          ctx.beginPath()
          ctx.moveTo(52 * s, -51 * s + upBob)
          ctx.lineTo(52 * s, -64 * s + upBob)
          ctx.stroke()
        } else if (pose === 'think') {
          // Left arm resting
          ctx.beginPath()
          ctx.moveTo(-40 * s, 16 * s)
          ctx.lineTo(-58 * s, 38 * s)
          ctx.stroke()
          // Right arm to chin (thinking)
          ctx.beginPath()
          ctx.moveTo(38 * s, 14 * s)
          ctx.quadraticCurveTo(44 * s, -10 * s, 20 * s, -40 * s)
          ctx.stroke()
          ctx.fillStyle = '#f0f8ff'
          ctx.beginPath()
          ctx.arc(18 * s, -42 * s, 7 * s, 0, Math.PI * 2)
          ctx.fill()
        } else if (pose === 'celebrate') {
          // Both arms up
          const cheerL = Math.sin(t * 6) * 0.3
          const cheerR = Math.sin(t * 6 + 1) * 0.3
          ctx.save()
          ctx.translate(-40 * s, 8 * s)
          ctx.rotate(-1.5 + cheerL)
          ctx.beginPath()
          ctx.moveTo(0, 0)
          ctx.lineTo(50 * s, 0)
          ctx.stroke()
          ctx.fillStyle = '#f0f8ff'
          ctx.beginPath()
          ctx.arc(52 * s, 0, 8 * s, 0, Math.PI * 2)
          ctx.fill()
          ctx.restore()
          ctx.save()
          ctx.translate(40 * s, 8 * s)
          ctx.rotate(-1.5 + cheerR)
          ctx.beginPath()
          ctx.moveTo(0, 0)
          ctx.lineTo(50 * s, 0)
          ctx.stroke()
          ctx.fillStyle = '#f0f8ff'
          ctx.beginPath()
          ctx.arc(52 * s, 0, 8 * s, 0, Math.PI * 2)
          ctx.fill()
          ctx.restore()
        } else {
          // walk — arms swing
          const armSwing = Math.sin(t * 6) * 0.5
          ctx.save()
          ctx.translate(-40 * s, 14 * s)
          ctx.rotate(armSwing)
          ctx.beginPath()
          ctx.moveTo(0, 0)
          ctx.lineTo(0, 46 * s)
          ctx.stroke()
          ctx.restore()
          ctx.save()
          ctx.translate(40 * s, 14 * s)
          ctx.rotate(-armSwing)
          ctx.beginPath()
          ctx.moveTo(0, 0)
          ctx.lineTo(0, 46 * s)
          ctx.stroke()
          ctx.restore()
        }

        // ── Head (cloud shape) ──
        ctx.fillStyle = '#f0f8ff'
        ctx.strokeStyle = '#b0d4e8'
        ctx.lineWidth = 2.5 * s
        ctx.beginPath()
        ctx.arc(0, -30 * s, 32 * s, 0, Math.PI * 2) // main
        ctx.fill()
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(-20 * s, -18 * s, 20 * s, 0, Math.PI * 2) // left puff
        ctx.fill()
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(20 * s, -18 * s, 20 * s, 0, Math.PI * 2) // right puff
        ctx.fill()
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(-10 * s, -48 * s, 18 * s, 0, Math.PI * 2) // top left
        ctx.fill()
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(10 * s, -48 * s, 18 * s, 0, Math.PI * 2) // top right
        ctx.fill()
        ctx.stroke()

        // Graduation cap
        ctx.fillStyle = '#2c5f7c'
        ctx.beginPath()
        ctx.moveTo(-28 * s, -58 * s)
        ctx.lineTo(0, -72 * s)
        ctx.lineTo(28 * s, -58 * s)
        ctx.lineTo(0, -50 * s)
        ctx.closePath()
        ctx.fill()
        // Tassel
        ctx.strokeStyle = '#f5a975'
        ctx.lineWidth = 2.5 * s
        const tasselSwing = Math.sin(t * 2) * 8 * s
        ctx.beginPath()
        ctx.moveTo(0, -60 * s)
        ctx.quadraticCurveTo(20 * s + tasselSwing, -52 * s, 24 * s + tasselSwing, -40 * s)
        ctx.stroke()

        // ── Eyes (with blinking) ──
        const blinkPhase = Math.sin(t * 4.2)
        const eyeH = blinkPhase < -0.92 ? 1 : 8 * s
        // Left eye
        ctx.fillStyle = '#fff'
        ctx.beginPath()
        ctx.ellipse(-12 * s, -32 * s, 10 * s, 10 * s, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#2c3e50'
        ctx.beginPath()
        ctx.ellipse(-12 * s, -32 * s, 6 * s, Math.min(6 * s, eyeH), 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#fff'
        ctx.beginPath()
        ctx.arc(-10 * s, -35 * s, 2.5 * s, 0, Math.PI * 2) // pupil highlight
        ctx.fill()
        // Right eye
        ctx.fillStyle = '#fff'
        ctx.beginPath()
        ctx.ellipse(12 * s, -32 * s, 10 * s, 10 * s, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#2c3e50'
        ctx.beginPath()
        ctx.ellipse(12 * s, -32 * s, 6 * s, Math.min(6 * s, eyeH), 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#fff'
        ctx.beginPath()
        ctx.arc(14 * s, -35 * s, 2.5 * s, 0, Math.PI * 2)
        ctx.fill()

        // ── Mouth (animated talking) ──
        const talking = Math.abs(Math.sin(t * 8)) * 6 * s + 2 * s
        ctx.fillStyle = '#d45b5b'
        ctx.beginPath()
        ctx.ellipse(0, -14 * s, 8 * s, talking, 0, 0, Math.PI * 2)
        ctx.fill()

        // ── Blush ──
        ctx.fillStyle = 'rgba(255, 180, 180, 0.35)'
        ctx.beginPath()
        ctx.ellipse(-22 * s, -22 * s, 8 * s, 5 * s, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.ellipse(22 * s, -22 * s, 8 * s, 5 * s, 0, 0, Math.PI * 2)
        ctx.fill()

        ctx.restore()
      }

      // ── Scene-specific content ──
      const accentColor = ['#4fc3f7', '#ce93d8', '#81c784', '#ffb74d', '#90caf9'][sceneIdx % 5]
      const bullets = (scene.bullets?.length ? scene.bullets : extractBullets(scene.narration)).slice(0, 5)
      const topics = (repository?.topics ?? []).slice(0, 6)
      const sceneAssetImages = scene.assets.map((a) => assetImageByUrl.get(a)).filter((img): img is HTMLImageElement => Boolean(img))
      const bgImg = sceneAssetImages[0] ?? null

      if (tpl) {
        // Loaded SVG templates own the composition. Populate their purpose-built slots directly.
        const drawSlotText = (text: string, x: number, y: number, width: number, height: number, maxSize = 36, color = '#17384b', align: CanvasTextAlign = 'left', minSize = 12) => {
          const layout = fitCanvasText(ctx, text, width, height, maxSize, minSize, '700')
          ctx.save()
          ctx.globalAlpha = eased
          ctx.fillStyle = color
          ctx.font = `700 ${layout.fontSize}px Manrope, sans-serif`
          ctx.textAlign = align
          const textX = align === 'center' ? x + width / 2 : x
          layout.lines.forEach((line, index) => ctx.fillText(line, textX, y + layout.lineHeight + index * layout.lineHeight))
          ctx.restore()
        }
        const drawSlotImage = (image: HTMLImageElement, x: number, y: number, width: number, height: number) => {
          ctx.save()
          ctx.beginPath()
          ctx.roundRect(x, y, width, height, 12)
          ctx.clip()
          ctx.fillStyle = '#f8fcff'
          ctx.fillRect(x, y, width, height)
          drawContainImage(ctx, image, x, y, width, height)
          ctx.restore()
        }
        // Subtle backing panel that demarcates a text zone so text always fits legibly.
        const drawZonePlate = (x: number, y: number, width: number, height: number, dark?: boolean) => {
          ctx.save()
          ctx.globalAlpha = eased
          ctx.beginPath()
          ctx.roundRect(x, y, width, height, 22)
          ctx.fillStyle = dark ? 'rgba(7, 18, 30, 0.46)' : 'rgba(255, 255, 255, 0.74)'
          ctx.fill()
          ctx.lineWidth = 2
          ctx.strokeStyle = dark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(20, 45, 65, 0.12)'
          ctx.stroke()
          ctx.restore()
        }
        const key = selectedTemplate.key
        const layout = SHORT_TEMPLATE_LAYOUTS[key]
        const titleSize = layout.title[2] > 700 ? 64 : 48
        layout.media?.forEach((slot, index) => {
          const image = sceneAssetImages[index]
          if (image) drawSlotImage(image, ...slot)
        })
        if (!layout.noTitlePlate) drawZonePlate(...layout.title, layout.dark)
        if (layout.contentPlate) layout.items.forEach((slot) => drawZonePlate(...slot, layout.dark))
        drawSlotText(shortTitleForScene(scene), ...layout.title, titleSize, layout.titleColor, layout.align)
        const slotItems = shortItemsForLayout(scene, layout, repository)
        slotItems.forEach((point, index) => {
          const slot = layout.items[index]
          if (!slot) return
          const contentSize = layout.mono ? 26 : slot[2] < 220 ? 22 : 30
          drawSlotText(point, ...slot, contentSize, layout.contentColor, layout.align)
        })
        // Animated talking Cloudy head, overlaid where templates used to bake in the mascot.
        const [clx, cly, clw, clh] = SHORT_CLOUDY_RECT
        const cloudyScale = Math.min(clw / 300, clh / 224)
        const cloudyCx = clx + clw / 2
        const cloudyCy = cly + clh / 2 + Math.sin(t * 2) * 8
        ctx.save()
        ctx.translate(cloudyCx, cloudyCy)
        ctx.rotate(Math.sin(t * 1.6) * 0.03)
        ctx.scale(cloudyScale, cloudyScale)
        const TAU = Math.PI * 2
        // soft ground shadow
        ctx.save(); ctx.globalAlpha = 0.2; ctx.fillStyle = '#0b1f2a'; ctx.beginPath(); ctx.ellipse(0, 104, 118, 22, 0, 0, TAU); ctx.fill(); ctx.restore()
        // cloud puffs
        ctx.fillStyle = '#ffffff'
        const puff = (px: number, py: number, r: number) => { ctx.beginPath(); ctx.arc(px, py, r, 0, TAU); ctx.fill() }
        puff(-78, 20, 72); puff(78, 20, 72); puff(-36, -48, 62); puff(38, -48, 62)
        ctx.beginPath(); ctx.ellipse(0, 28, 126, 82, 0, 0, TAU); ctx.fill()
        // graduation cap
        ctx.fillStyle = '#24516c'; ctx.beginPath(); ctx.moveTo(-76, -62); ctx.lineTo(0, -96); ctx.lineTo(76, -62); ctx.lineTo(0, -28); ctx.closePath(); ctx.fill()
        ctx.fillStyle = '#367594'; ctx.beginPath(); ctx.moveTo(-76, -62); ctx.lineTo(0, -86); ctx.lineTo(76, -62); ctx.lineTo(0, -38); ctx.closePath(); ctx.fill()
        ctx.strokeStyle = '#f2a66f'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(50, -53); ctx.lineTo(50, 6); ctx.stroke()
        ctx.fillStyle = '#f2a66f'; ctx.beginPath(); ctx.arc(50, 13, 8, 0, TAU); ctx.fill()
        // eyes (with occasional blink)
        const blink = Math.sin(t * 1.7) > 0.94 ? 0.16 : 1
        ctx.fillStyle = '#ffffff'
        ctx.beginPath(); ctx.ellipse(-31, 4, 15, 18, 0, 0, TAU); ctx.fill()
        ctx.beginPath(); ctx.ellipse(31, 4, 15, 18, 0, 0, TAU); ctx.fill()
        ctx.fillStyle = '#233849'
        ctx.beginPath(); ctx.ellipse(-29, 7, 10, 10 * blink, 0, 0, TAU); ctx.fill()
        ctx.beginPath(); ctx.ellipse(33, 7, 10, 10 * blink, 0, 0, TAU); ctx.fill()
        ctx.fillStyle = '#ffffff'
        ctx.beginPath(); ctx.arc(-26, 2, 3, 0, TAU); ctx.fill()
        ctx.beginPath(); ctx.arc(36, 2, 3, 0, TAU); ctx.fill()
        // talking mouth (opens and closes)
        const mouthOpen = Math.abs(Math.sin(t * 7)) * 11 + 2
        ctx.fillStyle = '#c43830'
        ctx.beginPath(); ctx.moveTo(-18, 42); ctx.quadraticCurveTo(0, 42 + mouthOpen, 18, 42); ctx.quadraticCurveTo(0, 42 + mouthOpen * 0.35, -18, 42); ctx.fill()
        ctx.strokeStyle = '#d45b5b'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-18, 42); ctx.quadraticCurveTo(0, 42 + mouthOpen, 18, 42); ctx.stroke()
        ctx.restore()
      } else if (action === 'intro') {
        // ── Cloudy walks in from left, title appears ──
        const walkX = eased * W * 0.38
        drawCloudy(walkX, H * 0.52, 1.6, eased < 0.9 ? 'walk' : 'wave')
        // Title card on the right
        ctx.save()
        ctx.globalAlpha = eased
        ctx.fillStyle = 'rgba(0,0,0,0.06)'
        ctx.beginPath()
        ctx.roundRect(W * 0.52, H * 0.15, W * 0.44, H * 0.42, 16)
        ctx.fill()
        ctx.fillStyle = accentColor
        ctx.font = '700 18px Manrope, sans-serif'
        ctx.fillText(`SCENE ${sceneIdx + 1}`, W * 0.56, H * 0.22)
        const titleLayout = fitCanvasText(ctx, scene.title, W * 0.38, 120, 46, 24, '800')
        ctx.fillStyle = '#1a2a3a'
        ctx.font = `800 ${titleLayout.fontSize}px Manrope, sans-serif`
        titleLayout.lines.forEach((line, i) => ctx.fillText(line, W * 0.56, H * 0.28 + i * titleLayout.lineHeight))
        // Bullet points fade in
        bullets.forEach((bullet, i) => {
          const bulletAlpha = Math.max(0, Math.min(1, (sceneProgress - 0.2 - i * 0.12) * 4))
          ctx.globalAlpha = bulletAlpha
          ctx.fillStyle = accentColor
          ctx.beginPath()
          ctx.arc(W * 0.56, H * 0.40 + i * 42, 5, 0, Math.PI * 2)
          ctx.fill()
          const bulletLayout = fitCanvasText(ctx, bullet, W * 0.36, 58, 18, 12)
          ctx.fillStyle = '#2c3e50'
          ctx.font = `400 ${bulletLayout.fontSize}px Manrope, sans-serif`
          bulletLayout.lines.forEach((line, lineIdx) => ctx.fillText(line, W * 0.58, H * 0.405 + i * 42 + lineIdx * bulletLayout.lineHeight))
        })
        ctx.restore()

      } else if (action === 'presenting') {
        // ── Cloudy points at a big screen/monitor showing content ──
        // Monitor
        ctx.fillStyle = '#1e3a4f'
        ctx.beginPath()
        ctx.roundRect(W * 0.32, H * 0.08, W * 0.62, H * 0.48, 14)
        ctx.fill()
        // Screen inner
        ctx.fillStyle = '#f8fcff'
        ctx.beginPath()
        ctx.roundRect(W * 0.34, H * 0.10, W * 0.58, H * 0.44, 8)
        ctx.fill()
        // Monitor stand
        ctx.fillStyle = '#1e3a4f'
        ctx.fillRect(W * 0.58, H * 0.56, W * 0.10, H * 0.04)
        ctx.fillRect(W * 0.52, H * 0.59, W * 0.22, H * 0.015)
        // Content on screen
        if (bgImg) {
          ctx.save()
          ctx.beginPath()
          ctx.roundRect(W * 0.36, H * 0.12, W * 0.54, H * 0.38, 4)
          ctx.clip()
          drawContainImage(ctx, bgImg, W * 0.36, H * 0.12, W * 0.54, H * 0.38)
          ctx.restore()
        } else {
          ctx.fillStyle = accentColor
          ctx.font = '800 28px Manrope, sans-serif'
          ctx.fillText(scene.title, W * 0.38, H * 0.20)
          bullets.forEach((bullet, i) => {
            const bAlpha = Math.max(0, Math.min(1, (sceneProgress - i * 0.15) * 3))
            ctx.save()
            ctx.globalAlpha = bAlpha
            ctx.fillStyle = accentColor
            ctx.beginPath()
            ctx.arc(W * 0.38, H * 0.27 + i * 52, 6, 0, Math.PI * 2)
            ctx.fill()
            const bulletLayout = fitCanvasText(ctx, bullet, W * 0.48, 70, 20, 12)
            ctx.fillStyle = '#2c3e50'
            ctx.font = `400 ${bulletLayout.fontSize}px Manrope, sans-serif`
            bulletLayout.lines.forEach((line, lineIdx) => ctx.fillText(line, W * 0.40, H * 0.276 + i * 52 + lineIdx * bulletLayout.lineHeight))
            ctx.restore()
          })
        }
        // Cloudy standing beside it, pointing
        drawCloudy(W * 0.16, H * 0.52, 1.4, 'point-right')

      } else if (action === 'whiteboard') {
        // ── Cloudy next to whiteboard writing/drawing concepts ──
        // Whiteboard
        ctx.fillStyle = '#fff'
        ctx.strokeStyle = '#ccc'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.roundRect(W * 0.06, H * 0.06, W * 0.58, H * 0.50, 6)
        ctx.fill()
        ctx.stroke()
        // Whiteboard frame
        ctx.fillStyle = '#8b8b8b'
        ctx.fillRect(W * 0.06, H * 0.555, W * 0.58, 8)
        // Whiteboard tray
        ctx.fillStyle = '#aaa'
        ctx.fillRect(W * 0.15, H * 0.56, W * 0.40, 10)
        // Content appearing on whiteboard
        ctx.fillStyle = '#1a2a3a'
        ctx.font = '800 30px Manrope, sans-serif'
        ctx.fillText(scene.title, W * 0.10, H * 0.14)
        // Draw connecting lines / diagram on whiteboard
        const diagramItems = bullets.slice(0, 4)
        diagramItems.forEach((item, i) => {
          const appear = Math.max(0, Math.min(1, (sceneProgress - i * 0.18) * 3.5))
          if (appear <= 0) return
          const bx = W * 0.10 + (i % 2) * W * 0.28
          const by = H * 0.20 + Math.floor(i / 2) * H * 0.16
          ctx.save()
          ctx.globalAlpha = appear
          // Box
          ctx.fillStyle = accentColor
          ctx.globalAlpha = appear * 0.15
          ctx.beginPath()
          ctx.roundRect(bx, by, W * 0.24, H * 0.11, 8)
          ctx.fill()
          ctx.globalAlpha = appear
          ctx.strokeStyle = accentColor
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.roundRect(bx, by, W * 0.24, H * 0.11, 8)
          ctx.stroke()
          const itemLayout = fitCanvasText(ctx, item, W * 0.24 - 24, H * 0.11 - 18, 16, 10)
          ctx.fillStyle = '#2c3e50'
          ctx.font = `400 ${itemLayout.fontSize}px Manrope, sans-serif`
          itemLayout.lines.forEach((line, lineIdx) => ctx.fillText(line, bx + 12, by + 16 + lineIdx * itemLayout.lineHeight))
          // Connecting arrow
          if (i > 0) {
            ctx.strokeStyle = accentColor
            ctx.lineWidth = 2
            ctx.setLineDash([4, 4])
            ctx.beginPath()
            const prevBx = W * 0.10 + ((i - 1) % 2) * W * 0.28
            const prevBy = H * 0.20 + Math.floor((i - 1) / 2) * H * 0.16
            ctx.moveTo(prevBx + W * 0.12, prevBy + H * 0.11)
            ctx.lineTo(bx + W * 0.12, by)
            ctx.stroke()
            ctx.setLineDash([])
          }
          ctx.restore()
        })
        // Cloudy pointing up at whiteboard
        drawCloudy(W * 0.78, H * 0.46, 1.3, 'point-up')

      } else if (action === 'diagram') {
        // ── Cloudy presenting floating topic objects around it ──
        drawCloudy(W * 0.5, H * 0.42, 1.5, 'present')
        // Floating topic objects orbit around Cloudy
        const allLabels = topics.length > 0 ? topics : scene.title.split(' ').filter((w) => w.length > 2).slice(0, 5)
        allLabels.forEach((label, i) => {
          const angle = (t * 0.6) + (i * Math.PI * 2 / allLabels.length)
          const radius = 250 + Math.sin(t * 0.4 + i) * 30
          const ox = W * 0.5 + Math.cos(angle) * radius
          const oy = H * 0.38 + Math.sin(angle) * radius * 0.4
          const objScale = 0.8 + Math.sin(t + i * 2) * 0.15
          ctx.save()
          ctx.translate(ox, oy)
          ctx.scale(objScale, objScale)
          // Rounded pill shape
          ctx.fillStyle = accentColor
          ctx.beginPath()
          ctx.roundRect(-46, -20, 92, 40, 20)
          ctx.fill()
          const orbitLabelLayout = fitCanvasText(ctx, label.toUpperCase(), 76, 26, 14, 9, '700')
          ctx.fillStyle = '#fff'
          ctx.font = `700 ${orbitLabelLayout.fontSize}px Manrope, sans-serif`
          ctx.textAlign = 'center'
          orbitLabelLayout.lines.forEach((line, lineIdx) => {
            const totalHeight = orbitLabelLayout.lines.length * orbitLabelLayout.lineHeight
            const topY = -Math.floor(totalHeight / 2) + orbitLabelLayout.lineHeight
            ctx.fillText(line, 0, topY + lineIdx * orbitLabelLayout.lineHeight)
          })
          ctx.textAlign = 'left'
          ctx.restore()
        })
        // Scene label
        ctx.fillStyle = 'rgba(0,0,0,0.05)'
        ctx.beginPath()
        ctx.roundRect(50, H * 0.06, W - 100, 50, 10)
        ctx.fill()
        ctx.fillStyle = accentColor
        ctx.font = '700 16px Manrope, sans-serif'
        ctx.fillText(`SCENE ${sceneIdx + 1}`, 70, H * 0.06 + 32)
        ctx.fillStyle = '#2c3e50'
        ctx.font = '700 18px Manrope, sans-serif'
        ctx.fillText(scene.title, 170, H * 0.06 + 32)

      } else {
        // ── Farewell: Cloudy celebrates, recap card ──
        // Recap card
        ctx.fillStyle = 'rgba(0,0,0,0.05)'
        ctx.beginPath()
        ctx.roundRect(W * 0.08, H * 0.06, W * 0.84, H * 0.38, 16)
        ctx.fill()
        ctx.fillStyle = accentColor
        ctx.font = '700 16px Manrope, sans-serif'
        ctx.fillText('RECAP', W * 0.13, H * 0.12)
        ctx.fillStyle = '#1a2a3a'
        const recapLayout = fitCanvasText(ctx, scene.title, W * 0.74, 80, 38, 22, '800')
        ctx.font = `800 ${recapLayout.fontSize}px Manrope, sans-serif`
        recapLayout.lines.forEach((line, i) => ctx.fillText(line, W * 0.13, H * 0.18 + i * recapLayout.lineHeight))
        // Key points
        bullets.forEach((bullet, i) => {
          const bAppear = Math.max(0, Math.min(1, (sceneProgress - i * 0.1) * 4))
          ctx.save()
          ctx.globalAlpha = bAppear
          ctx.fillStyle = '#57ab5a'
          ctx.font = '700 22px Manrope, sans-serif'
          ctx.fillText('✓', W * 0.13, H * 0.26 + i * 40)
          const bulletLayout = fitCanvasText(ctx, bullet, W * 0.72, 54, 18, 12)
          ctx.fillStyle = '#2c3e50'
          ctx.font = `400 ${bulletLayout.fontSize}px Manrope, sans-serif`
          bulletLayout.lines.forEach((line, lineIdx) => ctx.fillText(line, W * 0.16, H * 0.26 + i * 40 + lineIdx * bulletLayout.lineHeight))
          ctx.restore()
        })
        // Cloudy celebrating
        drawCloudy(W * 0.5, H * 0.58, 1.6, 'celebrate')
        // Confetti
        for (let i = 0; i < 20; i++) {
          const cfx = ((i * 73 + t * 60) % W)
          const cfy = ((i * 47 + t * 40 + Math.sin(t * 2 + i) * 30) % (H * 0.5)) + H * 0.3
          const cfColor = ['#f5a975', '#4fc3f7', '#ce93d8', '#81c784', '#ffb74d'][i % 5]
          ctx.fillStyle = cfColor
          ctx.save()
          ctx.translate(cfx, cfy)
          ctx.rotate(t * 3 + i)
          ctx.fillRect(-4, -4, 8, 8)
          ctx.restore()
        }
      }

      // ── Progress bar ──
      const progress = Math.min(1, elapsed / totalSeconds)
      ctx.fillStyle = 'rgba(0,0,0,.12)'
      ctx.fillRect(0, H - 18, W, 6)
      ctx.fillStyle = accentColor
      ctx.fillRect(0, H - 18, W * progress, 6)

      // ── Watermark ──
      ctx.save()
      ctx.globalAlpha = 0.4
      ctx.fillStyle = '#607080'
      ctx.font = '700 16px Manrope, sans-serif'
      ctx.fillText('Cloud2BR', W - 150, H - 28)
      ctx.restore()
    }

    const renderFrame = () => {
      const elapsed = (performance.now() - startedAt) / 1_000
      drawShortFrame(elapsed)
      setShortRenderProgress(30 + Math.round((elapsed / totalSeconds) * 70))
      if (shortRenderAbortRef.current || elapsed >= totalSeconds) {
        try { activeSource?.stop() } catch { /* ended */ }
        recorder.stop()
        return
      }
      window.requestAnimationFrame(renderFrame)
    }
    window.requestAnimationFrame(renderFrame)
    const video = await videoReady
    stream.getTracks().forEach((track) => track.stop())
    await audioContext.close()
    setIsRenderingShort(false)
    setShortRenderProgress(0)
    if (shortRenderAbortRef.current) {
      setStatus('Short video cancelled.')
      return
    }
    const url = URL.createObjectURL(video)
    const link = document.createElement('a')
    link.href = url
    link.download = `cloudy-short-${normalizedSentence(shortTopic.title).replace(/\s+/g, '-') || 'topic'}-${speedLabel(playbackSpeed)}.webm`
    link.click()
    URL.revokeObjectURL(url)
    setStatus(`Cloudy Short video downloaded (${durationLabel(shortRuntime)}, horizontal 1920×1080).`)
  }

  function cancelShortVideo() {
    shortRenderAbortRef.current = true
    shortRenderAbortControllerRef.current?.abort()
    setStatus('Stopping short video render.')
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
              <h1>Turn a documented topic into a complete Cloudy story.</h1>
            </div>
            {repository && <p className="status" aria-live="polite">{isRenderingShort ? `Rendering short video ${shortRenderProgress}%.` : isShortPreviewPlaying ? `Playing beat ${shortPreviewBeatIdx + 1} of ${shortSourceScenes.length}.` : `${shortSourceScenes.length} beats · ${durationLabel(shortRuntime)} at ${speedLabel(playbackSpeed)}.`}</p>}
          </div>
          <form className={`shorts-source${repository ? ' compact' : ''}`} onSubmit={(event) => { event.preventDefault(); void loadRepository(repositoryUrl) }}>
            <label htmlFor="shorts-repository-url">Public GitHub repository</label>
            <div className="url-entry">
              <input id="shorts-repository-url" type="text" inputMode="url" autoCapitalize="none" spellCheck={false} value={repositoryUrl} onChange={(event) => setRepositoryUrl(event.target.value)} placeholder="https://github.com/owner/repository" disabled={isLoading} />
              <button className="primary-button" type="submit" disabled={isLoading}>{isLoading ? 'Reading repository' : repository ? 'Regenerate Shorts' : 'Build Shorts library'}</button>
            </div>
            {!repository && <p>Cloudy will use English documentation and linked repository visuals to build short-form story material.</p>}
          </form>
          {repository && (
            <>
              <section className="shorts-controls" aria-label="Short video controls">
                <label htmlFor="short-topic">Topic to explain</label>
                <select id="short-topic" value={shortTopic.id} onChange={(event) => {
                  setShortTopicId(Number(event.target.value))
                  setShortPreviewBeatIdx(0)
                  setPausedShortBeatIndex(null)
                }} disabled={isShortPreviewPlaying || isRenderingShort}>
                  {scenes.map((scene) => <option key={scene.id} value={scene.id}>{scene.title}</option>)}
                </select>
                <span className="shorts-runtime">{durationLabel(shortRuntime)} short</span>
                {isShortPreviewPlaying ? (
                  <button className="secondary-button" type="button" onClick={stopShortPreview}>⏸ Pause</button>
                ) : (
                  <>
                    {pausedShortBeatIndex !== null && (
                      <button className="secondary-button" type="button" onClick={() => void previewShort(pausedShortBeatIndex)} disabled={isRenderingShort}>▶ Resume beat {pausedShortBeatIndex + 1}</button>
                    )}
                    <button className="primary-button" type="button" onClick={() => void previewShort(0)} disabled={isRenderingShort}>▶ {pausedShortBeatIndex === null ? 'Play' : 'Replay'}</button>
                  </>
                )}
                <label className="playback-speed" htmlFor="short-speed">
                  Speed
                  <select id="short-speed" value={playbackSpeed} onChange={(event) => setPlaybackSpeed(Number(event.target.value) as (typeof PLAYBACK_SPEED_OPTIONS)[number])} disabled={isShortPreviewPlaying || isRenderingShort}>
                    {PLAYBACK_SPEED_OPTIONS.map((speed) => <option key={speed} value={speed}>{speedLabel(speed)}</option>)}
                  </select>
                </label>
              </section>
              <section className="shorts-production-grid">
                <article ref={shortStageRef} className={`short-stage template-${activeShortTemplate.key}`} aria-label={`Cloudy Short preview: ${shortTopic.title}`}>
                  <img className="short-stage-template" src={activeShortTemplate.url} alt="" aria-hidden="true" />
                  <div className="short-stage-media" aria-label="Repository visuals">
                    {activeShortAssets.slice(0, activeShortLayout.media?.length ?? 0).map((asset, index) => (
                      <img key={asset} src={asset} alt={`${activeShortScene.assetLabel} ${index + 1}`} style={shortRectStyle(activeShortLayout.media?.[index] ?? [0, 0, 0, 0])} />
                    ))}
                  </div>
                  <div className="short-stage-plates" aria-hidden="true">
                    {!activeShortLayout.noTitlePlate && <span className={`zone-plate ${activeShortLayout.dark ? 'dark' : 'light'}`} style={shortRectStyle(activeShortLayout.title)} />}
                    {activeShortLayout.contentPlate && activeShortItems.map((_, index) => (
                      <span key={index} className={`zone-plate ${activeShortLayout.dark ? 'dark' : 'light'}`} style={shortRectStyle(activeShortLayout.items[index])} />
                    ))}
                  </div>
                  <div className="short-stage-cloudy" style={shortRectStyle(SHORT_CLOUDY_RECT)}>
                    <CloudyAvatar speaking={isShortPreviewPlaying} size={280} />
                  </div>
                  <h2 className="short-stage-title" data-fit-frac="0.041" data-fit-cap="32" style={{ ...shortRectStyle(activeShortLayout.title), color: activeShortLayout.titleColor }}>{shortTitleForScene(activeShortScene)}</h2>
                  <div className={`short-stage-content${activeShortLayout.mono ? ' mono' : ''}`}>
                    {activeShortItems.map((bullet, index) => (
                      <p key={`${index}-${bullet}`} data-fit-frac="0.026" data-fit-cap="15" style={{ ...shortRectStyle(activeShortLayout.items[index]), color: activeShortLayout.contentColor, textAlign: activeShortLayout.align }}>{bullet}</p>
                    ))}
                  </div>
                  <span className="shorts-watermark" aria-hidden="true">Cloud2BR</span>
                </article>
                <aside className="shorts-library">
                  <div className="shorts-export-actions">
                    {isRenderingShort ? (
                      <button className="secondary-button" type="button" onClick={cancelShortVideo}>Cancel render ({shortRenderProgress}%)</button>
                    ) : (
                      <button className="primary-button" type="button" onClick={() => void exportShortVideo()}>Export short video</button>
                    )}
                    <button className="secondary-button" type="button" onClick={downloadShortScript} disabled={isRenderingShort}>Download script</button>
                  </div>
                </aside>
              </section>
              <section className="shorts-beats" aria-labelledby="shorts-beats-title">
                <div><p className="eyebrow">Narrative sequence</p><h2 id="shorts-beats-title">Five documented beats</h2></div>
                <ol>{shortSourceScenes.map((scene, i) => {
                  const isActive = isShortPreviewPlaying && shortPreviewBeatIdx === i
                  const isPast = isShortPreviewPlaying && shortPreviewBeatIdx > i
                  return (
                    <li key={scene.id} className={isActive ? 'active' : isPast ? 'past' : ''}>
                      <button type="button" className="short-beat-button" onClick={() => seekShortToBeat(i)} title={`Go to beat ${i + 1}: ${scene.title}`}>
                        <span>{String(scene.slideInSection).padStart(2, '0')}</span>
                        <div><strong>{scene.title}</strong><p>{scene.narration}</p></div>
                      </button>
                    </li>
                  )
                })}</ol>
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
                {isLoading ? 'Reading repository' : 'Generate explainer'}
              </button>
            </div>
            <p>Cloudy reads public repository details only. Private repositories are not available in this browser-only version.</p>
          </form>
          <section className="projects-panel" aria-label="Project management">
            <details>
              <summary><strong>💾 Save & Load Projects</strong></summary>
              <div className="projects-controls">
                <div className="project-name-input">
                  <label htmlFor="project-name">Project name</label>
                  <input
                    id="project-name"
                    type="text"
                    value={projectName}
                    onChange={(event) => setProjectName(event.target.value)}
                    placeholder="My Cloudy Project"
                    disabled={isLoading || isRenderingVideo}
                  />
                </div>
                <div className="project-actions">
                  <button type="button" onClick={saveCurrentProject} disabled={!repository || isLoading || isRenderingVideo}>
                    💾 Save Project
                  </button>
                  <button type="button" onClick={exportCurrentProject} disabled={!repository || isLoading || isRenderingVideo}>
                    📤 Export JSON
                  </button>
                  <label className="import-button">
                    📥 Import JSON
                    <input type="file" accept=".json" onChange={importProjectFile} style={{ display: 'none' }} />
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      clearRepositoryCache()
                      setStatus('Repository cache cleared. Next load will fetch fresh data from GitHub.')
                    }}
                    disabled={isLoading || isRenderingVideo}
                    title="Clear cached repository data"
                  >
                    🗑️ Clear Cache
                  </button>
                </div>
                {savedProjects.length > 0 && (
                  <div className="saved-projects-list">
                    <p><strong>Saved Projects ({savedProjects.length})</strong></p>
                    <ul>
                      {savedProjects.slice(0, 5).map((project) => (
                        <li key={project.name}>
                          <span>{project.name}</span>
                          <small>{new Date(project.timestamp).toLocaleDateString()}</small>
                          <div className="project-item-actions">
                            <button type="button" onClick={() => loadProjectById(project.name)} disabled={isLoading || isRenderingVideo}>
                              Load
                            </button>
                            <button type="button" onClick={() => deleteProjectById(project.name)} disabled={isLoading || isRenderingVideo}>
                              Delete
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </details>
          </section>
          <section className="projects-panel" aria-label="Template management">
            <details>
              <summary><strong>🎨 Custom Templates ({customTemplates.length})</strong></summary>
              <div className="projects-controls">
                <p style={{ fontSize: '0.9em', color: '#666' }}>
                  Load JSON-defined custom templates to extend the built-in template library.
                </p>
                <div className="project-actions">
                  <label className="import-button">
                    📥 Load Templates JSON
                    <input type="file" accept=".json" onChange={importCustomTemplatesFile} style={{ display: 'none' }} />
                  </label>
                  {customTemplates.length > 0 && (
                    <button type="button" onClick={clearCustomTemplates} disabled={isLoading || isRenderingVideo}>
                      🗑️ Clear All
                    </button>
                  )}
                </div>
                {customTemplates.length > 0 && (
                  <div className="saved-projects-list">
                    <p><strong>Loaded Templates</strong></p>
                    <ul>
                      {customTemplates.map((template) => (
                        <li key={template.key}>
                          <span>{template.name}</span>
                          <small>{template.key}</small>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </details>
          </section>
          <section className="projects-panel" aria-label="Branding customization">
            <details>
              <summary><strong>🎨 Custom Branding</strong></summary>
              <div className="projects-controls">
                <p style={{ fontSize: '0.9em', color: '#666' }}>
                  Customize the logo, brand name, and theme colors for your videos.
                </p>
                <div className="project-name-input">
                  <label htmlFor="brand-name">Brand Name</label>
                  <input
                    id="brand-name"
                    type="text"
                    value={settings.customBrandName || 'Cloudy'}
                    onChange={(event) => setSettings({ ...settings, customBrandName: event.target.value })}
                    placeholder="Your Brand Name"
                    disabled={isLoading || isRenderingVideo}
                  />
                </div>
                <div className="project-name-input">
                  <label htmlFor="logo-url">Custom Logo URL</label>
                  <input
                    id="logo-url"
                    type="url"
                    value={settings.customLogoUrl || ''}
                    onChange={(event) => setSettings({ ...settings, customLogoUrl: event.target.value })}
                    placeholder="https://example.com/logo.png"
                    disabled={isLoading || isRenderingVideo}
                  />
                </div>
                <div className="project-name-input">
                  <label htmlFor="theme-color">Theme Color</label>
                  <input
                    id="theme-color"
                    type="color"
                    value={settings.customThemeColor || '#17384b'}
                    onChange={(event) => setSettings({ ...settings, customThemeColor: event.target.value })}
                    disabled={isLoading || isRenderingVideo}
                    style={{ height: '40px', width: '100%', cursor: 'pointer' }}
                  />
                </div>
                <div className="project-name-input">
                  <label htmlFor="outro-message">Outro Message</label>
                  <textarea
                    id="outro-message"
                    value={settings.customOutroMessage || 'Keep learning and building amazing things!'}
                    onChange={(event) => setSettings({ ...settings, customOutroMessage: event.target.value })}
                    placeholder="Custom message for video outro"
                    disabled={isLoading || isRenderingVideo}
                    style={{ minHeight: '60px', width: '100%', padding: '8px', fontFamily: 'inherit' }}
                  />
                </div>
                <div className="project-actions">
                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, customLogoUrl: '', customBrandName: 'Cloudy', customOutroMessage: 'Keep learning and building amazing things!', customThemeColor: '#17384b' })}
                    disabled={isLoading || isRenderingVideo}
                  >
                    Reset to Defaults
                  </button>
                </div>
              </div>
            </details>
          </section>
          <section className="projects-panel" aria-label="Language settings">
            <details>
              <summary><strong>🌍 Language Settings</strong></summary>
              <div className="projects-controls">
                <p style={{ fontSize: '0.9em', color: '#666' }}>
                  Choose your preferred interface language.
                </p>
                <div className="project-name-input">
                  <label htmlFor="ui-language">UI Language</label>
                  <select
                    id="ui-language"
                    value={settings.uiLanguage}
                    onChange={(event) => setSettings({ ...settings, uiLanguage: event.target.value as 'en' | 'es' | 'pt' | 'fr' | 'de' })}
                    disabled={isLoading || isRenderingVideo}
                    style={{ width: '100%', padding: '8px', fontSize: '1em' }}
                  >
                    <option value="en">English</option>
                    <option value="es">Español</option>
                    <option value="pt">Português</option>
                    <option value="fr">Français</option>
                    <option value="de">Deutsch</option>
                  </select>
                </div>
                <div style={{ marginTop: '10px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={settings.detectRepositoryLanguage}
                      onChange={(event) => setSettings({ ...settings, detectRepositoryLanguage: event.target.checked })}
                      disabled={isLoading || isRenderingVideo}
                    />
                    <span>Auto-detect repository language</span>
                  </label>
                </div>
              </div>
            </details>
          </section>
          {repository && (
            <section className="projects-panel" aria-label="Quality metrics">
              <details>
                <summary><strong>📊 Content Quality & Analytics</strong></summary>
                <div className="projects-controls">
                  {(() => {
                    const quality = calculateQualityScore(repository, scenes)
                    return (
                      <>
                        <div style={{ padding: '15px', background: quality.score >= 70 ? '#e8f5e9' : quality.score >= 50 ? '#fff3e0' : '#ffebee', borderRadius: '8px', marginBottom: '15px' }}>
                          <h3 style={{ margin: '0 0 10px 0', fontSize: '1.1em' }}>
                            Quality Score: {quality.score}/100
                          </h3>
                          <div style={{ width: '100%', height: '12px', background: '#ddd', borderRadius: '6px', overflow: 'hidden' }}>
                            <div style={{ width: `${quality.score}%`, height: '100%', background: quality.score >= 70 ? '#4caf50' : quality.score >= 50 ? '#ff9800' : '#f44336', transition: 'width 0.3s' }} />
                          </div>
                        </div>
                        <div style={{ marginBottom: '15px' }}>
                          <p style={{ margin: '0 0 8px 0', fontWeight: 'bold' }}>Feedback:</p>
                          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.9em' }}>
                            {quality.feedback.map((item, idx) => (
                              <li key={idx} style={{ marginBottom: '4px' }}>{item}</li>
                            ))}
                          </ul>
                        </div>
                        <div style={{ padding: '10px', background: '#f5f5f5', borderRadius: '4px', fontSize: '0.85em' }}>
                          <p style={{ margin: '0 0 8px 0', fontWeight: 'bold' }}>Session Stats:</p>
                          <p style={{ margin: '4px 0' }}>Repositories loaded: {getAnalytics().filter(e => e.type === 'repository_loaded').length}</p>
                          <p style={{ margin: '4px 0' }}>Total events tracked: {getAnalytics().length}</p>
                        </div>
                      </>
                    )
                  })()}
                </div>
              </details>
            </section>
          )}
          <section className="projects-panel" aria-label="Batch processing">
            <details>
              <summary><strong>📦 {t('batchProcessing', settings.uiLanguage)}</strong></summary>
              <div className="projects-controls">
                <p style={{ fontSize: '0.9em', color: '#666' }}>
                  Process multiple repositories at once. Enter one URL per line (max 10).
                </p>
                <div className="project-name-input">
                  <label htmlFor="batch-urls">Repository URLs (one per line)</label>
                  <textarea
                    id="batch-urls"
                    value={batchUrls}
                    onChange={(event) => setBatchUrls(event.target.value)}
                    placeholder="https://github.com/owner/repo1&#10;https://github.com/owner/repo2&#10;https://github.com/owner/repo3"
                    disabled={isLoading || isRenderingVideo || isBatchProcessing}
                    style={{ minHeight: '100px', width: '100%', padding: '8px', fontFamily: 'monospace', fontSize: '0.9em' }}
                  />
                </div>
                {isBatchProcessing && (
                  <div style={{ padding: '10px', background: '#f0f0f0', borderRadius: '4px' }}>
                    <p><strong>Processing: {batchProgress.current} of {batchProgress.total}</strong></p>
                    <progress value={batchProgress.current} max={batchProgress.total} style={{ width: '100%', height: '20px' }} />
                  </div>
                )}
                <div className="project-actions">
                  {!isBatchProcessing ? (
                    <button type="button" onClick={startBatchProcessing} disabled={isLoading || isRenderingVideo || !batchUrls.trim()}>
                      ▶️ Start Batch Processing
                    </button>
                  ) : (
                    <button type="button" onClick={cancelBatchProcessing}>
                      ⏹️ Cancel Batch
                    </button>
                  )}
                </div>
                <p style={{ fontSize: '0.85em', color: '#888', marginTop: '10px' }}>
                  Each repository will be loaded, processed, and automatically saved as a project.
                  Processing includes a 2-second delay between repositories to avoid GitHub rate limits.
                </p>
              </div>
            </details>
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
