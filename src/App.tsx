import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'

type Repository = {
  fullName: string
  description: string
  topics: string[]
  language: string | null
  defaultBranch: string
  license: string
  stars: number
  openIssues: number
}

type Scene = {
  id: number
  title: string
  duration: number
  narration: string
  visual: string
}

const starterRepository = 'https://github.com/Cloud2BR-TEC/ai-academy-101-ml'

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
    if (url.hostname !== 'github.com' || segments.length !== 2 || !segments[0] || !segments[1]) return null
    return { owner: segments[0], repo: segments[1].replace(/\.git$/, '') }
  } catch {
    return null
  }
}

function durationLabel(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

function App() {
  const [repositoryUrl, setRepositoryUrl] = useState(starterRepository)
  const [repository, setRepository] = useState<Repository | null>(null)
  const [scenes, setScenes] = useState<Scene[]>(starterScenes)
  const [selectedSceneId, setSelectedSceneId] = useState(1)
  const [status, setStatus] = useState('Paste a public GitHub repository to begin.')
  const [isLoading, setIsLoading] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const totalDuration = scenes.reduce((total, scene) => total + scene.duration, 0)
  const selectedScene = scenes.find((scene) => scene.id === selectedSceneId) ?? scenes[0]
  const inTargetRange = totalDuration >= 8 * 60 && totalDuration <= 12 * 60
  const cloudyLogo = new URL('../logo-cloud2br-tec.png', import.meta.url).href

  useEffect(() => {
    const savedProject = window.localStorage.getItem('cloudy-video-project')
    if (!savedProject) return
    try {
      const project = JSON.parse(savedProject) as { repositoryUrl?: string; scenes?: Scene[] }
      if (project.repositoryUrl) setRepositoryUrl(project.repositoryUrl)
      if (project.scenes?.length) setScenes(project.scenes)
      setStatus('Restored your locally saved storyboard.')
      setIsSaved(true)
    } catch {
      window.localStorage.removeItem('cloudy-video-project')
    }
  }, [])

  async function analyzeRepository(event: FormEvent) {
    event.preventDefault()
    const parsed = parseRepositoryUrl(repositoryUrl)
    if (!parsed) {
      setStatus('Use a canonical GitHub repository URL, such as https://github.com/owner/repository.')
      return
    }
    setIsLoading(true)
    setStatus('Reading public repository metadata...')
    setIsSaved(false)
    try {
      const response = await fetch(`https://api.github.com/repos/${parsed.owner}/${parsed.repo}`, { headers: { Accept: 'application/vnd.github+json' } })
      if (!response.ok) throw new Error('Repository unavailable')
      const data = await response.json() as {
        full_name: string; description: string | null; topics: string[]; language: string | null
        default_branch: string; license: { spdx_id: string } | null; stargazers_count: number; open_issues_count: number
      }
      setRepository({ fullName: data.full_name, description: data.description ?? 'No repository description was provided.', topics: data.topics ?? [], language: data.language, defaultBranch: data.default_branch, license: data.license?.spdx_id ?? 'No license detected', stars: data.stargazers_count, openIssues: data.open_issues_count })
      setStatus('Repository snapshot ready. Review the evidence, then shape Cloudy’s story.')
    } catch {
      setRepository(null)
      setStatus('The public repository could not be read. Check the URL and try again.')
    } finally {
      setIsLoading(false)
    }
  }

  function generateStoryboard() {
    if (!repository) {
      setStatus('Analyze a public repository before generating a storyboard.')
      return
    }
    const subject = repository.fullName.split('/')[1].replaceAll('-', ' ')
    setScenes((currentScenes) => currentScenes.map((scene, index) => ({ ...scene, title: index === 0 ? `Meet ${subject}` : scene.title, narration: index === 1 ? `${repository.description} Cloudy connects these goals to the viewer’s next practical step.` : scene.narration })))
    setStatus('Draft refreshed from repository metadata. All narration remains editable.')
    setIsSaved(false)
  }

  function updateScene(field: 'title' | 'narration' | 'duration', value: string) {
    setScenes((currentScenes) => currentScenes.map((scene) => scene.id === selectedScene.id ? { ...scene, [field]: field === 'duration' ? Math.max(15, Number(value) || 15) : value } : scene))
    setIsSaved(false)
  }

  function saveProject() {
    window.localStorage.setItem('cloudy-video-project', JSON.stringify({ repositoryUrl, repository, scenes }))
    setStatus('Storyboard saved in this browser.')
    setIsSaved(true)
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="https://github.com/Cloud2BR-TEC/Cloudy-overview-videos" target="_blank" rel="noreferrer"><img src={cloudyLogo} alt="Cloudy" /><span><strong>Cloudy</strong><small>Repository Video Studio</small></span></a>
        <div className="project-state"><span className={isSaved ? 'saved-dot' : 'unsaved-dot'}></span>{isSaved ? 'Saved locally' : 'Unsaved changes'}</div>
        <button className="primary-button" type="button" onClick={saveProject}>Save project</button>
      </header>
      <section className="workspace">
        <aside className="rail" aria-label="Project workflow"><div className="rail-item active"><span>01</span><strong>Source</strong></div><div className="rail-item"><span>02</span><strong>Story</strong></div><div className="rail-item"><span>03</span><strong>Review</strong></div><div className="rail-item"><span>04</span><strong>Export</strong></div></aside>
        <section className="content-column">
          <div className="section-heading"><div><p className="eyebrow">Cloudy overview video</p><h1>Turn a repository into a clear story.</h1></div><p className="status" aria-live="polite">{status}</p></div>
          <form className="repository-form" onSubmit={analyzeRepository}><label htmlFor="repository-url">Public GitHub repository</label><div className="url-entry"><input id="repository-url" type="url" value={repositoryUrl} onChange={(event) => setRepositoryUrl(event.target.value)} placeholder="https://github.com/owner/repository" /><button className="primary-button" type="submit" disabled={isLoading}>{isLoading ? 'Scanning...' : 'Analyze'}</button></div><p>Public metadata is read in this browser. Connect GitHub through the secure service to access verified repositories and source files.</p></form>
          {repository ? <section className="repository-card" aria-label="Repository snapshot"><div className="repository-title"><div><p className="eyebrow">Verified public snapshot</p><h2>{repository.fullName}</h2><p>{repository.description}</p></div><button className="text-button" type="button" onClick={generateStoryboard}>Refresh draft</button></div><div className="metadata-grid"><span><small>Default branch</small>{repository.defaultBranch}</span><span><small>Primary language</small>{repository.language ?? 'Not detected'}</span><span><small>License</small>{repository.license}</span><span><small>Signals</small>{repository.stars} stars · {repository.openIssues} issues</span></div>{repository.topics.length > 0 && <div className="tags">{repository.topics.slice(0, 6).map((topic) => <span key={topic}>{topic}</span>)}</div>}</section> : <section className="empty-evidence"><span className="empty-icon">+</span><div><h2>Repository evidence will appear here</h2><p>Cloudy only uses approved, traceable repository context to build the first storyboard.</p></div></section>}
          <section className="story-area"><div className="story-head"><div><p className="eyebrow">Storyboard</p><h2>Cloudy’s explainer</h2></div><div className={`duration-pill ${inTargetRange ? 'ready' : ''}`}>{durationLabel(totalDuration)} <small>{inTargetRange ? 'Ready for review' : 'Target: 8-12 min'}</small></div></div><div className="story-grid"><ol className="scene-list">{scenes.map((scene) => <li key={scene.id}><button type="button" className={scene.id === selectedScene.id ? 'scene selected' : 'scene'} onClick={() => setSelectedSceneId(scene.id)}><span className="scene-number">{String(scene.id).padStart(2, '0')}</span><span><strong>{scene.title}</strong><small>{scene.visual}</small></span><time>{durationLabel(scene.duration)}</time></button></li>)}</ol><article className="scene-editor"><div className="preview-stage"><div className="preview-visual"><img src={cloudyLogo} alt="Cloudy presents the selected scene" /><span className="spark one"></span><span className="spark two"></span></div><div className="scene-caption"><span>Scene {selectedScene.id}</span><strong>{selectedScene.visual}</strong></div></div><div className="editor-fields"><label>Scene title<input value={selectedScene.title} onChange={(event) => updateScene('title', event.target.value)} /></label><label>Cloudy narration<textarea rows={4} value={selectedScene.narration} onChange={(event) => updateScene('narration', event.target.value)} /></label><label>Scene duration <span className="field-suffix">seconds</span><input type="number" min="15" value={selectedScene.duration} onChange={(event) => updateScene('duration', event.target.value)} /></label></div></article></div></section>
        </section>
        <aside className="review-panel"><div><p className="eyebrow">Readiness</p><h2>Before export</h2></div><ul className="checklist"><li className="done">Repository source captured</li><li className={inTargetRange ? 'done' : ''}>8-12 minute runtime</li><li>Review Cloudy narration</li><li>Add source visuals</li><li>Generate captions</li></ul><div className="secure-note"><strong>Secure GitHub access</strong><p>Repository ownership, private content, AI generation, and video rendering will connect through the protected Cloudy service.</p><button type="button" className="text-button">Connect GitHub</button></div></aside>
      </section>
    </main>
  )
}

export default App
