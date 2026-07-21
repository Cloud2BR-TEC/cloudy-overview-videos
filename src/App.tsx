import { useEffect, useRef, useState } from 'react'
import './App.css'
import CloudyAvatar from './CloudyAvatar'

type Repository = { fullName: string; description: string; topics: string[]; language: string | null; defaultBranch: string; license: string; stars: number; openIssues: number; readme: string; assets: string[] }
type Scene = { id: number; title: string; duration: number; narration: string; visual: string }

const starterRepository = 'https://github.com/Cloud2BR-TEC/ai-academy-101-ml'
const projectKey = 'cloudy-video-project'

function wordsToSeconds(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean).length
  return Math.max(15, Math.round((words / 130) * 60))
}
function limitWords(text: string, maxWords: number) {
  return text.trim().split(/\s+/).slice(0, maxWords).join(' ')
}

const STARTER_NARRATIONS = [
  'Welcome. This repository is the starting point for your learning journey. Cloudy will walk you through the project overview, what you can expect to learn, and how this material connects to your goals.',
  'In this section Cloudy explains what problem this project solves, what skills and knowledge you will gain, and how the learning goals connect to real-world outcomes described in the documentation.',
  'Explore the project structure with Cloudy as your guide. We will tour the key folders, highlight practical exercises and code examples, and identify the resources that support your learning path.',
  'Now it is time to put things into practice. Follow the recommended sequence of steps, complete the hands-on exercises, and produce one concrete, shareable outcome that demonstrates what you have learned.',
  'Well done for making it this far. Cloudy recaps your learning path, points you toward the next relevant resource, and encourages you to keep building on what you have achieved today.',
]
const starterScenes: Scene[] = STARTER_NARRATIONS.map((narration, index) => ({
  id: index + 1,
  title: ['Welcome to the repository', 'What you will learn', 'Explore the project', 'Put it into practice', 'Keep learning'][index],
  duration: wordsToSeconds(narration),
  narration,
  visual: ['Repository cover and Cloudy host', 'README highlights and course map', 'Annotated repository tree', 'Workflow steps and source imagery', 'Next steps card'][index],
}))

function parseRepositoryUrl(value: string) {
  try {
    const url = new URL(value.trim())
    const segments = url.pathname.replace(/^\/+|\/+$/g, '').split('/')
    return url.hostname === 'github.com' && segments.length === 2 && segments[0] && segments[1] ? { owner: segments[0], repo: segments[1].replace(/\.git$/, '') } : null
  } catch { return null }
}

