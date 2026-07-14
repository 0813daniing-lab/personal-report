import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import Papa from 'papaparse'
import { supabase, clean, pick, publicLinkFor, chapterColumns, emptyData, reportChapters } from './lib.js'
import './style.css'

function App() {
  const [admin, setAdmin] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('personal_report_admin') || 'null')
    } catch {
      return null
    }
  })
  const [route, setRoute] = useState(window.location.hash || '#/')

  useEffect(() => {
    const onHash = () => setRoute(window.location.hash || '#/')
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  function handleLogin(nextAdmin) {
    localStorage.setItem('personal_report_admin', JSON.stringify(nextAdmin))
    setAdmin(nextAdmin)
  }

  function handleLogout() {
    localStorage.removeItem('personal_report_admin')
    setAdmin(null)
    window.location.hash = '#/'
  }

  if (route.startsWith('#/report/')) return <StudentReportPage slug={route.replace('#/report/', '')} />
  if (!admin) return <AuthPage onLogin={handleLogin} />
  return <AdminApp admin={admin} onLogout={handleLogout} />
}

function AuthPage({ onLogin }) {
  const [mode, setMode] = useState('login')
  const [loginForm, setLoginForm] = useState({ loginId: '', password: '' })
  const [signUpForm, setSignUpForm] = useState({ trackLabel: '', cohort: '', name: '', loginId: '', password: '' })
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function signIn() {
    setLoading(true)
    setMessage('')
    const loginId = clean(loginForm.loginId)
    const password = clean(loginForm.password)
    if (!loginId || !password) {
      setMessage('아이디와 비밀번호를 입력하세요.')
      setLoading(false)
      return
    }
    const { data, error } = await supabase
      .from('admin_accounts')
      .select('*')
      .eq('login_id', loginId)
      .eq('password', password)
      .single()
    if (error || !data) {
      setMessage('아이디 또는 비밀번호가 일치하지 않습니다.')
      setLoading(false)
      return
    }
    onLogin(data)
    setLoading(false)
  }

  async function signUp() {
    setLoading(true)
    setMessage('')
    const payload = {
      track_label: clean(signUpForm.trackLabel),
      cohort: clean(signUpForm.cohort),
      name: clean(signUpForm.name),
      login_id: clean(signUpForm.loginId),
      password: clean(signUpForm.password),
    }
    if (!payload.track_label || !payload.cohort || !payload.name || !payload.login_id || !payload.password) {
      setMessage('담당트랙, 기수, 이름, 아이디, 비밀번호를 모두 입력하세요.')
      setLoading(false)
      return
    }
    const { data, error } = await supabase
      .from('admin_accounts')
      .insert(payload)
      .select('*')
      .single()
    if (error) {
      setMessage(error.message.includes('duplicate') ? '이미 사용 중인 아이디입니다.' : error.message)
      setLoading(false)
      return
    }
    onLogin(data)
    setLoading(false)
  }

  return <main className="authLanding">
    <header className="authTopbar">
      <div className="brand"><div className="logo">✦</div><strong>퍼스널 리포트</strong></div>
      <div className="rowButtons authTabsTop">
        <button className={mode === 'login' ? 'activeGhost' : ''} onClick={() => setMode('login')}>로그인</button>
        <button className={mode === 'signup' ? 'activeGhost' : ''} onClick={() => setMode('signup')}>회원가입</button>
      </div>
    </header>

    <section className="authShell">
      <article className="authHeroPanel">
        
        <h1>{mode === 'login' ? <>트랙별 퍼스널 리포트를<br />더 편하게 관리하세요.</> : <>담당 트랙 기준의 워크스페이스를<br />만드세요.</>}</h1>
        <p>
          {mode === 'login'
            ? '피그마로 하나하나 만들기 귀찮았던 퍼스널리포트를 자동화 했어요 :)'
            : '이메일 인증 없이 아이디와 비밀번호만으로 관리자 워크스페이스를 만듭니다. 수강생은 회원가입 없이 배포 링크에서 본인 리포트를 확인합니다.'}
        </p>
      </article>

      <article className="authFormPanel authFlatPanel">
        {mode === 'login' ? (
          <>
            <p className="muted authLoginGuide">회원가입할 때 만든 아이디와 비밀번호로 로그인합니다.</p>
            <label>아이디<input placeholder="자주 안쓰는 아이디를 넣어주세요." value={loginForm.loginId} onChange={e => setLoginForm({ ...loginForm, loginId: e.target.value })} /></label>
            <label>비밀번호<input placeholder="자주 안쓰는 비밀번호를 넣어주세요." type="password" value={loginForm.password} onChange={e => setLoginForm({ ...loginForm, password: e.target.value })} /></label>
            <button className="primary wide" onClick={signIn} disabled={loading}>{loading ? '처리 중' : '로그인'}</button>
            <button className="wide" onClick={() => setMode('signup')}>회원가입</button>
          </>
        ) : (
          <>
            <h2>회원가입</h2>
            <div className="authInfoBox">
              <b>가입 전 안내</b>
              <p>이메일 인증 없이 바로 가입됩니다. 테스트는 000000 같은 쉬운 아이디로도 가능합니다.</p>
            </div>
            <label>담당트랙<input placeholder="예: 단기심화" value={signUpForm.trackLabel} onChange={e => setSignUpForm({ ...signUpForm, trackLabel: e.target.value })} /></label>
            <label>기수<input placeholder="예: 7기" value={signUpForm.cohort} onChange={e => setSignUpForm({ ...signUpForm, cohort: e.target.value })} /></label>
            <label>이름<input placeholder="예: 이주영" value={signUpForm.name} onChange={e => setSignUpForm({ ...signUpForm, name: e.target.value })} /></label>
            <label>아이디<input placeholder="자주 안쓰는 아이디를 넣어주세요." value={signUpForm.loginId} onChange={e => setSignUpForm({ ...signUpForm, loginId: e.target.value })} /></label>
            <label>비밀번호<input placeholder="자주 안쓰는 비밀번호를 넣어주세요." type="password" value={signUpForm.password} onChange={e => setSignUpForm({ ...signUpForm, password: e.target.value })} /></label>
            <button className="primary wide" onClick={signUp} disabled={loading}>{loading ? '처리 중' : '가입하고 시작하기'}</button>
            <button className="wide" onClick={() => setMode('login')}>로그인으로 돌아가기</button>
          </>
        )}
        {message && <p className="notice authNotice">{message}</p>}
      </article>
    </section>
  </main>
}

async function createDemoTrack(admin) {
  const { data: existing, error: existingError } = await supabase
    .from('tracks')
    .select('id')
    .eq('owner_id', admin.id)
    .eq('title', '예시 퍼스널 리포트')
    .limit(1)

  if (existingError || existing?.length) return null

  const { data: track, error: trackError } = await supabase
    .from('tracks')
    .insert({
      owner_id: admin.id,
      title: '예시 퍼스널 리포트',
      manager_name: admin.name || '운영 매니저',
      chapter_count: 4,
      guide_text: '예시 리포트입니다. 이름은 홍길동, 비밀번호는 000000으로 확인할 수 있습니다.',
      total_attendance_days: 95,
      is_published: true,
    })
    .select('*')
    .single()

  if (trackError || !track) {
    console.error(trackError)
    return null
  }

  const { data: student, error: studentError } = await supabase
    .from('students')
    .insert({
      track_id: track.id,
      name: '홍길동',
      password: '000000',
      attendance_days: 92,
      is_public: true,
      sort_order: 0,
    })
    .select('*')
    .single()

  if (studentError || !student) {
    console.error(studentError)
    return track
  }

  await supabase.from('chapter_defaults').insert([
    { track_id: track.id, chapter_no: 1, chapter_name: '기초 프로젝트', default_image_url: 'https://placehold.co/900x500/fff0f5/f7114d?text=Chapter+1', default_description: '예시 기본 이미지입니다.' },
    { track_id: track.id, chapter_no: 2, chapter_name: '심화 프로젝트', default_image_url: 'https://placehold.co/900x500/fff0f5/f7114d?text=Chapter+2', default_description: '예시 기본 이미지입니다.' },
    { track_id: track.id, chapter_no: 3, chapter_name: '실전 프로젝트', default_image_url: 'https://placehold.co/900x500/fff0f5/f7114d?text=Chapter+3', default_description: '예시 기본 이미지입니다.' },
    { track_id: track.id, chapter_no: 4, chapter_name: '최종 프로젝트', default_image_url: 'https://placehold.co/900x500/fff0f5/f7114d?text=Chapter+4', default_description: '예시 기본 이미지입니다.' },
  ])

  await supabase.from('student_chapter_teams').insert([
    { track_id: track.id, student_id: student.id, chapter_no: 1, team_no: '10' },
    { track_id: track.id, student_id: student.id, chapter_no: 2, team_no: '3' },
    { track_id: track.id, student_id: student.id, chapter_no: 3, team_no: '6' },
    { track_id: track.id, student_id: student.id, chapter_no: 4, team_no: '4' },
  ])

  await supabase.from('chapter_results').insert([
    { track_id: track.id, chapter_no: 1, team_no: '10', project_title: '기초 프로젝트 예시', result_url: 'https://notion.so/', image_url: '' },
    { track_id: track.id, chapter_no: 2, team_no: '3', project_title: '심화 프로젝트 예시', result_url: 'https://notion.so/', image_url: '' },
    { track_id: track.id, chapter_no: 3, team_no: '6', project_title: '실전 프로젝트 예시', result_url: 'https://notion.so/', image_url: '' },
    { track_id: track.id, chapter_no: 4, team_no: '4', project_title: '최종 프로젝트 예시', result_url: 'https://notion.so/', image_url: '' },
  ])

  await supabase.from('letters_awards').insert({
    track_id: track.id,
    student_id: student.id,
    tutor_name: '담당 튜터',
    manager_name: admin.name || '운영 매니저',
    tutor_letter: '홍길동님, 과정 동안 꾸준히 시도하고 개선해온 점이 인상적이었습니다. 최종 프로젝트까지 완주한 경험을 바탕으로 다음 단계에서도 계속 성장하길 바랍니다.',
    manager_letter: '홍길동님의 수료를 진심으로 축하합니다. 이 리포트는 퍼스널 리포트 화면 예시입니다. 실제 운영 시 CSV 업로드와 표 편집으로 내용을 교체할 수 있습니다.',
    certificate_url: '',
    award_type: '없음',
    award_url: '',
    award_phrase: '과정을 성실히 이수했습니다.',
  })

  return track
}


function AdminApp({ admin, onLogout }) {
  const [tracks, setTracks] = useState([])
  const [selected, setSelected] = useState(null)
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => { loadTracks() }, [])

  async function loadTracks() {
    const { data, error } = await supabase.from('tracks').select('*').eq('owner_id', admin.id).order('created_at', { ascending: false })
    if (error) return
    setTracks(data || [])
  }

  function logout() {
    onLogout()
  }

  async function deleteTrack(track) {
    const ok = window.confirm(`정말 '${track.title}' 트랙을 삭제할까요? 삭제하면 수강생 정보, 편지, 결과물 링크가 함께 삭제됩니다.`)
    if (!ok) return

    const deleteSteps = [
      ['letters_awards', supabase.from('letters_awards').delete().eq('track_id', track.id)],
      ['student_chapter_teams', supabase.from('student_chapter_teams').delete().eq('track_id', track.id)],
      ['chapter_results', supabase.from('chapter_results').delete().eq('track_id', track.id)],
      ['chapter_defaults', supabase.from('chapter_defaults').delete().eq('track_id', track.id)],
      ['students', supabase.from('students').delete().eq('track_id', track.id)],
      ['tracks', supabase.from('tracks').delete().eq('id', track.id).eq('owner_id', admin.id)],
    ]

    for (const [tableName, request] of deleteSteps) {
      const { error } = await request
      if (error) return alert(`${tableName} 삭제 중 오류: ${error.message}`)
    }

    setSelected(null)
    await loadTracks()
  }

  if (selected) return <Workspace track={selected} onBack={() => { setSelected(null); loadTracks() }} />

  return <main className="dashboardShell">
    <section className="dashboardHero">
      <div className="dashboardTopActions">
        <button>내 정보</button>
        <button onClick={logout}>로그아웃</button>
      </div>
      <div className="dashboardHeroInner">
        <span className="dashboardPaperIcon">💌</span>
        <h1>트랙별 퍼스널 리포트 팀 생성</h1>
        <p>피그마로 하나하나 만들기 귀찮았던<br />퍼스널리포트를 자동화 했어요 :)</p>
      </div>
    </section>
    <section className="dashboardPanel">
      <h2>퍼스널 리포트 내 담당 트랙</h2>
      <p className="muted">새 트랙을 만들고 수강생별 최종 리포트를 관리합니다.</p>
      <div className="trackGrid dashboardTrackGrid">
        <button className="createCard dashboardCreateCard" onClick={() => setShowCreate(true)}><b>＋</b><span>새 퍼스널 리포트 만들기</span></button>
        {tracks.map(track => <article className="trackCard dashboardTrackCard" key={track.id}>
          <button className="plainCard" onClick={() => setSelected(track)}>
            <h3>{track.title}</h3>
            <p>{track.manager_name || '담당 매니저 미입력'} · 챕터 {track.chapter_count}개</p>
          </button>
          <div className="dashboardCardActions"><button onClick={() => copy(publicLinkFor(track))}>배포 링크 복사</button><button className="dangerBtn" onClick={() => deleteTrack(track)}>트랙 삭제</button></div>
        </article>)}
      </div>
    </section>
    {showCreate && <CreateTrackModal admin={admin} onClose={() => setShowCreate(false)} onDone={(track) => { setShowCreate(false); setSelected(track); loadTracks() }} />}
  </main>
}

