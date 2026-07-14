import { createClient } from '@supabase/supabase-js'

const runtimeEnv = typeof window !== 'undefined' ? (window.__ENV__ || {}) : {}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || runtimeEnv.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || runtimeEnv.VITE_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const emptyData = {
  students: [],
  studentTeams: [],
  chapterResults: [],
  chapterDefaults: [],
  lettersAwards: []
}

export function clean(value) {
  return String(value ?? '').trim()
}

export function pick(row, keys) {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') return row[key]
  }
  return ''
}

export function publicLinkFor(track) {
  return `${window.location.origin}${window.location.pathname}#/report/${track.public_slug}`
}

export function chapterColumns(count) {
  return Array.from({ length: Number(count || 0) }, (_, i) => i + 1)
}

export function findResultFor(chapterResults, chapterNo, teamNo) {
  return chapterResults.find(row => Number(row.chapter_no) === Number(chapterNo) && clean(row.team_no) === clean(teamNo))
}

export function findDefaultFor(chapterDefaults, chapterNo) {
  return chapterDefaults.find(row => Number(row.chapter_no) === Number(chapterNo))
}

export function reportChapters(track, data, student) {
  if (!student) return []
  return chapterColumns(track.chapter_count).map((chapterNo) => {
    const team = data.studentTeams.find(row => row.student_id === student.id && Number(row.chapter_no) === chapterNo)
    const result = findResultFor(data.chapterResults, chapterNo, team?.team_no)
    const fallback = findDefaultFor(data.chapterDefaults, chapterNo)
    return {
      chapterNo,
      teamNo: team?.team_no || '',
      chapterName: fallback?.chapter_name || `챕터 ${chapterNo}`,
      projectTitle: result?.project_title || fallback?.chapter_name || `챕터 ${chapterNo} 결과물`,
      resultUrl: result?.result_url || '',
      imageUrl: result?.image_url || fallback?.default_image_url || '',
      description: fallback?.default_description || ''
    }
  })
}