function durationLabel(seconds: number) { return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}` }
function timestamp(seconds: number) { return `00:${durationLabel(seconds)}.000` }
function decodeBase64(value: string) { return new TextDecoder().decode(Uint8Array.from(atob(value.replace(/\s/g, '')), (character) => character.charCodeAt(0))) }
function isIllustrativeImage(url: string) { return /\.(png|jpe?g|webp|gif)(\?.*)?$/i.test(url) && !/badge|shields\.io|badgen|coveralls|travis-ci|circleci|codecov/i.test(url) }
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
  return Array.from(urls).filter(isIllustrativeImage)
}
function parseReadmeSections(readme: string): Array<{ heading: string; body: string }> {
  const text = readme.replace(/```[\s\S]*?```/g, ' ').replace(/`[^`\n]+`/g, ' ')
  const lines = text.split('\n')
  const sections: Array<{ heading: string; body: string }> = []
  let heading = ''
  let bodyLines: string[] = []
  const flush = () => {
    const body = bodyLines
      .map(l => l.replace(/^[>\-*+]\s*/, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[*_#`|!\[\]()]/g, ' ').trim())
      .filter(l => l.length > 4 && !/^https?:\/\//i.test(l))
      .join(' ').replace(/\s+/g, ' ').trim()
    if (body.length > 15) sections.push({ heading, body })
    bodyLines = []
  }
  for (const line of lines) {
    const h = line.match(/^#{1,4}\s+(.+)/)
    if (h) { flush(); heading = h[1].replace(/[*_`#]/g, '').trim() } else { bodyLines.push(line) }
  }
  flush()
  return sections
}
function isSceneCollection(value: unknown): value is Scene[] {
  return Array.isArray(value) && value.length > 0 && value.every((scene) =>
    typeof scene === 'object' && scene !== null &&
    typeof scene.id === 'number' &&
    typeof scene.title === 'string' &&
    typeof scene.duration === 'number' &&
    typeof scene.narration === 'string' &&
    typeof scene.visual === 'string',
  )
}
function isRepository(value: unknown): value is Repository {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  return typeof record.fullName === 'string' &&
    typeof record.description === 'string' &&
    Array.isArray(record.topics) && record.topics.every((topic) => typeof topic === 'string') &&
    (typeof record.language === 'string' || record.language === null) &&
    typeof record.defaultBranch === 'string' &&
    typeof record.license === 'string' &&
    typeof record.stars === 'number' &&
    typeof record.openIssues === 'number' &&
    typeof record.readme === 'string' &&
    Array.isArray(record.assets) && record.assets.every((asset) => typeof asset === 'string')
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
function buildScenes(repo: Repository): Scene[] {
  const subject = repo.fullName.split('/')[1].replaceAll('-', ' ')
  const sections = parseReadmeSections(repo.readme)
  const find = (pattern: RegExp) =>
    sections.find(s => pattern.test(s.heading) && s.body.trim().split(/\s+/).length > 8)?.body ?? ''
  const fallback = (idx: number) => sections[idx]?.body ?? ''

  // Scene 1 – intro: description + first README body
  const introRaw = [
    repo.description ?? '',
    repo.language ? `Built with ${repo.language}.` : '',
    repo.topics.length ? `Topics: ${repo.topics.slice(0, 4).join(', ')}.` : '',
    fallback(0),
  ].filter(Boolean).join(' ')
  const intro = limitWords(introRaw, 130)

  // Scene 2 – what you'll learn: features / overview / about / highlights
  const featuresRaw = find(/features?|overview|about\b|what\s+(it|this|we|you)|highlights?|key\s+point|objective|goal|purpose/i)
    || fallback(1)
    || `This repository contains ${repo.language || 'source'} code${repo.topics.length ? ` focused on ${repo.topics.slice(0, 3).join(', ')}` : ''}.`
  const features = limitWords(featuresRaw, 220)

  // Scene 3 – explore: install / setup / structure / architecture
  const setupRaw = find(/install|setup|getting[\s-]started|structure|architecture|prerequisites?|requirements?|configur|depend/i)
    || fallback(2)
    || 'Follow the repository documentation and README to understand the project structure and set up the environment.'
  const structure = limitWords(setupRaw, 200)

  // Scene 4 – practice: usage / examples / api / demo / how-to
  const usageRaw = find(/usage|example|how[\s-]to|tutorial|guide|quickstart|api\b|demo|walkthrough/i)
    || fallback(3)
    || `Clone the repository, run the examples, and follow the workflow described in the documentation.`
  const practice = limitWords(usageRaw, 210)

  // Scene 5 – keep learning: contributing / next steps / resources / community
  const outroRaw = find(/contribut|resource|further|next[\s-]step|learn[\s-]more|reference|acknowledgment|credit|community|roadmap/i)
    || sections[sections.length - 1]?.body
    || `Continue learning by exploring open issues and related projects in the ${repo.topics[0] || 'project'} community.`
  const outro = limitWords(outroRaw, 140)

  return [
    { id: 1, title: `Meet ${subject}`, duration: wordsToSeconds(intro), narration: intro, visual: 'Repository cover and Cloudy host' },
    { id: 2, title: 'What you will learn', duration: wordsToSeconds(features), narration: features, visual: 'README highlights and course map' },
    { id: 3, title: 'Explore the project', duration: wordsToSeconds(structure), narration: structure, visual: repo.assets.length ? 'Repository images and guided source tour' : 'Annotated repository tree' },
    { id: 4, title: 'Put it into practice', duration: wordsToSeconds(practice), narration: practice, visual: 'Workflow steps and source imagery' },
    { id: 5, title: 'Keep learning', duration: wordsToSeconds(outro), narration: outro, visual: 'Next steps card' },
  ]
}
function drawCoverImage(context: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, width: number, height: number, zoom: number) {
  const scale = Math.max(width / image.width, height / image.height) * zoom
  const drawWidth = image.width * scale
  const drawHeight = image.height * scale
  context.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight)
}

function App() {
  const [repositoryUrl, setRepositoryUrl] = useState(starterRepository)
  const [repository, setRepository] = useState<Repository | null>(null)
  const [scenes, setScenes] = useState<Scene[]>(starterScenes)
  const [selectedSceneId, setSelectedSceneId] = useState(1)
  const [status, setStatus] = useState('Paste a public GitHub repository URL to create Cloudy’s explainer.')
  const [isLoading, setIsLoading] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [isRenderingVideo, setIsRenderingVideo] = useState(false)
  const [renderProgress, setRenderProgress] = useState(0)
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [previewImageIndex, setPreviewImageIndex] = useState(0)
  const renderAbortRef = useRef(false)
  const totalDuration = scenes.reduce((total, scene) => total + scene.duration, 0)
  const selectedScene = scenes.find((scene) => scene.id === selectedSceneId) ?? scenes[0]
  const selectedSceneIndex = scenes.findIndex((scene) => scene.id === selectedScene.id)
  const inTargetRange = totalDuration >= 480 && totalDuration <= 720
  const cloudyLogo = new URL('./assets/branding/cloudy-logo.png', import.meta.url).href
  const apiHeaders: Record<string, string> = { Accept: 'application/vnd.github+json' }
  const imgsPerScene = repository?.assets.length ? Math.max(1, Math.ceil(repository.assets.length / scenes.length)) : 1
  const sceneImages = repository?.assets.length ? repository.assets.slice(selectedSceneIndex * imgsPerScene, selectedSceneIndex * imgsPerScene + imgsPerScene) : []
  const previewAsset = sceneImages.length ? sceneImages[previewImageIndex % sceneImages.length] : null

  useEffect(() => {
    try {
      const savedProject = window.localStorage.getItem(projectKey)
      if (!savedProject) return
      const project = JSON.parse(savedProject) as unknown
      if (typeof project !== 'object' || project === null) throw new Error('Invalid saved project')
      const saved = project as { repositoryUrl?: unknown; repository?: unknown; scenes?: unknown }
      if (typeof saved.repositoryUrl === 'string') setRepositoryUrl(saved.repositoryUrl)
      if (isRepository(saved.repository)) setRepository(saved.repository)
      const savedScenes = saved.scenes
      if (isSceneCollection(savedScenes)) {
        setScenes(savedScenes)
        setIsSaved(true)
      }
    } catch { window.localStorage.removeItem(projectKey) }
  }, [])

  useEffect(() => {
    if (!isPreviewPlaying) return
    const interval = window.setInterval(() => {
      setSelectedSceneId((currentId) => {
        const currentIndex = scenes.findIndex((scene) => scene.id === currentId)
        return scenes[(currentIndex + 1) % scenes.length].id
      })
    }, 6_000)
    return () => window.clearInterval(interval)
  }, [isPreviewPlaying, scenes])

  useEffect(() => { setPreviewImageIndex(0) }, [selectedSceneId])

  useEffect(() => {
    if (sceneImages.length < 2) return
    const interval = window.setInterval(() => {
      setPreviewImageIndex((current) => (current + 1) % sceneImages.length)
    }, 2_200)
    return () => window.clearInterval(interval)
  }, [sceneImages.length, selectedSceneId])

  async function loadRepository(value: string) {
    const parsed = parseRepositoryUrl(value)
    if (!parsed) { setStatus('Use a canonical URL such as https://github.com/owner/repository.'); return }
    setIsLoading(true)
    setStatus('Reviewing the repository README, folders, and images...')
    try {
      const [repositoryResponse, readmeResponse, contentsResponse] = await Promise.all([
        fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}`, { headers: apiHeaders }),
        fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}/readme`, { headers: apiHeaders }),
        fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}/contents`, { headers: apiHeaders }),
      ])
      if (!repositoryResponse.ok) throw new Error('Repository unavailable')
      const data = await repositoryResponse.json() as { full_name: string; description: string | null; topics: string[]; language: string | null; default_branch: string; license: { spdx_id: string } | null; stargazers_count: number; open_issues_count: number }
      const readmeData = readmeResponse.ok ? await readmeResponse.json() as { content?: string } : null
      const readmeText = readmeData?.content ? decodeBase64(readmeData.content) : ''
      const sourceFiles = contentsResponse.ok ? await contentsResponse.json() as Array<{ name: string; type: string; download_url: string | null }> : []
      const readmeImages = readmeText ? extractReadmeImageUrls(readmeText, parsed.owner, parsed.repo, data.default_branch) : []
      const rootImages = sourceFiles.filter((file) => file.type === 'file' && file.download_url && isIllustrativeImage(file.name)).map((file) => file.download_url as string)
      const assetFolders = sourceFiles.filter((file) => file.type === 'dir' && /^(assets|images|img|media|docs|screenshots|figures|resources|\.github)$/i.test(file.name)).slice(0, 4)
      const folderListings = await Promise.all(assetFolders.map((folder) =>
        fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}/contents/${folder.name}`, { headers: apiHeaders })
          .then((response) => response.ok ? response.json() as Promise<Array<{ type: string; name: string; download_url: string | null; path: string }>> : [])
          .catch(() => [])
      ))
      const folderImages = folderListings.flat()
        .filter((file) => file.type === 'file' && file.download_url && isIllustrativeImage(file.name))
        .map((file) => file.download_url as string)
      const assets = Array.from(new Set([...readmeImages, ...folderImages, ...rootImages])).slice(0, 12)
      const newRepo: Repository = { fullName: data.full_name, description: data.description ?? 'No repository description was provided.', topics: data.topics ?? [], language: data.language, defaultBranch: data.default_branch, license: data.license?.spdx_id ?? 'No license detected', stars: data.stargazers_count, openIssues: data.open_issues_count, readme: readmeText, assets }
      setRepositoryUrl(`https://github.com/${data.full_name}`)
      setRepository(newRepo)
      setScenes(buildScenes(newRepo))
      const imageNote = assets.length ? `Found ${assets.length} image${assets.length === 1 ? '' : 's'} from the repository.` : 'No images found — Cloudy will present with a branded placeholder.'
      setStatus(`Storyboard ready. ${imageNote}`)
      setIsSaved(false)
    } catch { setRepository(null); setStatus('The repository could not be read. Check repository access and try again.') }
    finally { setIsLoading(false) }
  }

  function generateStoryboard() {
    if (!repository) return
    setScenes(buildScenes(repository))
    setIsSaved(false)
    setStatus('Storyboard refreshed from repository content.')
  }
  function updateScene(field: 'title' | 'narration', value: string) {
    setScenes((current) => current.map((scene) => {
      if (scene.id !== selectedScene.id) return scene
      const updated = { ...scene, [field]: value }
      if (field === 'narration') updated.duration = wordsToSeconds(value)
      return updated
    }))
    setIsSaved(false)
  }
  function saveProject() { window.localStorage.setItem(projectKey, JSON.stringify({ repositoryUrl, repository, scenes })); setIsSaved(true); setStatus('Project saved only in this browser.') }
  function exportProject() { downloadFile('cloudy-video-project.json', JSON.stringify({ repositoryUrl, repository, scenes }, null, 2), 'application/json'); setStatus('Project JSON downloaded.') }
  function exportCaptions() { let cursor = 0; const content = scenes.map((scene, index) => { const start = timestamp(cursor); cursor += scene.duration; return `${index + 1}\n${start} --> ${timestamp(cursor)}\n${scene.narration}` }).join('\n\n'); downloadFile('cloudy-captions.srt', content, 'application/x-subrip'); setStatus('Editable SRT captions downloaded.') }
  async function exportVideo() {
    if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) {
      setStatus('This browser cannot create a video file. Use a current Chromium browser.')
      return
    }
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm'
    const canvas = document.createElement('canvas')
    canvas.width = 1920
    canvas.height = 1080
    const context = canvas.getContext('2d')
    if (!context) return
    setStatus('Loading repository visuals for your video...')
    const cloudyImage = await loadImage(cloudyLogo).catch(() => null)
    const assetImages = repository?.assets.length ? await Promise.all(repository.assets.map((asset) => loadImage(asset).catch(() => null))) : []
    const stream = canvas.captureStream(30)
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 6_000_000 })
    const chunks: BlobPart[] = []
    recorder.addEventListener('dataavailable', (event) => { if (event.data.size) chunks.push(event.data) })
    const videoReady = new Promise<Blob>((resolve) => recorder.addEventListener('stop', () => resolve(new Blob(chunks, { type: 'video/webm' })), { once: true }))
    const totalSeconds = scenes.reduce((total, scene) => total + scene.duration, 0)
    const startedAt = performance.now()
    renderAbortRef.current = false
    setIsRenderingVideo(true)
    setRenderProgress(0)
    setStatus('Rendering your video in this browser. Keep this tab open.')
    recorder.start(1_000)

    const drawFrame = (elapsedSeconds: number) => {
      let sceneOffset = 0
      let sceneIndex = scenes.length - 1
      const scene = scenes.find((item, index) => {
        sceneOffset += item.duration
        if (elapsedSeconds < sceneOffset) { sceneIndex = index; return true }
        return false
      }) ?? scenes[scenes.length - 1]
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

      const sceneImage = assetImages.length ? assetImages[sceneIndex % assetImages.length] : null
      if (sceneImage) {
        context.save()
        context.globalAlpha = 0.5 + eased * 0.18
        drawCoverImage(context, sceneImage, 0, 0, canvas.width, canvas.height, 1 + sceneProgress * 0.08)
        context.restore()
        const overlay = context.createLinearGradient(0, 0, 0, canvas.height)
        overlay.addColorStop(0, 'rgba(10, 31, 29, .74)')
        overlay.addColorStop(0.5, 'rgba(10, 31, 29, .3)')
        overlay.addColorStop(1, 'rgba(10, 31, 29, .84)')
        context.fillStyle = overlay
        context.fillRect(0, 0, canvas.width, canvas.height)
      }

      context.fillStyle = `rgba(255, 255, 255, ${0.04 + pulse * 0.05})`
      for (let column = -240; column < canvas.width + 240; column += 120) context.fillRect(column + sceneElapsed * 18, 0, 2, canvas.height)

      context.fillStyle = '#f5f7f3'
      context.font = '700 32px Manrope, sans-serif'
      context.fillText('CLOUDY REPOSITORY VIDEO STUDIO', 112, 110)
      context.fillStyle = '#f5a975'
      context.font = '700 26px Manrope, sans-serif'
      context.fillText(`SCENE ${String(scene.id).padStart(2, '0')} OF ${scenes.length}  /  ${durationLabel(scene.duration)}`, 112, 166)
      scenes.forEach((_, index) => {
        context.fillStyle = index === sceneIndex ? '#f5a975' : 'rgba(255, 255, 255, .35)'
        context.beginPath()
        context.arc(112 + index * 26, 196, index === sceneIndex ? 7 : 5, 0, Math.PI * 2)
        context.fill()
      })

      context.save()
      context.globalAlpha = eased
      context.translate((1 - eased) * -70, 0)
      context.fillStyle = '#ffffff'
      context.font = '800 94px Manrope, sans-serif'
      const titleLines = wrapCanvasText(context, scene.title, 1_270)
      titleLines.slice(0, 3).forEach((line, index) => context.fillText(line, 112, 322 + index * 112))
      context.restore()

      context.fillStyle = '#d9ebe2'
      context.font = '500 38px Manrope, sans-serif'
      wrapCanvasText(context, scene.visual, 1_080).slice(0, 2).forEach((line, index) => context.fillText(line, 112, 690 + index * 50))

      if (repository?.topics.length) {
        let chipX = 112
        context.font = '700 22px Manrope, sans-serif'
        repository.topics.slice(0, 4).forEach((topic) => {
          const chipWidth = context.measureText(topic).width + 36
          context.fillStyle = 'rgba(255, 255, 255, .16)'
          context.fillRect(chipX, 748, chipWidth, 42)
          context.fillStyle = '#f5f7f3'
          context.fillText(topic, chipX + 18, 776)
          chipX += chipWidth + 12
        })
      }

      context.fillStyle = 'rgba(10, 31, 29, .76)'
      context.fillRect(88, 808, 1_744, 190)
      context.fillStyle = '#ffffff'
      context.font = '500 34px Manrope, sans-serif'
      wrapCanvasText(context, scene.narration, 1_590).slice(0, 3).forEach((line, index) => context.fillText(line, 132, 872 + index * 44))

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
        recorder.stop()
        return
      }
      window.requestAnimationFrame(renderFrame)
    }

    window.requestAnimationFrame(renderFrame)
    const video = await videoReady
    stream.getTracks().forEach((track) => track.stop())
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
    setStatus('WebM video downloaded. Captions are embedded on screen.')
  }
  function cancelVideoExport() { renderAbortRef.current = true; setStatus('Stopping video render...') }

  function pickFemaleVoice() {
    const voices = window.speechSynthesis.getVoices()
    const femaleNames = /zira|samantha|victoria|ava|aria|hazel|susan|karen|moira|tessa|fiona|allison|erin|eva|vicki|joanna|ivy|kendra|kimberly|salli|nicole|naja|marlene|mathilde/i
    const female = voices.find((voice) => femaleNames.test(voice.name) && voice.lang.startsWith('en'))
      ?? voices.find((voice) => /female/i.test(voice.name))
      ?? voices.find((voice) => voice.lang.startsWith('en-') && !/david|mark|james|alex|daniel|rishi|george|ryan/i.test(voice.name))
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

  async function previewVoice() {
    window.speechSynthesis.cancel()
    const femaleVoice = await resolveVoice()
    const utterance = new SpeechSynthesisUtterance(selectedScene.narration)
    utterance.voice = femaleVoice
    utterance.lang = femaleVoice?.lang ?? 'en-US'
    utterance.rate = 0.95
    utterance.pitch = 1.1
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)
    setIsSpeaking(true)
    setStatus(femaleVoice ? `Cloudy is speaking with ${femaleVoice.name}.` : 'No female voice found. Using browser default.')
  }

  return <main className="app-shell">
    <header className="topbar"><a className="brand" href="https://github.com/Cloud2BR-TEC/Cloudy-overview-videos" target="_blank" rel="noreferrer"><img src={cloudyLogo} alt="Cloudy" /><span><strong>Cloudy</strong><small>Repository Video Studio</small></span></a><div className="project-state"><span className={isSaved ? 'saved-dot' : 'unsaved-dot'}></span>{isSaved ? 'Saved locally' : 'Unsaved changes'}</div><button className="secondary-button" type="button" onClick={exportProject}>Download project setup</button><button className="primary-button" type="button" onClick={saveProject}>Save project</button></header>
    <section className="workspace"><aside className="rail" aria-label="Project workflow"><div className="rail-item active"><span>01</span><strong>Source</strong></div><div className="rail-item"><span>02</span><strong>Story</strong></div><div className="rail-item"><span>03</span><strong>Voice</strong></div><div className="rail-item"><span>04</span><strong>Export</strong></div></aside><section className="content-column">
      <div className="section-heading"><div><p className="eyebrow">Cloudy overview video</p><h1>Choose the repository Cloudy will explain.</h1></div><p className="status" aria-live="polite">{status}</p></div>
      <section className="repository-form"><p className="eyebrow">Public repository</p><label htmlFor="repository-url">GitHub repository URL</label><div className="url-entry"><input id="repository-url" type="url" value={repositoryUrl} onChange={(event) => setRepositoryUrl(event.target.value)} placeholder="https://github.com/owner/repository" /><button className="primary-button" type="button" onClick={() => void loadRepository(repositoryUrl)} disabled={isLoading}>{isLoading ? 'Reading...' : 'Generate explainer'}</button></div><p>Cloudy reads public repository details only. Private repositories are not available in this browser-only version.</p></section>
      {repository && <section className="repository-card" aria-label="Repository source"><div className="repository-title"><div><p className="eyebrow">Source evidence</p><h2>{repository.fullName}</h2><p>{repository.description}</p></div></div><div className="metadata-grid"><span><small>Default branch</small>{repository.defaultBranch}</span><span><small>Primary language</small>{repository.language ?? 'Not detected'}</span><span><small>License</small>{repository.license}</span><span><small>Signals</small>{repository.stars} stars · {repository.openIssues} issues</span></div>{repository.assets.length > 0 && <div className="asset-strip">{repository.assets.map((asset) => <img key={asset} src={asset} alt="Repository source asset" />)}</div>}{repository.topics.length > 0 && <div className="tags">{repository.topics.slice(0, 6).map((topic) => <span key={topic}>{topic}</span>)}</div>}</section>}
      {repository ? <section className="story-area"><div className="story-head"><div><p className="eyebrow">Storyboard</p><h2>Cloudy’s explainer</h2></div><div className={`duration-pill ${inTargetRange ? 'ready' : ''}`}>{durationLabel(totalDuration)} <small>{inTargetRange ? 'Within 8-12 minute target' : 'Target: 8-12 min'}</small></div></div><div className="story-grid"><ol className="scene-list">{scenes.map((scene) => <li key={scene.id}><button type="button" className={scene.id === selectedScene.id ? 'scene selected' : 'scene'} onClick={() => { setIsPreviewPlaying(false); setSelectedSceneId(scene.id) }}><span className="scene-number">{String(scene.id).padStart(2, '0')}</span><span><strong>{scene.title}</strong><small>{scene.visual}</small></span><time>{durationLabel(scene.duration)}</time></button></li>)}</ol><article className="scene-editor"><div className="preview-stage"><div className={`preview-visual ${isPreviewPlaying ? 'is-playing' : ''} ${previewAsset ? 'has-asset' : 'no-asset'}`}>{previewAsset ? <><img className="source-visual" src={previewAsset} alt="Repository image illustrating this scene" /><span className={`cloudy-avatar ${isSpeaking ? 'speaking' : ''}`}><CloudyAvatar speaking={isSpeaking} size={78} /></span></> : <div className={`cloudy-hero-wrap ${isSpeaking ? 'speaking' : ''}`}><CloudyAvatar speaking={isSpeaking} size={118} /></div>}{isSpeaking && <span className="talk-badge"><span className="talk-bars"><span></span><span></span><span></span></span>Cloudy is speaking</span>}<div className="preview-overlay"><span>{sceneImages.length > 1 ? `Image ${previewImageIndex + 1} of ${sceneImages.length} for this section` : previewAsset ? 'From the repository' : 'No matching repository image'}</span><strong>{selectedScene.title}</strong><p>{selectedScene.narration}</p></div><span className="spark one"></span><span className="spark two"></span></div><div className="scene-caption"><span>Scene {selectedScene.id}</span><strong>{selectedScene.visual}</strong></div></div><div className="preview-controls"><button className="secondary-button" type="button" onClick={() => setIsPreviewPlaying((playing) => !playing)}>{isPreviewPlaying ? 'Pause generated preview' : 'Play generated preview'}</button><span>{isPreviewPlaying ? 'Cloudy is moving through the storyboard.' : 'Play to preview Cloudy and the selected repository visuals.'}</span></div><div className="editor-fields"><label>Scene title<input value={selectedScene.title} onChange={(event) => updateScene('title', event.target.value)} /></label><label>Cloudy narration<textarea rows={4} value={selectedScene.narration} onChange={(event) => updateScene('narration', event.target.value)} /></label><div className="duration-info"><span className="duration-info-label">Read time at 1× speed</span><span className="duration-info-value">{durationLabel(selectedScene.duration)}<small> ({selectedScene.narration.trim().split(/\s+/).filter(Boolean).length} words · {selectedScene.duration}s)</small></span></div><button className="secondary-button voice-button" type="button" onClick={() => void previewVoice()}>Preview female voice</button></div></article></div></section> : <section className="story-placeholder"><p className="eyebrow">Storyboard</p><h2>Generate an explainer to begin</h2><p>Paste a public GitHub repository URL above and select <strong>Generate explainer</strong>. Cloudy will read the repository and build a live, editable storyboard here.</p></section>}
    </section>{repository ? <aside className="review-panel"><div><p className="eyebrow">Ready to export</p><h2>Local package</h2></div><ul className="checklist"><li className="done">Repository source captured</li><li className={inTargetRange ? 'done' : ''}>8-12 minute runtime</li><li className="done">Editable Cloudy narration</li><li className={repository.assets.length ? 'done' : ''}>Source visuals selected</li><li className="done">Captions ready to export</li></ul><div className="export-actions">{isRenderingVideo ? <button className="primary-button" type="button" onClick={cancelVideoExport}>Cancel video render {renderProgress}%</button> : <button className="primary-button" type="button" onClick={() => void exportVideo()}>Download video</button>}<button className="secondary-button" type="button" onClick={exportCaptions}>Download captions</button><button className="secondary-button" type="button" onClick={exportProject}>Download project setup</button></div></aside> : <aside className="review-panel placeholder"><div><p className="eyebrow">Ready to export</p><h2>Nothing to export yet</h2><p>Generate an explainer first. Export options for video, captions, and the project file appear once Cloudy has read a repository.</p></div></aside>}</section>
  </main>
}

export default App