function Topbar({ onLogout }) {
  return <header className="topbar"><div className="brand"><div className="logo">✦</div><strong>퍼스널 리포트</strong></div><div className="rowButtons"><button>내 정보</button><button onClick={onLogout}>로그아웃</button></div></header>
}

function CreateTrackModal({ admin, onClose, onDone }) {
  const [form, setForm] = useState({ title: '새 퍼스널 리포트 트랙', manager_name: '', start_date: '', end_date: '', total_attendance_days: '', chapter_count: 4, guide_text: '수료를 진심으로 축하합니다. 이름과 비밀번호를 입력하면 개인 리포트를 확인할 수 있습니다.' })
  const [saving, setSaving] = useState(false)

  async function create() {
    if (!clean(form.title)) return alert('트랙명을 입력하세요.')
    setSaving(true)
    const { data: track, error } = await supabase.from('tracks').insert({ ...form, owner_id: admin.id }).select('*').single()
    if (error) { alert(error.message); setSaving(false); return }
    const defaults = chapterColumns(form.chapter_count).map(no => ({ track_id: track.id, chapter_no: no, chapter_name: `챕터 ${no}` }))
    await supabase.from('chapter_defaults').insert(defaults)
    onDone(track)
  }

  return <div className="modalBackdrop"><section className="modal">
    <button className="x" onClick={onClose}>닫기</button>
    <h2>새 퍼스널 리포트 트랙 만들기</h2>
    <label>트랙명<input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></label>
    <label>담당 매니저<input value={form.manager_name} onChange={e => setForm({ ...form, manager_name: e.target.value })} /></label>
    <div className="twoCols">
      <label>트랙 시작일<input type="date" value={form.start_date || ''} onChange={e => setForm({ ...form, start_date: e.target.value })} /></label>
      <label>트랙 종료일<input type="date" value={form.end_date || ''} onChange={e => setForm({ ...form, end_date: e.target.value })} /></label>
    </div>
    <div className="twoCols">
      <label>주말 및 공휴일 제외 전체 출결일수<input type="number" min="1" placeholder="예: 95" value={form.total_attendance_days || ''} onChange={e => setForm({ ...form, total_attendance_days: e.target.value ? Number(e.target.value) : '' })} /></label>
      <label>챕터 수<input type="number" min="1" max="20" value={form.chapter_count} onChange={e => setForm({ ...form, chapter_count: Number(e.target.value) })} /></label>
    </div>
    <label>수강생 배포 페이지 안내 문구<textarea rows="3" value={form.guide_text} onChange={e => setForm({ ...form, guide_text: e.target.value })} /></label>
    <button className="primary wide" onClick={create} disabled={saving}>{saving ? '생성 중' : '트랙 만들기'}</button>
  </section></div>
}

