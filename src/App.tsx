import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'

type Repository = { fullName: string; description: string; topics: string[]; language: string | null; defaultBranch: string; license: string; stars: number; openIssues: number; readme: string; assets: string[] }
type RepositoryChoice = { fullName: string; description: string; isPrivate: boolean; updatedAt: string }
type Scene = { id: number; title: string; duration: number; narration: string; visual: string }
type GitHubUser = { login: string; avatarUrl: string }
type DeviceAuthorization = { device_code: string; user_code: string; verification_uri: string; interval: number }

const starterRepository = 'https://github.com/Cloud2BR-TEC/ai-academy-101-ml'
const projectKey = 'cloudy-video-project'
const githubClientId = import.meta.env.VITE_GITHUB_OAUTH_CLIENT_ID as string | undefined
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

function App() {
  const [repositoryUrl, setRepositoryUrl] = useState(starterRepository)
  const [repository, setRepository] = useState<Repository | null>(null)
  const [availableRepositories, setAvailableRepositories] = useState<RepositoryChoice[]>([])
  const [scenes, setScenes] = useState<Scene[]>(starterScenes)
  const [selectedSceneId, setSelectedSceneId] = useState(1)
  const [status, setStatus] = useState('Sign in with GitHub to choose a repository.')
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingRepositories, setIsLoadingRepositories] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [token, setToken] = useState('')
  const [gitHubUser, setGitHubUser] = useState<GitHubUser | null>(null)
  const [isConnectOpen, setIsConnectOpen] = useState(false)
  const [deviceAuthorization, setDeviceAuthorization] = useState<DeviceAuthorization | null>(null)
  const [connectionError, setConnectionError] = useState('')
  const [sourceMode, setSourceMode] = useState<'picker' | 'url'>('picker')
  const [repositoryFilter, setRepositoryFilter] = useState('')
  const totalDuration = scenes.reduce((total, scene) => total + scene.duration, 0)
  const selectedScene = scenes.find((scene) => scene.id === selectedSceneId) ?? scenes[0]
  const inTargetRange = totalDuration >= 480 && totalDuration <= 720
  const cloudyLogo = new URL('./assets/branding/cloudy-logo.png', import.meta.url).href
  const apiHeaders: Record<string, string> = token ? { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}` } : { Accept: 'application/vnd.github+json' }
  const visibleRepositories = availableRepositories.filter((item) => item.fullName.toLowerCase().includes(repositoryFilter.toLowerCase()))

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

  async function loadAvailableRepositories(candidateToken: string) {
    setIsLoadingRepositories(true)
    try {
      const response = await fetch('https://api.github.com/user/repos?affiliation=owner,collaborator,organization_member&per_page=100&sort=updated', { headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${candidateToken}` } })
      if (!response.ok) throw new Error('Repository list unavailable')
      const data = await response.json() as Array<{ full_name: string; description: string | null; private: boolean; updated_at: string }>
      setAvailableRepositories(data.map((item) => ({ fullName: item.full_name, description: item.description ?? 'No description provided.', isPrivate: item.private, updatedAt: item.updated_at })))
    } catch { setConnectionError('GitHub could not load your available repositories.') }
    finally { setIsLoadingRepositories(false) }
  }

  async function completeSignIn(candidateToken: string) {
    const response = await fetch('https://api.github.com/user', { headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${candidateToken}` } })
    if (!response.ok) throw new Error('GitHub could not verify this sign-in.')
    const user = await response.json() as { login: string; avatar_url: string }
    setToken(candidateToken)
    setGitHubUser({ login: user.login, avatarUrl: user.avatar_url })
    setStatus(`Signed in as ${user.login}. Choose the repository for Cloudy’s overview.`)
    await loadAvailableRepositories(candidateToken)
  }

  async function pollForAccessToken(authorization: DeviceAuthorization) {
    const body = new URLSearchParams({ client_id: githubClientId ?? '', device_code: authorization.device_code, grant_type: 'urn:ietf:params:oauth:grant-type:device_code' })
    const response = await fetch('https://github.com/login/oauth/access_token', { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' }, body })
    const data = await response.json() as { access_token?: string; error?: string }
    if (data.access_token) {
      await completeSignIn(data.access_token)
      setDeviceAuthorization(null)
      setIsConnectOpen(false)
      return
    }
    if (data.error === 'authorization_pending') {
      window.setTimeout(() => { void pollForAccessToken(authorization) }, authorization.interval * 1000)
      return
    }
    setConnectionError(data.error === 'access_denied' ? 'GitHub sign-in was cancelled.' : 'GitHub sign-in expired. Start again.')
    setDeviceAuthorization(null)
  }

  async function beginGitHubSignIn() {
    setConnectionError('')
    setIsConnectOpen(true)
    if (!githubClientId) {
      setConnectionError('GitHub sign-in has not been configured for this deployment yet.')
      return
    }
    try {
      const body = new URLSearchParams({ client_id: githubClientId, scope: 'read:user repo' })
      const response = await fetch('https://github.com/login/device/code', { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' }, body })
      if (!response.ok) throw new Error('Device code unavailable')
      const authorization = await response.json() as DeviceAuthorization
      setDeviceAuthorization(authorization)
      window.open(`${authorization.verification_uri}?user_code=${authorization.user_code}`, '_blank', 'noopener,noreferrer')
      window.setTimeout(() => { void pollForAccessToken(authorization) }, authorization.interval * 1000)
    } catch { setConnectionError('GitHub could not start browser sign-in. Please try again.') }
  }

  function signOut() {
    window.speechSynthesis.cancel()
    setToken('')
    setGitHubUser(null)
    setAvailableRepositories([])
    setRepository(null)
    setStatus('Signed out. No GitHub data is stored by Cloudy.')
  }

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

  function submitRepositoryUrl(event: FormEvent) { event.preventDefault(); void loadRepository(repositoryUrl) }
  function selectRepository(fullName: string) { setSourceMode('url'); void loadRepository(`https://github.com/${fullName}`) }
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
    <header className="topbar"><a className="brand" href="https://github.com/Cloud2BR-TEC/Cloudy-overview-videos" target="_blank" rel="noreferrer"><img src={cloudyLogo} alt="Cloudy" /><span><strong>Cloudy</strong><small>Repository Video Studio</small></span></a><div className="project-state"><span className={isSaved ? 'saved-dot' : 'unsaved-dot'}></span>{isSaved ? 'Saved locally' : 'Unsaved changes'}</div>{gitHubUser && <button className="account-button" type="button" onClick={signOut}><img src={gitHubUser.avatarUrl} alt="" />{gitHubUser.login}</button>}<button className="secondary-button" type="button" onClick={exportProject}>Export project</button><button className="primary-button" type="button" onClick={saveProject}>Save project</button></header>
    <section className="workspace"><aside className="rail" aria-label="Project workflow"><div className="rail-item active"><span>01</span><strong>Source</strong></div><div className="rail-item"><span>02</span><strong>Story</strong></div><div className="rail-item"><span>03</span><strong>Voice</strong></div><div className="rail-item"><span>04</span><strong>Export</strong></div></aside><section className="content-column">
      <div className="section-heading"><div><p className="eyebrow">Cloudy overview video</p><h1>Choose the repository Cloudy will explain.</h1></div><p className="status" aria-live="polite">{status}</p></div>
      {!gitHubUser ? <section className="sign-in-card"><div><p className="eyebrow">GitHub browser sign-in</p><h2>Start with your GitHub account.</h2><p>Cloudy does not create an account or store your GitHub token or repository content. Your sign-in is kept only in this open browser session.</p></div><button className="primary-button" type="button" onClick={beginGitHubSignIn}>Continue with GitHub</button></section> : <section className="repository-form"><div className="source-tabs" role="tablist"><button className={sourceMode === 'picker' ? 'active' : ''} type="button" role="tab" onClick={() => setSourceMode('picker')}>Choose a repository</button><button className={sourceMode === 'url' ? 'active' : ''} type="button" role="tab" onClick={() => setSourceMode('url')}>Paste a URL</button></div>{sourceMode === 'picker' ? <div className="repository-picker"><label htmlFor="repository-filter">Available repositories</label><input id="repository-filter" value={repositoryFilter} onChange={(event) => setRepositoryFilter(event.target.value)} placeholder="Filter repositories" />{isLoadingRepositories ? <p>Loading repositories...</p> : <ul>{visibleRepositories.map((item) => <li key={item.fullName}><button type="button" onClick={() => selectRepository(item.fullName)}><span><strong>{item.fullName}</strong><small>{item.description}</small></span><em>{item.isPrivate ? 'Private' : 'Public'}</em></button></li>)}</ul>}</div> : <form onSubmit={submitRepositoryUrl}><label htmlFor="repository-url">GitHub repository URL</label><div className="url-entry"><input id="repository-url" type="url" value={repositoryUrl} onChange={(event) => setRepositoryUrl(event.target.value)} placeholder="https://github.com/owner/repository" /><button className="primary-button" type="submit" disabled={isLoading}>{isLoading ? 'Reading...' : 'Build source'}</button></div></form>}</section>}
      {repository && <section className="repository-card" aria-label="Repository source"><div className="repository-title"><div><p className="eyebrow">Source evidence</p><h2>{repository.fullName}</h2><p>{repository.description}</p></div><button className="text-button" type="button" onClick={generateStoryboard}>Refresh Cloudy draft</button></div><div className="metadata-grid"><span><small>Default branch</small>{repository.defaultBranch}</span><span><small>Primary language</small>{repository.language ?? 'Not detected'}</span><span><small>License</small>{repository.license}</span><span><small>Signals</small>{repository.stars} stars · {repository.openIssues} issues</span></div>{repository.assets.length > 0 && <div className="asset-strip">{repository.assets.map((asset) => <img key={asset} src={asset} alt="Repository source asset" />)}</div>}{repository.topics.length > 0 && <div className="tags">{repository.topics.slice(0, 6).map((topic) => <span key={topic}>{topic}</span>)}</div>}</section>}
      <section className="story-area"><div className="story-head"><div><p className="eyebrow">Storyboard</p><h2>Cloudy’s explainer</h2></div><div className={`duration-pill ${inTargetRange ? 'ready' : ''}`}>{durationLabel(totalDuration)} <small>{inTargetRange ? 'Within 8-12 minute target' : 'Target: 8-12 min'}</small></div></div><div className="story-grid"><ol className="scene-list">{scenes.map((scene) => <li key={scene.id}><button type="button" className={scene.id === selectedScene.id ? 'scene selected' : 'scene'} onClick={() => setSelectedSceneId(scene.id)}><span className="scene-number">{String(scene.id).padStart(2, '0')}</span><span><strong>{scene.title}</strong><small>{scene.visual}</small></span><time>{durationLabel(scene.duration)}</time></button></li>)}</ol><article className="scene-editor"><div className="preview-stage"><div className="preview-visual">{repository?.assets[0] ? <img className="source-visual" src={repository.assets[0]} alt="Selected repository source visual" /> : <img src={cloudyLogo} alt="Cloudy presents the selected scene" />}<span className="cloudy-avatar"><img src={cloudyLogo} alt="" /></span><span className="spark one"></span><span className="spark two"></span></div><div className="scene-caption"><span>Scene {selectedScene.id}</span><strong>{selectedScene.visual}</strong></div></div><div className="editor-fields"><label>Scene title<input value={selectedScene.title} onChange={(event) => updateScene('title', event.target.value)} /></label><label>Cloudy narration<textarea rows={4} value={selectedScene.narration} onChange={(event) => updateScene('narration', event.target.value)} /></label><label>Scene duration <span className="field-suffix">seconds</span><input type="number" min="15" value={selectedScene.duration} onChange={(event) => updateScene('duration', event.target.value)} /></label><button className="secondary-button voice-button" type="button" onClick={previewVoice}>Preview female voice</button></div></article></div></section>
    </section><aside className="review-panel"><div><p className="eyebrow">Ready to export</p><h2>Local package</h2></div><ul className="checklist"><li className={repository ? 'done' : ''}>Repository source captured</li><li className={inTargetRange ? 'done' : ''}>8-12 minute runtime</li><li className="done">Editable Cloudy narration</li><li className={repository?.assets.length ? 'done' : ''}>Source visuals selected</li><li className="done">Captions ready to export</li></ul><div className="export-actions"><button className="primary-button" type="button" onClick={exportCaptions}>Download captions</button><button className="secondary-button" type="button" onClick={exportProject}>Download project</button></div></aside></section>
    {isConnectOpen && <div className="modal-backdrop" role="presentation"><section className="connect-modal" role="dialog" aria-modal="true" aria-labelledby="connect-heading"><button className="close-button" type="button" aria-label="Close GitHub sign-in dialog" onClick={() => setIsConnectOpen(false)}>×</button><p className="eyebrow">No Cloudy data storage</p><h2 id="connect-heading">Sign in on GitHub</h2>{deviceAuthorization ? <><p>GitHub opened in a new browser tab. Enter this temporary code to continue:</p><strong className="device-code">{deviceAuthorization.user_code}</strong><a className="primary-button device-link" href={`${deviceAuthorization.verification_uri}?user_code=${deviceAuthorization.user_code}`} target="_blank" rel="noreferrer">Open GitHub sign-in</a></> : <><p>{connectionError || 'Use GitHub’s consent page to choose the repositories available to this session.'}</p>{!githubClientId && <p className="connection-error">Set the public repository variable `GITHUB_OAUTH_CLIENT_ID` before deploying this sign-in flow.</p>}</>}<button className="secondary-button" type="button" onClick={() => setIsConnectOpen(false)}>Cancel</button></section></div>}
  </main>
}

export default App