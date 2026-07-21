import { useEffect, useRef, useState } from 'react'
import './App.css'

type Repository = { fullName: string; description: string; topics: string[]; language: string | null; defaultBranch: string; license: string; stars: number; openIssues: number; readme: string; assets: string[] }
type Scene = { id: number; title: string; duration: number; narration: string; visual: string }

const starterRepository = 'https://github.com/Cloud2BR-TEC/ai-academy-101-ml'
const projectKey = 'cloudy-video-project'
const starterScenes: Scene[] = [
  { id: 1, title: 'Welcome to the repository', duration: 52, narration: 'Cloudy introduces the project, the intended learner, and the outcome.', visual: 'Repository cover and Cloudy host' },
  { id: 2, title: 'What you will learn', duration: 138, narration: 'Explain the problem space and walk through the learning goals found in the documentation.', visual: 'README highlights and course map' },
  { id: 3, title: 'Explore the project', duration: 186, narration: 'Tour the important folders, practical exercises, and supporting resources.', visual: 'Annotated repository tree' },
  { id: 4, title: 'Put it into practice', duration: 168, narration: 'Show the recommended learning sequence and one concrete outcome for the viewer.', visual: 'Workflow steps and source imagery' },
  { id: 5, title: 'Keep learning', duration: 70, narration: 'Cloudy recaps the path and points viewers to the next relevant resource.', visual: 'Next steps card' },
]

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
  const renderAbortRef = useRef(false)
  const totalDuration = scenes.reduce((total, scene) => total + scene.duration, 0)
  const selectedScene = scenes.find((scene) => scene.id === selectedSceneId) ?? scenes[0]
  const inTargetRange = totalDuration >= 480 && totalDuration <= 720
  const cloudyLogo = new URL('./assets/branding/cloudy-logo.png', import.meta.url).href
  const apiHeaders: Record<string, string> = { Accept: 'application/vnd.github+json' }

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

  async function loadRepository(value: string) {
    const parsed = parseRepositoryUrl(value)
    if (!parsed) { setStatus('Use a canonical URL such as https://github.com/owner/repository.'); return }
    setIsLoading(true)
    setStatus('Reading repository source and approved visual assets...')
    try {
      const [repositoryResponse, readmeResponse, contentsResponse] = await Promise.all([
        fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}`, { headers: apiHeaders }),
        fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}/readme`, { headers: apiHeaders }),
        fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}/contents`, { headers: apiHeaders }),
      ])
      if (!repositoryResponse.ok) throw new Error('Repository unavailable')
      const data = await repositoryResponse.json() as { full_name: string; description: string | null; topics: string[]; language: string | null; default_branch: string; license: { spdx_id: string } | null; stargazers_count: number; open_issues_count: number }
      const readmeData = readmeResponse.ok ? await readmeResponse.json() as { content?: string } : null
      const sourceFiles = contentsResponse.ok ? await contentsResponse.json() as Array<{ name: string; type: string; download_url: string | null }> : []
      const assets = sourceFiles.filter((file) => file.type === 'file' && /\.(png|jpe?g|webp|gif)$/i.test(file.name) && file.download_url).slice(0, 6).map((file) => file.download_url as string)
      setRepositoryUrl(`https://github.com/${data.full_name}`)
      setRepository({ fullName: data.full_name, description: data.description ?? 'No repository description was provided.', topics: data.topics ?? [], language: data.language, defaultBranch: data.default_branch, license: data.license?.spdx_id ?? 'No license detected', stars: data.stargazers_count, openIssues: data.open_issues_count, readme: readmeData?.content ? decodeBase64(readmeData.content) : '', assets })
      setStatus('Source evidence is ready. Refresh Cloudy’s draft when you are ready.')
      setIsSaved(false)
    } catch { setRepository(null); setStatus('The repository could not be read. Check repository access and try again.') }
    finally { setIsLoading(false) }
  }

  function generateStoryboard() {
    if (!repository) { setStatus('Choose a repository before refreshing the storyboard.'); return }
    const subject = repository.fullName.split('/')[1].replaceAll('-', ' ')
    const summary = repository.readme.replace(/[#*_`>|]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 240)
    setScenes((current) => current.map((scene, index) => ({ ...scene, title: index === 0 ? `Meet ${subject}` : scene.title, narration: index === 1 ? `${repository.description} ${summary || 'Cloudy connects these goals to the viewer’s next practical step.'}` : scene.narration, visual: index === 2 && repository.assets.length ? 'Repository image and guided source tour' : scene.visual })))
    setIsSaved(false)
    setStatus('Cloudy’s local draft has been refreshed from repository evidence.')
  }
  function updateScene(field: 'title' | 'narration' | 'duration', value: string) { setScenes((current) => current.map((scene) => scene.id === selectedScene.id ? { ...scene, [field]: field === 'duration' ? Math.max(15, Number(value) || 15) : value } : scene)); setIsSaved(false) }
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
    setStatus('Rendering your YouTube video in this browser. Keep this tab open.')
    recorder.start(1_000)

    const drawFrame = (elapsedSeconds: number) => {
      let sceneOffset = 0
      const scene = scenes.find((item) => {
        sceneOffset += item.duration
        return elapsedSeconds < sceneOffset
      }) ?? scenes[scenes.length - 1]
      const sceneElapsed = elapsedSeconds - (sceneOffset - scene.duration)
      const pulse = 0.5 + Math.sin(sceneElapsed * 1.2) * 0.5
      const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height)
      gradient.addColorStop(0, '#123b39')
      gradient.addColorStop(0.55, '#1d5b51')
      gradient.addColorStop(1, '#d76639')
      context.fillStyle = gradient
      context.fillRect(0, 0, canvas.width, canvas.height)
      context.fillStyle = `rgba(255, 255, 255, ${0.04 + pulse * 0.05})`
      for (let column = -240; column < canvas.width + 240; column += 120) context.fillRect(column + sceneElapsed * 18, 0, 2, canvas.height)
      context.fillStyle = '#f5f7f3'
      context.font = '700 32px Manrope, sans-serif'
      context.fillText('CLOUDY REPOSITORY VIDEO STUDIO', 112, 110)
      context.fillStyle = '#f5a975'
      context.font = '700 26px Manrope, sans-serif'
      context.fillText(`SCENE ${String(scene.id).padStart(2, '0')}  /  ${durationLabel(scene.duration)}`, 112, 166)
      context.fillStyle = '#ffffff'
      context.font = '800 94px Manrope, sans-serif'
      const titleLines = wrapCanvasText(context, scene.title, 1_270)
      titleLines.slice(0, 3).forEach((line, index) => context.fillText(line, 112, 322 + index * 112))
      context.fillStyle = '#d9ebe2'
      context.font = '500 38px Manrope, sans-serif'
      wrapCanvasText(context, scene.visual, 1_080).slice(0, 2).forEach((line, index) => context.fillText(line, 112, 690 + index * 50))
      context.fillStyle = 'rgba(10, 31, 29, .76)'
      context.fillRect(88, 808, 1_744, 190)
      context.fillStyle = '#ffffff'
      context.font = '500 34px Manrope, sans-serif'
      wrapCanvasText(context, scene.narration, 1_590).slice(0, 3).forEach((line, index) => context.fillText(line, 132, 872 + index * 44))
      context.fillStyle = '#f5a975'
      context.beginPath()
      context.arc(1_725, 182, 56 + pulse * 6, 0, Math.PI * 2)
      context.fill()
      context.fillStyle = '#173d3a'
      context.font = '800 26px Manrope, sans-serif'
      context.fillText('C', 1_716, 191)
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
    link.download = 'cloudy-youtube-video.webm'
    link.click()
    URL.revokeObjectURL(url)
    setStatus('YouTube-ready WebM video downloaded. Captions are embedded on screen.')
  }
  function cancelVideoExport() { renderAbortRef.current = true; setStatus('Stopping video render...') }
  function previewVoice() {
    const voices = window.speechSynthesis.getVoices()
    const femaleVoice = voices.find((voice) => /zira|samantha|victoria|ava|aria|female|hazel|susan/i.test(voice.name)) ?? voices.find((voice) => voice.lang.startsWith('en'))
    const utterance = new SpeechSynthesisUtterance(selectedScene.narration)
    utterance.voice = femaleVoice ?? null
    utterance.lang = femaleVoice?.lang ?? 'en-US'
    utterance.rate = 0.96
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)
    setStatus(femaleVoice ? `Previewing Cloudy with ${femaleVoice.name}.` : 'Previewing Cloudy with your browser’s available English voice.')
  }

  return <main className="app-shell">
    <header className="topbar"><a className="brand" href="https://github.com/Cloud2BR-TEC/Cloudy-overview-videos" target="_blank" rel="noreferrer"><img src={cloudyLogo} alt="Cloudy" /><span><strong>Cloudy</strong><small>Repository Video Studio</small></span></a><div className="project-state"><span className={isSaved ? 'saved-dot' : 'unsaved-dot'}></span>{isSaved ? 'Saved locally' : 'Unsaved changes'}</div><button className="secondary-button" type="button" onClick={exportProject}>Download project setup</button><button className="primary-button" type="button" onClick={saveProject}>Save project</button></header>
    <section className="workspace"><aside className="rail" aria-label="Project workflow"><div className="rail-item active"><span>01</span><strong>Source</strong></div><div className="rail-item"><span>02</span><strong>Story</strong></div><div className="rail-item"><span>03</span><strong>Voice</strong></div><div className="rail-item"><span>04</span><strong>Export</strong></div></aside><section className="content-column">
      <div className="section-heading"><div><p className="eyebrow">Cloudy overview video</p><h1>Choose the repository Cloudy will explain.</h1></div><p className="status" aria-live="polite">{status}</p></div>
      <section className="repository-form"><p className="eyebrow">Public repository</p><label htmlFor="repository-url">GitHub repository URL</label><div className="url-entry"><input id="repository-url" type="url" value={repositoryUrl} onChange={(event) => setRepositoryUrl(event.target.value)} placeholder="https://github.com/owner/repository" /><button className="primary-button" type="button" onClick={() => void loadRepository(repositoryUrl)} disabled={isLoading}>{isLoading ? 'Reading...' : 'Generate explainer'}</button></div><p>Cloudy reads public repository details only. Private repositories are not available in this browser-only version.</p></section>
      {repository && <section className="repository-card" aria-label="Repository source"><div className="repository-title"><div><p className="eyebrow">Source evidence</p><h2>{repository.fullName}</h2><p>{repository.description}</p></div><button className="text-button" type="button" onClick={generateStoryboard}>Refresh Cloudy draft</button></div><div className="metadata-grid"><span><small>Default branch</small>{repository.defaultBranch}</span><span><small>Primary language</small>{repository.language ?? 'Not detected'}</span><span><small>License</small>{repository.license}</span><span><small>Signals</small>{repository.stars} stars · {repository.openIssues} issues</span></div>{repository.assets.length > 0 && <div className="asset-strip">{repository.assets.map((asset) => <img key={asset} src={asset} alt="Repository source asset" />)}</div>}{repository.topics.length > 0 && <div className="tags">{repository.topics.slice(0, 6).map((topic) => <span key={topic}>{topic}</span>)}</div>}</section>}
      <section className="story-area"><div className="story-head"><div><p className="eyebrow">Storyboard</p><h2>Cloudy’s explainer</h2></div><div className={`duration-pill ${inTargetRange ? 'ready' : ''}`}>{durationLabel(totalDuration)} <small>{inTargetRange ? 'Within 8-12 minute target' : 'Target: 8-12 min'}</small></div></div><div className="story-grid"><ol className="scene-list">{scenes.map((scene) => <li key={scene.id}><button type="button" className={scene.id === selectedScene.id ? 'scene selected' : 'scene'} onClick={() => setSelectedSceneId(scene.id)}><span className="scene-number">{String(scene.id).padStart(2, '0')}</span><span><strong>{scene.title}</strong><small>{scene.visual}</small></span><time>{durationLabel(scene.duration)}</time></button></li>)}</ol><article className="scene-editor"><div className="preview-stage"><div className="preview-visual">{repository?.assets[0] ? <img className="source-visual" src={repository.assets[0]} alt="Selected repository source visual" /> : <img src={cloudyLogo} alt="Cloudy presents the selected scene" />}<span className="cloudy-avatar"><img src={cloudyLogo} alt="" /></span><span className="spark one"></span><span className="spark two"></span></div><div className="scene-caption"><span>Scene {selectedScene.id}</span><strong>{selectedScene.visual}</strong></div></div><div className="editor-fields"><label>Scene title<input value={selectedScene.title} onChange={(event) => updateScene('title', event.target.value)} /></label><label>Cloudy narration<textarea rows={4} value={selectedScene.narration} onChange={(event) => updateScene('narration', event.target.value)} /></label><label>Scene duration <span className="field-suffix">seconds</span><input type="number" min="15" value={selectedScene.duration} onChange={(event) => updateScene('duration', event.target.value)} /></label><button className="secondary-button voice-button" type="button" onClick={previewVoice}>Preview female voice</button></div></article></div></section>
    </section><aside className="review-panel"><div><p className="eyebrow">Ready to export</p><h2>Local package</h2></div><ul className="checklist"><li className={repository ? 'done' : ''}>Repository source captured</li><li className={inTargetRange ? 'done' : ''}>8-12 minute runtime</li><li className="done">Editable Cloudy narration</li><li className={repository?.assets.length ? 'done' : ''}>Source visuals selected</li><li className="done">Captions ready to export</li></ul><div className="export-actions">{isRenderingVideo ? <button className="primary-button" type="button" onClick={cancelVideoExport}>Cancel video render {renderProgress}%</button> : <button className="primary-button" type="button" onClick={() => void exportVideo()}>Download YouTube video</button>}<button className="secondary-button" type="button" onClick={exportCaptions}>Download captions</button><button className="secondary-button" type="button" onClick={exportProject}>Download project setup</button></div></aside></section>
  </main>
}

export default App