function Workspace({ track: initialTrack, onBack }) {
  const [track, setTrack] = useState(initialTrack)
  const [tab, setTab] = useState('settings')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [data, setData] = useState(emptyData)
  const [selectedStudentId, setSelectedStudentId] = useState(null)
  const selectedStudent = data.students.find(s => s.id === selectedStudentId) || data.students[0]

  const workflowItems = [
    { key: 'settings', order: '1.', title: '트랙 설정', shortTitle: '트랙 설정', icon: '⚙️', description: '트랙 기본 정보와 챕터 수를 설정합니다.' },
    { key: 'upload', order: '2.', title: 'CSV 파일 업로드', shortTitle: 'CSV 업로드', icon: '📤', description: '수강생 정보와 결과물 정보를 CSV로 업로드합니다.' },
    { key: 'tables', order: '3.1', title: '표 편집', shortTitle: '표 편집', icon: '🗂️', description: '업로드한 수강생 정보와 결과물을 표에서 수정합니다.' },
    { key: 'letters', order: '3.2', title: '편지 개별 작성', shortTitle: '편지 개별 작성', icon: '✍️', description: '수강생별 튜터 편지와 매니저 편지를 개별 작성합니다.' },
    { key: 'preview', order: '4.', title: '수강생 화면 미리보기', shortTitle: '화면 미리보기', icon: '👀', description: '수강생이 보게 될 리포트 화면을 미리 확인합니다.' },
    { key: 'publish', order: '5.', title: '배포 관리', shortTitle: '배포 관리', icon: '🚀', description: '공개 상태를 바꾸고 배포 링크를 관리합니다.' },
  ]
  const activeTab = workflowItems.find(item => item.key === tab) || workflowItems[0]

  useEffect(() => { loadAll() }, [track.id])

  async function loadAll() {
    const [students, studentTeams, chapterResults, chapterDefaults, lettersAwards] = await Promise.all([
      supabase.from('students').select('*').eq('track_id', track.id).order('sort_order'),
      supabase.from('student_chapter_teams').select('*').eq('track_id', track.id).order('chapter_no'),
      supabase.from('chapter_results').select('*').eq('track_id', track.id).order('chapter_no'),
      supabase.from('chapter_defaults').select('*').eq('track_id', track.id).order('chapter_no'),
      supabase.from('letters_awards').select('*').eq('track_id', track.id)
    ])
    setData({
      students: students.data || [],
      studentTeams: studentTeams.data || [],
      chapterResults: chapterResults.data || [],
      chapterDefaults: chapterDefaults.data || [],
      lettersAwards: lettersAwards.data || []
    })
  }

  async function updateTrack(patch) {
    const { data: next, error } = await supabase.from('tracks').update(patch).eq('id', track.id).select('*').single()
    if (error) return alert(error.message)
    setTrack(next)
    if (patch.chapter_count) await ensureChapterDefaults(next.chapter_count)
    await loadAll()
  }

  async function ensureChapterDefaults(count) {
    for (const no of chapterColumns(count)) {
      await supabase.from('chapter_defaults').upsert({ track_id: track.id, chapter_no: no, chapter_name: `챕터 ${no}` }, { onConflict: 'track_id,chapter_no' })
    }
  }

  return <main className={sidebarCollapsed ? "workspace orderedWorkspace sidebarCollapsed" : "workspace orderedWorkspace"}>
    <aside className="orderedSidebar">
      <div className="orderedSidebarTop">
        <div className="orderedSidebarActions">
          <button className="orderedBackBtn orderedHomeBtn" onClick={onBack} title="팀 생성으로 돌아가기" aria-label="팀 생성으로 돌아가기">
            <span className="orderedHomeIcon">⌂</span>
            <span className="orderedHomeLabel">팀 생성 돌아가기</span>
          </button>
          <button className="sidebarToggleBtn" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>{sidebarCollapsed ? '›' : '‹'}</button>
        </div>
        <div className="orderedTrackInfo">
          <h2>{track.title}</h2>
          <p>{track.manager_name || '담당 매니저 미입력'} / 챕터 {track.chapter_count}개 / {track.is_published ? '공개중' : '비공개'}</p>
        </div>
      </div>

      <nav className="workflowNav">
        <div className="workflowSectionLabel">작업 순서</div>
        <button className={tab === 'settings' ? 'workflowNavItem active' : 'workflowNavItem'} onClick={() => setTab('settings')}>
          <span className="workflowOrder">1.</span>
          <span className="workflowText">트랙 설정</span>
        </button>
        <button className={tab === 'upload' ? 'workflowNavItem active' : 'workflowNavItem'} onClick={() => setTab('upload')}>
          <span className="workflowOrder">2.</span>
          <span className="workflowText">CSV 파일 업로드</span>
        </button>

        <div className="workflowGroup">
          <div className="workflowGroupTitle"><span className="workflowOrder">3.</span><span className="workflowText">업로드 파일 수정</span></div>
          <button className={tab === 'tables' ? 'workflowSubItem active' : 'workflowSubItem'} onClick={() => setTab('tables')}>
            <span className="workflowOrder sub">3.1</span>
            <span className="workflowText">표 편집</span>
          </button>
          <button className={tab === 'letters' ? 'workflowSubItem active' : 'workflowSubItem'} onClick={() => setTab('letters')}>
            <span className="workflowOrder sub">3.2</span>
            <span className="workflowText">편지 개별 작성</span>
          </button>
        </div>

        <button className={tab === 'preview' ? 'workflowNavItem active' : 'workflowNavItem'} onClick={() => setTab('preview')}>
          <span className="workflowOrder">4.</span>
          <span className="workflowText">수강생 화면 미리보기</span>
        </button>
        <button className={tab === 'publish' ? 'workflowNavItem active' : 'workflowNavItem'} onClick={() => setTab('publish')}>
          <span className="workflowOrder">5.</span>
          <span className="workflowText">배포 관리</span>
        </button>
      </nav>
    </aside>

    <section className="mainPanel orderedMainPanel">
      <header className="orderedHeader orderedHeaderWithActions">
        <div>
          <div className="orderedEyebrow">퍼스널 리포트 워크스페이스</div>
          <h1>{activeTab.order} {activeTab.title}</h1>
          <p>{activeTab.description}</p>
        </div>
        {tab === 'preview' && <div className="headerActionGroup">
          <button onClick={() => copy(publicLinkFor(track))}>수강생 배포 링크 복사</button>
          <button onClick={() => window.location.hash = `#/report/${track.public_slug}`}>배포 페이지 보기</button>
        </div>}
      </header>

      <div className="workspaceContentCard orderedContentCard">
        {tab === 'settings' && <SettingsTab track={track} updateTrack={updateTrack} />}
        {tab === 'upload' && <UploadTab track={track} data={data} reload={loadAll} />}
        {tab === 'tables' && <TablesTab track={track} data={data} reload={loadAll} />}
        {tab === 'letters' && <LettersTab track={track} data={data} selectedStudent={selectedStudent} setSelectedStudentId={setSelectedStudentId} reload={loadAll} />}
        {tab === 'preview' && <PreviewTab track={track} data={data} selectedStudent={selectedStudent} setSelectedStudentId={setSelectedStudentId} />}
        {tab === 'publish' && <PublishTab track={track} updateTrack={updateTrack} data={data} />}
      </div>
    </section>
  </main>
}

