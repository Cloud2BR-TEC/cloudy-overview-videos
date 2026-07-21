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
  readme: string
  assets: string[]
}

type Scene = { id: number; title: string; duration: number; narration: string; visual: string }
type GitHubUser = { login: string; avatarUrl: string }

const starterRepository = 'https://github.com/Cloud2BR-TEC/ai-academy-101-ml'
const projectKey = 'cloudy-video-project'
const tokenKey = 'cloudy-github-token'
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
function downloadFile(name: string, contents: string, type: string) {
  const url = URL.createObjectURL(new Blob([contents], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  URL.revokeObjectURL(url)
}

function App() {
  const [repositoryUrl, setRepositoryUrl] = useState(starterRepository)
  const [repository, setRepository] = useState<Repository | null>(null)
  const [scenes, setScenes] = useState<Scene[]>(starterScenes)
  const [selectedSceneId, setSelectedSceneId] = useState(1)
  const [status, setStatus] = useState('Choose a repository, then build Cloudy’s video.')
  const [isLoading, setIsLoading] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [token, setToken] = useState('')
  const [tokenInput, setTokenInput] = useState('')
  const [gitHubUser, setGitHubUser] = useState<GitHubUser | null>(null)
  const [isConnectOpen, setIsConnectOpen] = useState(false)
  const [connectionError, setConnectionError] = useState('')
  const totalDuration = scenes.reduce((total, scene) => total + scene.duration, 0)
  const selectedScene = scenes.find((scene) => scene.id === selectedSceneId) ?? scenes[0]
  const inTargetRange = totalDuration >= 480 && totalDuration <= 720
  const cloudyLogo = new URL('../logo-cloud2br-tec.png', import.meta.url).href
  const apiHeaders: Record<string, string> = token
    ? { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}` }
    : { Accept: 'application/vnd.github+json' }

  useEffect(() => {
    const savedProject = window.localStorage.getItem(projectKey)
    if (savedProject) {
      try {
        const project = JSON.parse(savedProject) as { repositoryUrl?: string; repository?: Repository; scenes?: Scene[] }
        if (project.repositoryUrl) setRepositoryUrl(project.repositoryUrl)
        if (project.repository) setRepository(project.repository)
        if (project.scenes?.length) setScenes(project.scenes)
        setIsSaved(true)
        setStatus('Restored your locally saved storyboard.')
      } catch { window.localStorage.removeItem(projectKey) }
    }
    const sessionToken = window.sessionStorage.getItem(tokenKey)
    if (sessionToken) void verifyConnection(sessionToken)
  }, [])

  async function verifyConnection(candidateToken: string) {
    try {
      const response = await fetch('https://api.github.com/user', { headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${candidateToken}` } })
      if (!response.ok) throw new Error('Token rejected')
      const user = await response.json() as { login: string; avatar_url: string }
      setToken(candidateToken)
      setGitHubUser({ login: user.login, avatarUrl: user.avatar_url })
      window.sessionStorage.setItem(tokenKey, candidateToken)
      setStatus(`Connected to GitHub as ${user.login}.`)
      return true
    } catch {
      window.sessionStorage.removeItem(tokenKey)
      return false
    }
  }

  async function connectGitHub(event: FormEvent) {
    event.preventDefault()
    setConnectionError('')
    if (!tokenInput.trim()) { setConnectionError('Paste a fine-grained GitHub token to connect.'); return }
    if (!await verifyConnection(tokenInput.trim())) { setConnectionError('GitHub could not verify the token.'); return }
    setTokenInput('')
    setIsConnectOpen(false)
  }

  function disconnectGitHub() {
    window.sessionStorage.removeItem(tokenKey)
    setToken('')
    setGitHubUser(null)
    setStatus('GitHub disconnected. Public repositories remain available.')
  }

  async function analyzeRepository(event: FormEvent) {
    event.preventDefault()
    const parsed = parseRepositoryUrl(repositoryUrl)
    if (!parsed) { setStatus('Use a canonical URL such as https://github.com/owner/repository.'); return }
    setIsLoading(true)
    setStatus('Reading repository source and approved visual assets...')
    setIsSaved(false)
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
      setRepository({ fullName: data.full_name, description: data.description ?? 'No repository description was provided.', topics: data.topics ?? [], language: data.language, defaultBranch: data.default_branch, license: data.license?.spdx_id ?? 'No license detected', stars: data.stargazers_count, openIssues: data.open_issues_count, readme: readmeData?.content ? decodeBase64(readmeData.content) : '', assets })
      setStatus(readmeData?.content ? 'Source evidence is ready. Refresh Cloudy’s draft when you are ready.' : 'Metadata is ready. Add a README to create a richer draft.')
    } catch { setRepository(null); setStatus('The repository could not be read. Check visibility, URL, or GitHub connection.') }
    finally { setIsLoading(false) }
  }

  function generateStoryboard() {
    if (!repository) { setStatus('Build a repository source before refreshing the storyboard.'); return }
    const subject = repository.fullName.split('/')[1].replaceAll('-', ' ')
    const summary = repository.readme.replace(/[#*_`>|]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 240)
    setScenes((current) => current.map((scene, index) => ({ ...scene, title: index === 0 ? `Meet ${subject}` : scene.title, narration: index === 1 ? `${repository.description} ${summary || 'Cloudy connects these goals to the viewer’s next practical step.'}` : scene.narration, visual: index === 2 && repository.assets.length ? 'Repository image and guided source tour' : scene.visual })))
    setIsSaved(false)
    setStatus('Cloudy’s local draft has been refreshed from repository evidence.')
  }

  function updateScene(field: 'title' | 'narration' | 'duration', value: string) {
    setScenes((current) => current.map((scene) => scene.id === selectedScene.id ? { ...scene, [field]: field === 'duration' ? Math.max(15, Number(value) || 15) : value } : scene))
    setIsSaved(false)
  }

  function saveProject() {
    window.localStorage.setItem(projectKey, JSON.stringify({ repositoryUrl, repository, scenes }))
    setIsSaved(true)
    setStatus('Storyboard saved in this browser.')
  }

  function exportProject() {
    downloadFile('cloudy-video-project.json', JSON.stringify({ repositoryUrl, repository, scenes }, null, 2), 'application/json')
    setStatus('Project JSON downloaded.')
  }

  function exportCaptions() {
    let cursor = 0
    const content = scenes.map((scene, index) => {
      const start = timestamp(cursor)
      cursor += scene.duration
      return `${index + 1}\n${start} --> ${timestamp(cursor)}\n${scene.narration}`
    }).join('\n\n')
    downloadFile('cloudy-captions.srt', content, 'application/x-subrip')
    setStatus('Editable SRT captions downloaded.')
  }

  return <main className="app-shell">
    <header className="topbar">
      <a className="brand" href="https://github.com/Cloud2BR-TEC/Cloudy-overview-videos" target="_blank" rel="noreferrer"><img src={cloudyLogo} alt="Cloudy" /><span><strong>Cloudy</strong><small>Repository Video Studio</small></span></a>
      <div className="project-state"><span className={isSaved ? 'saved-dot' : 'unsaved-dot'}></span>{isSaved ? 'Saved locally' : 'Unsaved changes'}</div>
      <button className="secondary-button" type="button" onClick={exportProject}>Export project</button>
      <button className="primary-button" type="button" onClick={saveProject}>Save project</button>
    </header>
    <section className="workspace">
      <aside className="rail" aria-label="Project workflow"><div className="rail-item active"><span>01</span><strong>Source</strong></div><div className="rail-item"><span>02</span><strong>Story</strong></div><div className="rail-item"><span>03</span><strong>Captions</strong></div><div className="rail-item"><span>04</span><strong>Export</strong></div></aside>
      <section className="content-column">
        <div className="section-heading"><div><p className="eyebrow">Cloudy overview video</p><h1>Make a repository walkthrough people can follow.</h1></div><p className="status" aria-live="polite">{status}</p></div>
        <form className="repository-form" onSubmit={analyzeRepository}><label htmlFor="repository-url">GitHub repository URL</label><div className="url-entry"><input id="repository-url" type="url" value={repositoryUrl} onChange={(event) => setRepositoryUrl(event.target.value)} placeholder="https://github.com/owner/repository" /><button className="primary-button" type="submit" disabled={isLoading}>{isLoading ? 'Reading...' : 'Build source'}</button></div><div className="source-actions"><span>{gitHubUser ? `Connected as ${gitHubUser.login}` : 'Public repositories work without a connection.'}</span><button className="text-button" type="button" onClick={gitHubUser ? disconnectGitHub : () => setIsConnectOpen(true)}>{gitHubUser ? 'Disconnect GitHub' : 'Connect GitHub for private repositories'}</button></div></form>
        {repository ? <section className="repository-card" aria-label="Repository source"><div className="repository-title"><div><p className="eyebrow">Source evidence</p><h2>{repository.fullName}</h2><p>{repository.description}</p></div><button className="text-button" type="button" onClick={generateStoryboard}>Refresh Cloudy draft</button></div><div className="metadata-grid"><span><small>Default branch</small>{repository.defaultBranch}</span><span><small>Primary language</small>{repository.language ?? 'Not detected'}</span><span><small>License</small>{repository.license}</span><span><small>Signals</small>{repository.stars} stars · {repository.openIssues} issues</span></div>{repository.assets.length > 0 && <div className="asset-strip">{repository.assets.map((asset) => <img key={asset} src={asset} alt="Repository source asset" />)}</div>}{repository.topics.length > 0 && <div className="tags">{repository.topics.slice(0, 6).map((topic) => <span key={topic}>{topic}</span>)}</div>}</section> : <section className="empty-evidence"><span className="empty-icon">+</span><div><h2>Start with a repository</h2><p>Cloudy will collect its description, README, and root images directly in your browser.</p></div></section>}
        <section className="story-area"><div className="story-head"><div><p className="eyebrow">Storyboard</p><h2>Cloudy’s explainer</h2></div><div className={`duration-pill ${inTargetRange ? 'ready' : ''}`}>{durationLabel(totalDuration)} <small>{inTargetRange ? 'Within 8-12 minute target' : 'Target: 8-12 min'}</small></div></div><div className="story-grid"><ol className="scene-list">{scenes.map((scene) => <li key={scene.id}><button type="button" className={scene.id === selectedScene.id ? 'scene selected' : 'scene'} onClick={() => setSelectedSceneId(scene.id)}><span className="scene-number">{String(scene.id).padStart(2, '0')}</span><span><strong>{scene.title}</strong><small>{scene.visual}</small></span><time>{durationLabel(scene.duration)}</time></button></li>)}</ol><article className="scene-editor"><div className="preview-stage"><div className="preview-visual">{repository?.assets[0] ? <img className="source-visual" src={repository.assets[0]} alt="Selected repository source visual" /> : <img src={cloudyLogo} alt="Cloudy presents the selected scene" />}<span className="cloudy-avatar"><img src={cloudyLogo} alt="" /></span><span className="spark one"></span><span className="spark two"></span></div><div className="scene-caption"><span>Scene {selectedScene.id}</span><strong>{selectedScene.visual}</strong></div></div><div className="editor-fields"><label>Scene title<input value={selectedScene.title} onChange={(event) => updateScene('title', event.target.value)} /></label><label>Cloudy narration<textarea rows={4} value={selectedScene.narration} onChange={(event) => updateScene('narration', event.target.value)} /></label><label>Scene duration <span className="field-suffix">seconds</span><input type="number" min="15" value={selectedScene.duration} onChange={(event) => updateScene('duration', event.target.value)} /></label></div></article></div></section>
      </section>
      <aside className="review-panel"><div><p className="eyebrow">Ready to export</p><h2>Local package</h2></div><ul className="checklist"><li className={repository ? 'done' : ''}>Repository source captured</li><li className={inTargetRange ? 'done' : ''}>8-12 minute runtime</li><li className="done">Editable narration</li><li className={repository?.assets.length ? 'done' : ''}>Source visuals selected</li><li className="done">Captions ready to export</li></ul><div className="export-actions"><button className="primary-button" type="button" onClick={exportCaptions}>Download captions</button><button className="secondary-button" type="button" onClick={exportProject}>Download project</button></div></aside>
    </section>
    {isConnectOpen && <div className="modal-backdrop" role="presentation"><section className="connect-modal" role="dialog" aria-modal="true" aria-labelledby="connect-heading"><button className="close-button" type="button" aria-label="Close GitHub connection dialog" onClick={() => setIsConnectOpen(false)}>×</button><p className="eyebrow">GitHub connection</p><h2 id="connect-heading">Connect this browser session</h2><p>Paste a fine-grained personal access token with read-only access to the repositories you want Cloudy to inspect. It stays in this browser tab and is sent only to GitHub’s API.</p><form onSubmit={connectGitHub}><label htmlFor="github-token">GitHub token<input id="github-token" type="password" value={tokenInput} onChange={(event) => setTokenInput(event.target.value)} autoComplete="off" placeholder="github_pat_..." /></label>{connectionError && <p className="connection-error" role="alert">{connectionError}</p>}<div className="modal-actions"><button className="secondary-button" type="button" onClick={() => setIsConnectOpen(false)}>Cancel</button><button className="primary-button" type="submit">Connect GitHub</button></div></form><a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noreferrer">Create a fine-grained token on GitHub</a></section></div>}
  </main>
}

export default App