function SettingsTab({ track, updateTrack }) {
  const [form, setForm] = useState(track)
  return <section><h1>트랙 설정</h1><div className="formGrid">
    <label>트랙명<input value={form.title || ''} onChange={e => setForm({ ...form, title: e.target.value })} /></label>
    <label>담당 매니저<input value={form.manager_name || ''} onChange={e => setForm({ ...form, manager_name: e.target.value })} /></label>
    <label>트랙 시작일<input type="date" value={form.start_date || ''} onChange={e => setForm({ ...form, start_date: e.target.value })} /></label>
    <label>트랙 종료일<input type="date" value={form.end_date || ''} onChange={e => setForm({ ...form, end_date: e.target.value })} /></label>
    <label>주말 및 공휴일 제외 전체 출결일수<input type="number" min="1" placeholder="예: 95" value={form.total_attendance_days || ''} onChange={e => setForm({ ...form, total_attendance_days: e.target.value ? Number(e.target.value) : '' })} /></label>
    <label>챕터 수<input type="number" min="1" max="20" value={form.chapter_count || 1} onChange={e => setForm({ ...form, chapter_count: Number(e.target.value) })} /></label>
    <label className="fullSpan">안내문구<textarea rows="4" value={form.guide_text || ''} onChange={e => setForm({ ...form, guide_text: e.target.value })} /></label>
  </div><button className="primary" onClick={() => updateTrack(form)}>저장</button></section>
}



function UploadTab({ track, reload }) {
  const studentFullHeader = [
    'name','password','attendance_days','is_public',
    ...chapterColumns(track.chapter_count).map(no => `챕터${no} 조`),
    'tutor_name','tutor_letter','manager_name','manager_letter',
    'certificate_url','award_type','award_url','award_phrase'
  ].join(',')
  const studentFullRow = [
    '김철수','960347','92','TRUE',
    ...chapterColumns(track.chapter_count).map(no => no),
    '김튜터','튜터 편지','이매니저','매니저 편지',
    'https://drive.google.com/sample-certificate','없음','','과정을 성실히 이수했습니다.'
  ].join(',')
  return <section className="uploadSection"><h1>CSV 업로드</h1><p className="muted">먼저 챕터 결과물과 기본 이미지를 등록하고, 변동이 잦은 수강생 종합 정보는 별도 영역에서 저장/덮어쓰기합니다.</p>
    <div className="uploadGrid uploadGridTop">
      <CsvBox title="챕터별 조 결과물 링크" sample={`chapter_no,team_no,project_title,result_url,image_url\n1,1,기초 프로젝트 1조,https://notion.so/,`} onRows={(rows) => importChapterResults(track, rows, reload)} />
      <CsvBox title="챕터 기본 이미지" sample={`chapter_no,chapter_name,default_image_url,default_description\n1,기초 프로젝트,https://example.com/image.png,이미지가 없을 때 표시됩니다.`} onRows={(rows) => importChapterDefaults(track, rows, reload)} />
    </div>
    <div className="uploadStudentBlock">
      <CsvBox title="수강생 종합 정보" featured sample={`${studentFullHeader}\n${studentFullRow}`} onRows={(rows) => importStudentFullInfo(track, rows, reload)} />
    </div>
  </section>
}

function CsvBox({ title, sample, onRows, featured = false }) {
  const [fileName, setFileName] = useState('')
  const [savedFileName, setSavedFileName] = useState('')
  const [pendingRows, setPendingRows] = useState(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const fileInputRef = useRef(null)

  const hasSavedFile = Boolean(savedFileName)
  const hasPendingFile = Boolean(fileName && pendingRows)
  const isSavedCurrentFile = hasSavedFile && fileName === savedFileName && !pendingRows
  const saveLabel = hasSavedFile ? '덮어쓰기' : '저장하기'

  function downloadSample() {
    const blob = new Blob(['\ufeff' + sample], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob); a.download = `${title}.csv`; a.click(); URL.revokeObjectURL(a.href)
  }

  function handleFile(file) {
    if (!file) return
    setFileName(file.name)
    setMessage('')
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: result => {
        setPendingRows(result.data || [])
        setMessage(hasSavedFile ? '새 파일을 선택했습니다. 덮어쓰기를 누르면 기존 값이 업데이트됩니다.' : '파일을 선택했습니다. 저장하기를 누르면 반영됩니다.')
      },
      error: error => {
        setPendingRows(null)
        setMessage(error.message || 'CSV 파일을 읽지 못했습니다.')
      }
    })
  }

  async function saveFile() {
    if (!pendingRows || !pendingRows.length) return alert('저장할 CSV 파일을 먼저 선택하세요.')
    setSaving(true)
    try {
      await onRows(pendingRows)
      setSavedFileName(fileName)
      setPendingRows(null)
      setMessage(hasSavedFile ? '기존 데이터를 새 파일 기준으로 덮어썼습니다.' : '파일을 저장했습니다.')
      if (fileInputRef.current) fileInputRef.current.value = ''
    } finally {
      setSaving(false)
    }
  }

  function clearFile() {
    setFileName('')
    setPendingRows(null)
    setMessage(hasSavedFile ? '저장된 파일이 있습니다. 새 파일을 선택하면 덮어쓸 수 있습니다.' : '')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const description = fileName
    ? (hasPendingFile
      ? (hasSavedFile ? '새 파일을 선택했습니다. 덮어쓰기를 누르면 기존 값을 업데이트합니다.' : '선택한 파일입니다. 저장하기를 누르면 업로드됩니다.')
      : '저장된 파일입니다. 다른 파일을 올리면 기존 값을 덮어쓸 수 있습니다.')
    : (hasSavedFile ? '저장된 파일이 있습니다. 새 파일을 선택하면 덮어쓸 수 있습니다.' : 'CSV 파일을 선택하세요.')

  return <article className={featured ? 'uploadBox uploadBoxFile uploadBoxFeatured' : 'uploadBox uploadBoxFile'}>
    <div className="uploadBoxHeader">
      <h3>{title}</h3>
      <button type="button" className="sampleDownloadTop" onClick={downloadSample}>양식 다운로드</button>
    </div>
    <input ref={fileInputRef} className="hiddenFileInput" type="file" accept=".csv" onChange={e => handleFile(e.target.files[0])} />
    {fileName ? <div className={hasPendingFile ? 'selectedFileCard pendingFileCard' : 'selectedFileCard savedFileCard'}>
      <span className="selectedFileIcon">📄</span>
      <span className="selectedFileName">{fileName}</span>
      {hasPendingFile ? <span className="fileStatusBadge">저장 전</span> : <span className="fileStatusBadge saved">저장됨</span>}
      <button type="button" className="selectedFileRemove" onClick={clearFile} aria-label="파일 선택 해제">×</button>
    </div> : <button type="button" className="fileAttachBox" onClick={() => fileInputRef.current?.click()}>
      <span>📎</span>
      <b>파일 첨부</b>
      <small>{hasSavedFile ? `${savedFileName} 저장됨` : 'CSV 파일을 선택해주세요.'}</small>
    </button>}
    <div className="uploadBoxActions">
      <button type="button" className={hasPendingFile ? 'primary uploadSaveBtn' : 'uploadSaveBtn'} disabled={!hasPendingFile || saving} onClick={saveFile}>{saving ? '저장 중' : saveLabel}</button>
      <button type="button" onClick={() => fileInputRef.current?.click()}>{hasSavedFile ? '다른 파일 올리기' : '파일 선택'}</button>
    </div>
    {message && <p className="uploadInlineNotice">{message}</p>}
  </article>
}

async function importStudentFullInfo(track, rows, reload) {
  const studentPayload = rows.map((row, idx) => ({
    track_id: track.id,
    name: clean(pick(row, ['name', '이름'])),
    password: clean(pick(row, ['password', '비밀번호', 'birth6'])),
    attendance_days: Number(pick(row, ['attendance_days', '출결일']) || 0),
    is_public: clean(pick(row, ['is_public', '공개상태'])).toLowerCase() !== 'false',
    sort_order: idx
  })).filter(row => row.name && row.password)

  if (!studentPayload.length) return alert('업로드할 수강생 데이터가 없습니다.')

  const { data: savedStudents, error: studentError } = await supabase
    .from('students')
    .upsert(studentPayload, { onConflict: 'track_id,name' })
    .select('*')

  if (studentError) return alert(studentError.message)

  const students = savedStudents || []
  const teamPayload = []
  const letterPayload = []

  for (const row of rows) {
    const name = clean(pick(row, ['name', '이름']))
    const student = students.find(s => s.name === name)
    if (!student) continue

    for (const no of chapterColumns(track.chapter_count)) {
      const value = pick(row, [`chapter${no}_team`, `챕터${no} 조`, `챕터${no}조`, `${no}챕터 조`])
      if (clean(value)) teamPayload.push({ track_id: track.id, student_id: student.id, chapter_no: no, team_no: clean(value) })
    }

    const letterData = {
      track_id: track.id,
      student_id: student.id,
      tutor_name: pick(row, ['tutor_name', '튜터 이름', '튜터명', '편지쓴 튜터']),
      tutor_letter: pick(row, ['tutor_letter', '튜터 편지']),
      manager_name: pick(row, ['letter_manager_name', 'manager_name', '매니저 이름', '매니저명', '편지쓴 매니저']),
      manager_letter: pick(row, ['manager_letter', '매니저 편지']),
      certificate_url: pick(row, ['certificate_url', '수료증 링크']),
      award_type: pick(row, ['award_type', '상장 종류']) || '없음',
      award_url: pick(row, ['award_url', '상장 링크']),
      award_phrase: pick(row, ['award_phrase', '상장 문구'])
    }
    letterPayload.push(letterData)
  }

  if (teamPayload.length) {
    const { error: teamError } = await supabase.from('student_chapter_teams').upsert(teamPayload, { onConflict: 'student_id,chapter_no' })
    if (teamError) return alert(teamError.message)
  }

  if (letterPayload.length) {
    const { error: letterError } = await supabase.from('letters_awards').upsert(letterPayload, { onConflict: 'track_id,student_id' })
    if (letterError) return alert(letterError.message)
  }

  reload()
}

async function importStudentsWithTeams(track, rows, reload) {
  const studentPayload = rows.map((row, idx) => ({
    track_id: track.id,
    name: clean(pick(row, ['name', '이름'])),
    password: clean(pick(row, ['password', '비밀번호', 'birth6'])),
    attendance_days: Number(pick(row, ['attendance_days', '출결일']) || 0),
    is_public: clean(pick(row, ['is_public', '공개상태'])).toLowerCase() !== 'false',
    sort_order: idx
  })).filter(row => row.name && row.password)

  if (!studentPayload.length) return alert('업로드할 수강생 데이터가 없습니다.')

  const { data: savedStudents, error: studentError } = await supabase
    .from('students')
    .upsert(studentPayload, { onConflict: 'track_id,name' })
    .select('*')

  if (studentError) return alert(studentError.message)

  const students = savedStudents || []
  const teamPayload = []

  for (const row of rows) {
    const name = clean(pick(row, ['name', '이름']))
    const student = students.find(s => s.name === name)
    if (!student) continue

    for (const no of chapterColumns(track.chapter_count)) {
      const value = pick(row, [`chapter${no}_team`, `챕터${no} 조`, `챕터${no}조`, `${no}챕터 조`])
      if (clean(value)) teamPayload.push({
        track_id: track.id,
        student_id: student.id,
        chapter_no: no,
        team_no: clean(value)
      })
    }
  }

  if (teamPayload.length) {
    const { error: teamError } = await supabase
      .from('student_chapter_teams')
      .upsert(teamPayload, { onConflict: 'student_id,chapter_no' })
    if (teamError) return alert(teamError.message)
  }

  reload()
}

async function importStudents(track, rows, reload) {
  const payload = rows.map((row, idx) => ({ track_id: track.id, name: clean(pick(row, ['name', '이름'])), password: clean(pick(row, ['password', '비밀번호', 'birth6'])), attendance_days: Number(pick(row, ['attendance_days', '출결일']) || 0), is_public: clean(pick(row, ['is_public', '공개상태'])).toLowerCase() !== 'false', sort_order: idx })).filter(row => row.name && row.password)
  const { error } = await supabase.from('students').upsert(payload, { onConflict: 'track_id,name' })
  if (error) alert(error.message); else reload()
}

async function importStudentTeams(track, rows, reload) {
  const { data: students } = await supabase.from('students').select('*').eq('track_id', track.id)
  const payload = []
  for (const row of rows) {
    const name = clean(pick(row, ['name', '이름']))
    const student = students?.find(s => s.name === name)
    if (!student) continue
    for (const no of chapterColumns(track.chapter_count)) {
      const value = pick(row, [`chapter${no}_team`, `챕터${no} 조`, `챕터${no}조`, `${no}챕터 조`])
      if (clean(value)) payload.push({ track_id: track.id, student_id: student.id, chapter_no: no, team_no: clean(value) })
    }
  }
  const { error } = await supabase.from('student_chapter_teams').upsert(payload, { onConflict: 'student_id,chapter_no' })
  if (error) alert(error.message); else reload()
}

async function importChapterResults(track, rows, reload) {
  const payload = rows.map(row => ({ track_id: track.id, chapter_no: Number(pick(row, ['chapter_no', '챕터'])), team_no: clean(pick(row, ['team_no', '조'])), project_title: pick(row, ['project_title', '프로젝트명']), result_url: pick(row, ['result_url', '결과물 링크']), image_url: pick(row, ['image_url', '결과물 이미지URL']) })).filter(row => row.chapter_no && row.team_no)
  const { error } = await supabase.from('chapter_results').upsert(payload, { onConflict: 'track_id,chapter_no,team_no' })
  if (error) alert(error.message); else reload()
}

async function importChapterDefaults(track, rows, reload) {
  const payload = rows.map(row => ({ track_id: track.id, chapter_no: Number(pick(row, ['chapter_no', '챕터'])), chapter_name: pick(row, ['chapter_name', '챕터명']), default_image_url: pick(row, ['default_image_url', '기본 이미지URL']), default_description: pick(row, ['default_description', '기본 설명문구']) })).filter(row => row.chapter_no)
  const { error } = await supabase.from('chapter_defaults').upsert(payload, { onConflict: 'track_id,chapter_no' })
  if (error) alert(error.message); else reload()
}

async function importLettersAwards(track, rows, reload) {
  const { data: students } = await supabase.from('students').select('*').eq('track_id', track.id)
  const payload = []
  for (const row of rows) {
    const student = students?.find(s => s.name === clean(pick(row, ['name', '이름'])))
    if (!student) continue
    payload.push({ track_id: track.id, student_id: student.id, tutor_name: pick(row, ['tutor_name', '튜터 이름', '튜터명', '편지쓴 튜터']), tutor_letter: pick(row, ['tutor_letter', '튜터 편지']), manager_name: pick(row, ['letter_manager_name', 'manager_name', '매니저 이름', '매니저명', '편지쓴 매니저']), manager_letter: pick(row, ['manager_letter', '매니저 편지']), certificate_url: pick(row, ['certificate_url', '수료증 링크']), award_type: pick(row, ['award_type', '상장 종류']) || '없음', award_url: pick(row, ['award_url', '상장 링크']), award_phrase: pick(row, ['award_phrase', '상장 문구']) })
  }
  const { error } = await supabase.from('letters_awards').upsert(payload, { onConflict: 'track_id,student_id' })
  if (error) alert(error.message); else reload()
}




function TablesTab({ track, data, reload }) {
  const [table, setTable] = useState('students')
  const [studentSearch, setStudentSearch] = useState('')
  const tableTabs = [
    { key: 'students', label: '수강생 종합 정보', count: data.students.length, hint: '수강생·조·편지·수료증' },
    { key: 'results', label: '조 결과물', count: data.chapterResults.length, hint: '챕터별 조 결과 링크' },
    { key: 'defaults', label: '챕터 기본 이미지', count: data.chapterDefaults.length, hint: '챕터명·기본 이미지' },
  ]
  const active = tableTabs.find(item => item.key === table) || tableTabs[0]

  function runStudentAction(action) {
    window.dispatchEvent(new CustomEvent('student-table-action', { detail: action }))
  }

  return <section className="dbTableSection">
    <div className="dbTabBar compactDbTabBar" role="tablist" aria-label="표 편집 테이블 선택">
      {tableTabs.map(item => <button
        key={item.key}
        type="button"
        role="tab"
        aria-selected={table === item.key}
        className={table === item.key ? 'dbTab active' : 'dbTab'}
        onClick={() => setTable(item.key)}>
        <span className="dbTabIcon">▦</span>
        <span className="dbTabTexts"><strong>{item.label}</strong></span>
      </button>)}
    </div>

    <div className="dbToolbar">
      <label className="dbFilterBox dbSearchBox">
        <span>⌕</span>
        <input
          value={studentSearch}
          onChange={e => setStudentSearch(e.target.value)}
          placeholder={table === 'students' ? '수강생 이름 검색' : `${active.label} 검색`}
        />
      </label>
      <div className="dbToolbarActions">
        {table === 'students' ? <>
          <button type="button" className="dbInsertBtn" onClick={() => runStudentAction('add')}>수강생 추가</button>
          <button type="button" onClick={() => runStudentAction('deleteSelected')}>선택 삭제</button>
          <button type="button" className="dbDangerBtn" onClick={() => runStudentAction('deleteAll')}>전체 삭제</button>
        </> : <>
          <button type="button">Sort</button>
          <button type="button" className="dbInsertBtn">Insert</button>
        </>}
      </div>
    </div>

    <div className="dbTableMeta">
      <div><h2>{active.label}</h2><p>{active.hint}</p></div>
      <span>{active.count} records</span>
    </div>

    {table === 'students' && <StudentCombinedTable track={track} data={data} reload={reload} searchQuery={studentSearch} />}
    {table === 'results' && <EditableTable track={track} rows={data.chapterResults} cols={['chapter_no','team_no','project_title','result_url','image_url']} table="chapter_results" reload={reload} />}
    {table === 'defaults' && <EditableTable track={track} rows={data.chapterDefaults} cols={['chapter_no','chapter_name','default_image_url','default_description']} table="chapter_defaults" reload={reload} />}
  </section>
}

function StudentCombinedTable({ track, data, reload, searchQuery = '' }) {
  const [selectedIds, setSelectedIds] = useState([])
  const displayedStudents = data.students.filter(student => !clean(searchQuery) || clean(student.name).toLowerCase().includes(clean(searchQuery).toLowerCase()))
  const allSelected = displayedStudents.length > 0 && displayedStudents.every(student => selectedIds.includes(student.id))

  function toggleAll() { setSelectedIds(allSelected ? selectedIds.filter(id => !displayedStudents.some(student => student.id === id)) : Array.from(new Set([...selectedIds, ...displayedStudents.map(student => student.id)]))) }
  function toggleRow(id) { setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]) }

  async function saveStudent(id, key, value) {
    const normalized = key === 'is_public' ? clean(value).toLowerCase() !== 'false' : key === 'attendance_days' || key === 'sort_order' ? Number(value || 0) : value
    const { error } = await supabase.from('students').update({ [key]: normalized }).eq('id', id)
    if (error) alert(error.message); else reload()
  }

  async function saveTeam(student, chapterNo, value) {
    const payload = { track_id: track.id, student_id: student.id, chapter_no: chapterNo, team_no: value }
    const { error } = await supabase.from('student_chapter_teams').upsert(payload, { onConflict: 'student_id,chapter_no' })
    if (error) alert(error.message); else reload()
  }

  async function saveLetter(student, key, value) {
    const current = data.lettersAwards.find(x => x.student_id === student.id) || {}
    const payload = { ...current, track_id: track.id, student_id: student.id, [key]: value }
    const { error } = await supabase.from('letters_awards').upsert(payload, { onConflict: 'track_id,student_id' })
    if (error) alert(error.message); else reload()
  }

  async function addStudent() {
    const next = data.students.length + 1
    const { error } = await supabase.from('students').insert({ track_id: track.id, name: `새 수강생 ${next}`, password: '000000', attendance_days: 0, is_public: true, sort_order: data.students.length })
    if (error) alert(error.message); else reload()
  }

  async function deleteSelected() {
    if (!selectedIds.length) return alert('삭제할 수강생을 선택하세요.')
    if (!confirm(`${selectedIds.length}명의 수강생을 삭제할까요? 조 정보, 편지, 수료증/상장 정보도 함께 삭제됩니다.`)) return
    const { error } = await supabase.from('students').delete().in('id', selectedIds)
    if (error) alert(error.message); else { setSelectedIds([]); reload() }
  }

  async function deleteAll() {
    if (!data.students.length) return
    if (!confirm(`현재 트랙의 수강생 ${data.students.length}명을 전체 삭제할까요? 조 정보, 편지, 수료증/상장 정보도 함께 삭제됩니다.`)) return
    const { error } = await supabase.from('students').delete().eq('track_id', track.id)
    if (error) alert(error.message); else { setSelectedIds([]); reload() }
  }

  useEffect(() => {
    function handleAction(event) {
      if (event.detail === 'add') addStudent()
      if (event.detail === 'deleteSelected') deleteSelected()
      if (event.detail === 'deleteAll') deleteAll()
    }
    window.addEventListener('student-table-action', handleAction)
    return () => window.removeEventListener('student-table-action', handleAction)
  }, [selectedIds, data.students])

  return <div>
    <div className="tableActions compactTableNotice">
      <span>{selectedIds.length}명 선택됨</span><span className="muted">챕터 칸은 트랙 설정의 챕터 수를 늘리면 자동 추가됩니다.</span>
    </div>
    <div className="tableWrap combinedTable"><table>
      <thead><tr><th className="selectCol"><input type="checkbox" checked={allSelected} onChange={toggleAll} /></th><th>이름</th><th>비밀번호</th><th>출결일</th><th>공개상태</th>{chapterColumns(track.chapter_count).map(no => <th key={no}>챕터{no} 조</th>)}<th>튜터 이름</th><th>튜터 편지</th><th>매니저 이름</th><th>매니저 편지</th><th>수료증 링크</th><th>상장 종류</th><th>상장 링크</th><th>상장 문구</th></tr></thead>
      <tbody>{displayedStudents.map(student => <tr key={student.id} className={selectedIds.includes(student.id) ? 'selectedRow' : ''}>
        <td className="selectCol"><input type="checkbox" checked={selectedIds.includes(student.id)} onChange={() => toggleRow(student.id)} /></td>
        <td><input defaultValue={student.name || ''} onBlur={e => saveStudent(student.id, 'name', e.target.value)} /></td>
        <td><input defaultValue={student.password || ''} onBlur={e => saveStudent(student.id, 'password', e.target.value)} /></td>
        <td><input defaultValue={student.attendance_days ?? ''} onBlur={e => saveStudent(student.id, 'attendance_days', e.target.value)} /></td>
        <td><input defaultValue={String(student.is_public ?? true)} onBlur={e => saveStudent(student.id, 'is_public', e.target.value)} /></td>
        {chapterColumns(track.chapter_count).map(no => { const current = data.studentTeams.find(x => x.student_id === student.id && Number(x.chapter_no) === no)?.team_no || ''; return <td key={no}><input defaultValue={current} onBlur={e => saveTeam(student, no, e.target.value)} /></td> })}
        {(() => { const letter = data.lettersAwards.find(x => x.student_id === student.id) || {}; return <>
          <td><input defaultValue={letter.tutor_name || ''} onBlur={e => saveLetter(student, 'tutor_name', e.target.value)} /></td>
          <td><textarea rows="2" defaultValue={letter.tutor_letter || ''} onBlur={e => saveLetter(student, 'tutor_letter', e.target.value)} /></td>
          <td><input defaultValue={letter.manager_name || ''} onBlur={e => saveLetter(student, 'manager_name', e.target.value)} /></td>
          <td><textarea rows="2" defaultValue={letter.manager_letter || ''} onBlur={e => saveLetter(student, 'manager_letter', e.target.value)} /></td>
          <td><input defaultValue={letter.certificate_url || ''} onBlur={e => saveLetter(student, 'certificate_url', e.target.value)} /></td>
          <td><input defaultValue={letter.award_type || '없음'} onBlur={e => saveLetter(student, 'award_type', e.target.value || '없음')} /></td>
          <td><input defaultValue={letter.award_url || ''} onBlur={e => saveLetter(student, 'award_url', e.target.value)} /></td>
          <td><textarea rows="2" defaultValue={letter.award_phrase || ''} onBlur={e => saveLetter(student, 'award_phrase', e.target.value)} /></td>
        </> })()}
      </tr>)}</tbody>
    </table></div>
  </div>
}

function blankRowFor(table, rows, track) {
  const nextNo = Math.max(0, ...rows.map(row => Number(row.chapter_no || 0))) + 1
  if (table === 'chapter_results') return { track_id: track.id, chapter_no: 1, team_no: `새 조 ${Date.now().toString().slice(-4)}`, project_title: '새 프로젝트', result_url: '', image_url: '' }
  if (table === 'chapter_defaults') return { track_id: track.id, chapter_no: nextNo, chapter_name: `챕터 ${nextNo}`, default_image_url: '', default_description: '' }
  return { track_id: track.id }
}

function EditableTable({ track, rows, cols, table, reload }) {
  const [selectedIds, setSelectedIds] = useState([])
  const allSelected = rows.length > 0 && selectedIds.length === rows.length
  function toggleAll() { setSelectedIds(allSelected ? [] : rows.map(row => row.id)) }
  function toggleRow(id) { setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]) }
  async function save(id, key, value) {
    const normalized = key.includes('days') || key.includes('_no') || key === 'sort_order' ? Number(value || 0) : value
    const { error } = await supabase.from(table).update({ [key]: normalized }).eq('id', id)
    if (error) alert(error.message); else reload()
  }
  async function addRow() { const { error } = await supabase.from(table).insert(blankRowFor(table, rows, track)); if (error) alert(error.message); else reload() }
  async function deleteRows(ids) { if (!ids.length) return alert('삭제할 행을 선택하세요.'); if (!confirm(`${ids.length}개 행을 삭제할까요?`)) return; const { error } = await supabase.from(table).delete().in('id', ids); if (error) alert(error.message); else { setSelectedIds([]); reload() } }
  async function deleteAll() { if (!rows.length) return; if (!confirm(`현재 표의 ${rows.length}개 행을 전체 삭제할까요?`)) return; const { error } = await supabase.from(table).delete().eq('track_id', track.id); if (error) alert(error.message); else { setSelectedIds([]); reload() } }
  return <div><div className="tableActions"><button onClick={addRow}>행/셀 추가</button><button onClick={() => deleteRows(selectedIds)}>선택 삭제</button><button onClick={deleteAll}>전체 삭제</button><span>{selectedIds.length}개 선택됨</span></div><div className="tableWrap"><table><thead><tr><th className="selectCol"><input type="checkbox" checked={allSelected} onChange={toggleAll} /></th>{cols.map(c => <th key={c}>{c}</th>)}</tr></thead><tbody>{rows.map(row => <tr key={row.id} className={selectedIds.includes(row.id) ? 'selectedRow' : ''}><td className="selectCol"><input type="checkbox" checked={selectedIds.includes(row.id)} onChange={() => toggleRow(row.id)} /></td>{cols.map(col => <td key={col}><input defaultValue={row[col] ?? ''} onBlur={e => save(row.id, col, e.target.value)} /></td>)}</tr>)}</tbody></table></div></div>
}

function LettersTab({ track, data, selectedStudent, setSelectedStudentId, reload }) {
  const current = data.lettersAwards.find(x => x.student_id === selectedStudent?.id) || {}
  const [form, setForm] = useState(current)
  useEffect(() => setForm(current), [selectedStudent?.id, current?.id])
  async function save() {
    if (!selectedStudent) return
    const payload = { ...form, track_id: track.id, student_id: selectedStudent.id }
    const { error } = await supabase.from('letters_awards').upsert(payload, { onConflict: 'track_id,student_id' })
    if (error) alert(error.message); else reload()
  }
  return <section><h1>편지/수료증/상장</h1><div className="split"><StudentList students={data.students} selectedStudent={selectedStudent} setSelectedStudentId={setSelectedStudentId} /><div className="editor"><h2>{selectedStudent?.name || '수강생 선택'}</h2><label>튜터 이름<input placeholder="예: 김튜터" value={form.tutor_name || ''} onChange={e => setForm({ ...form, tutor_name: e.target.value })} /></label><label>튜터 편지<textarea rows="8" value={form.tutor_letter || ''} onChange={e => setForm({ ...form, tutor_letter: e.target.value })} /></label><label>매니저 이름<input placeholder="예: 이매니저" value={form.manager_name || ''} onChange={e => setForm({ ...form, manager_name: e.target.value })} /></label><label>매니저 편지<textarea rows="8" value={form.manager_letter || ''} onChange={e => setForm({ ...form, manager_letter: e.target.value })} /></label><label>수료증 링크<input value={form.certificate_url || ''} onChange={e => setForm({ ...form, certificate_url: e.target.value })} /></label><label>상장 종류<select value={form.award_type || '없음'} onChange={e => setForm({ ...form, award_type: e.target.value })}><option>없음</option><option>우수상</option><option>최우수상</option><option>모범상</option><option>특별상</option></select></label><label>상장 링크<input value={form.award_url || ''} onChange={e => setForm({ ...form, award_url: e.target.value })} /></label><label>상장 문구<textarea rows="4" value={form.award_phrase || ''} onChange={e => setForm({ ...form, award_phrase: e.target.value })} /></label><button className="primary" onClick={save}>저장</button></div></div></section>
}

function PreviewTab({ track, data, selectedStudent, setSelectedStudentId }) {
  return <section className="previewOnlySection"><div className="split"><StudentList students={data.students} selectedStudent={selectedStudent} setSelectedStudentId={setSelectedStudentId} /><ReportView track={track} data={data} student={selectedStudent} /></div></section>
}

function StudentList({ students, selectedStudent, setSelectedStudentId }) {
  return <div className="studentList studentListTable">
    <div className="studentListHead">이름</div>
    <div className="studentListRows">
      {students.map(s => <button key={s.id} className={selectedStudent?.id === s.id ? 'active' : ''} onClick={() => setSelectedStudentId(s.id)}>
        <span>{s.name}</span>
      </button>)}
    </div>
  </div>
}

function PublishTab({ track, updateTrack, data }) {
  const link = publicLinkFor(track)
  return <section><h1>배포 관리</h1><div className="publishBox"><p>수강생은 아래 배포 링크에서 이름과 비밀번호를 입력해 본인 리포트만 확인합니다.</p><input readOnly value={link} /><div className="rowButtons publishActions"><button onClick={() => copy(link)}>수강생 배포 링크 복사</button><button onClick={() => window.location.hash = `#/report/${track.public_slug}`}>배포 페이지 보기</button><button className="primary" onClick={() => updateTrack({ is_published: !track.is_published })}>{track.is_published ? '비공개로 전환' : '공개로 전환'}</button></div><p className="muted">등록 수강생 {data.students.length}명</p></div></section>
}



function downloadReportPdf() {
  window.print()
}

function awardDownloadLabel(letterAward) {
  const type = clean(letterAward?.award_type)
  if (!type || type === '없음' || type === '수료') return '상장 다운로드'
  return `${type} 다운로드`
}


function formatDateLabel(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`
}

function weekdaysBetween(startDate, endDate) {
  if (!startDate || !endDate) return null
  const start = new Date(startDate)
  const end = new Date(endDate)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return null
  let count = 0
  const current = new Date(start)
  while (current <= end) {
    const day = current.getDay()
    if (day !== 0 && day !== 6) count += 1
    current.setDate(current.getDate() + 1)
  }
  return count
}

function attendanceMeta(track, student) {
  const days = Number(student?.attendance_days || 0)
  const manualTotal = Number(track?.total_attendance_days || 0)
  const autoTotal = weekdaysBetween(track?.start_date, track?.end_date)
  const total = manualTotal || autoTotal
  const percent = total ? Math.min(100, Math.round((days / total) * 100)) : null
  return { days, total, percent, period: track?.start_date && track?.end_date ? `${formatDateLabel(track.start_date)} - ${formatDateLabel(track.end_date)}` : '', source: manualTotal ? 'manual' : (autoTotal ? 'auto' : '') }
}

function hasText(value) {
  return clean(value).length > 0
}

function ReportView({ track, data, student }) {
  const letterAward = data.lettersAwards.find(x => x.student_id === student?.id) || {}
  const chapters = useMemo(() => reportChapters(track, data, student), [track, data, student])
  const visibleChapters = chapters.filter(ch => hasText(ch.teamNo) || hasText(ch.projectTitle) || hasText(ch.resultUrl) || hasText(ch.imageUrl))
  const attendance = attendanceMeta(track, student)
  if (!student) return <div className="reportPaper"><p>수강생을 먼저 등록하세요.</p></div>

  const hasAttendance = attendance.days > 0 || attendance.total
  const hasTutor = hasText(letterAward.tutor_name) || hasText(letterAward.tutor_letter)
  const hasManager = hasText(letterAward.manager_name) || hasText(letterAward.manager_letter)
  const hasCertificate = hasText(letterAward.certificate_url)
  const hasAward = hasText(letterAward.award_url) || (hasText(letterAward.award_type) && letterAward.award_type !== '없음' && letterAward.award_type !== '수료') || hasText(letterAward.award_phrase)
  const resultLabel = hasText(letterAward.award_type) && letterAward.award_type !== '없음' ? letterAward.award_type : (hasCertificate ? '수료' : '')

  return <article className="reportPaper fancyPaper">
    <div className="reportHero reportHeroPretty">
      <div className="reportHeroText">
        <div className="heroTopline">✨ Personal Report</div>
        <h2>{student.name}님의 성장 리포트</h2>
        <p className="heroSubtitle">{track.title || '퍼스널 리포트'}{track.manager_name ? ` · ${track.manager_name} 매니저` : ''}</p>
        <div className="heroBadgeRow">
          <span className="heroBadge">🌱 과정 완주 리포트</span>
          {resultLabel && <span className="heroBadge">🏁 {resultLabel}</span>}
        </div>
      </div>
      <img className="reportHeroFlag" src="/finish-flag.png" alt="" />
    </div>

    {hasAttendance && <section className="attendCard attendCardMinimal">
      <div className="sectionTitle"><span>📈</span><h3>출결 현황</h3></div>
      <div className="attendMinimalTop">
        <div className="attendMinimalLead">
          <div className="attendMinimalText attendCleanText">
            {attendance.total ? <>
              <strong>출석 {attendance.days}일 / 전체 {attendance.total}일</strong>
              {attendance.period && <span>{attendance.period}</span>}
            </> : <strong>출석 {attendance.days}일</strong>}
          </div>
        </div>
      </div>
      {attendance.total ? <>
        <div className="progressTrack minimalTrack"><div className="progressFill" style={{ width: `${attendance.percent}%` }} /></div>
        <div className="progressMeta minimalMeta"><span>0일</span><span>전체 {attendance.total}일</span></div>
      </> : <div className="progressTrack minimalTrack"><div className="progressFill" style={{ width: '100%' }} /></div>}
    </section>}

    {visibleChapters.length > 0 && <section>
      <div className="sectionTitle"><span>🗂</span><h3>챕터별 결과물</h3></div>
      <div className="chapterGrid prettyChapterGrid">{visibleChapters.map(ch => <a key={ch.chapterNo} href={ch.resultUrl || '#'} target="_blank" className="chapterCard prettyChapterCard">
        {ch.imageUrl && <div className="thumb prettyThumb"><img src={ch.imageUrl} alt="" /></div>}
        <div className="chapterMeta"><em>Chapter {ch.chapterNo}</em>{ch.chapterName && <b>{ch.chapterName}</b>}{(ch.teamNo || ch.projectTitle) && <p>{ch.teamNo ? `${ch.teamNo}조` : ''}{ch.teamNo && ch.projectTitle ? ' · ' : ''}{ch.projectTitle || ''}</p>}</div>
      </a>)}</div>
    </section>}

    {hasTutor && <section>
      <div className="sectionTitle letterTitle"><span>💌</span><h3>튜터 한마디</h3>{letterAward.tutor_name && <em>{letterAward.tutor_name} 튜터</em>}</div>
      {letterAward.tutor_letter && <p className="letter prettyLetter">{letterAward.tutor_letter}</p>}
    </section>}

    {hasManager && <section>
      <div className="sectionTitle letterTitle"><span>🌷</span><h3>매니저 한마디</h3>{letterAward.manager_name && <em>{letterAward.manager_name} 매니저</em>}</div>
      {letterAward.manager_letter && <p className="letter prettyLetter">{letterAward.manager_letter}</p>}
    </section>}

    <div className="rowButtons actionRow"><button className="blackBtn pdfBtn" onClick={downloadReportPdf}>퍼스널 리포트 PDF 다운로드</button>{letterAward.certificate_url && <a className="blackBtn" href={letterAward.certificate_url} target="_blank">수료증 다운로드</a>}{letterAward.award_url && <a className="blackBtn" href={letterAward.award_url} target="_blank">{awardDownloadLabel(letterAward)}</a>}</div>
  </article>
}

function StudentReportPage({ slug }) {
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [payload, setPayload] = useState(null)
  const [message, setMessage] = useState('')
  async function submit() {
    setMessage('')
    const { data, error } = await supabase.rpc('get_public_report', { p_slug: slug, p_name: name, p_password: password })
    if (error) return setMessage(error.message)
    if (!data?.ok) return setMessage(data?.message || '리포트를 찾을 수 없습니다.')
    setPayload(data)
  }
  if (payload?.ok) {
    const track = payload.track
    const data = { students: [payload.student], studentTeams: payload.chapterTeams, chapterResults: payload.chapterResults, chapterDefaults: payload.chapterDefaults, lettersAwards: [payload.letterAward] }
    return <main className="publicPage"><ReportView track={track} data={data} student={payload.student} /></main>
  }
  return <main className="publicPage"><section className="loginReport"><div className="logo">✦</div><h1>퍼스널 리포트</h1><p className="loginReportGuide"><span>이름과 비밀번호를 입력해주세요.</span><span className="noWrapGuide">비밀번호는 생년월일 6자리 + 주민번호 첫자리, 총 7글자를 입력해주세요.</span></p><input placeholder="이름" value={name} onChange={e => setName(e.target.value)} /><input placeholder="비밀번호" type="password" value={password} onChange={e => setPassword(e.target.value)} /><button className="primary wide" onClick={submit}>확인하기</button>{message && <p className="notice">{message}</p>}</section></main>
}

function copy(text) {
  navigator.clipboard.writeText(text)
  alert('복사했습니다.')
}

createRoot(document.getElementById('root')).render(<App />)
