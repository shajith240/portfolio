// Profile facts as plain typed constants, so non-page code (e.g. the
// mascot's knowledge pack in lib/mascotKnowledge.ts) can import them.
//
// SOURCE OF TRUTH for the pages that read from here:
//   app/about/page.tsx                 NAME, HEADLINE, LOCATION, BIO,
//                                      ABOUT_PROJECTS, EMAIL, SOCIALS, RESUME_URL
//   app/education/page.tsx             EDUCATION
//   app/achievements/page.tsx          ACHIEVEMENTS
// Edit these here and the pages and the mascot stay in agreement.
// (The About page bolds "IIT(ISM) Dhanbad." in the first BIO paragraph
// itself; BIO stays plain text.)
//
// STILL A MIRROR (kept in sync by hand) for widgets that render inline:
//   components/widgets/LocationWidget  city, region, time zone
//
// Extracted, not invented: empty fields stay empty. Don't fill gaps here
// with guesses.

export interface SocialLink {
  label: string
  url: string
}

/** An image shipped in public/, with its intrinsic size for layout. */
export interface EducationImage {
  src: string
  alt: string
  width?: number
  height?: number
  /** Short on-image label, e.g. what building a photo shows. */
  caption?: string
}

/** Attribution for a third-party photo, as its licence asks for. */
export interface PhotoCredit {
  /** What the photo shows, e.g. "Heritage Building". */
  title: string
  author: string
  authorUrl?: string
  license: string
  licenseUrl?: string
  /** The file's page on the host (e.g. Wikimedia Commons). */
  sourceUrl: string
  /** Host name shown after "via", e.g. "Wikimedia Commons". */
  via?: string
}

/** A stretch between two schools that isn't a school itself, e.g. a
 *  preparation year. Shown on the timeline so the gap isn't a mystery. */
export interface EducationBreak {
  period: string
  label: string
  note?: string
}

export interface EducationEntry {
  institution: string
  degree: string
  /** Timeline eyebrow, e.g. "Undergraduate" or "Class 10". */
  level?: string
  /** Examining board, for school entries. */
  board?: string
  /** Headline result, e.g. "94.9%". Empty = not shown. */
  score?: string
  /** What the score is out of, e.g. "949 / 1000". */
  scoreDetail?: string
  /** A break that came right before this entry (shown under it). */
  precededBy?: EducationBreak
  /** Empty until a real period is provided — see app/education/page.tsx TODO. */
  period: string
  /** GPA, honours, etc. Empty = nothing verified to show. */
  details: string[]
  /** "City, State, Country". */
  location?: string
  /** Official website. */
  url?: string
  logo?: EducationImage
  photo?: EducationImage
  photoCredit?: PhotoCredit
  /** Courses actually taken. Leave empty rather than guess. */
  coursework?: string[]
}

export interface Achievement {
  title: string
  org: string
  date: string
  description: string
}

/** A project named in the About page's "Some things I've built" list. */
export interface AboutProjectMention {
  name: string
  blurb: string
}

export const NAME = 'Shajith Bathina'

/** GitHub / LeetCode / LinkedIn handle. */
export const HANDLE = 'shajith240'

/** About page, under the name. */
export const HEADLINE = 'CS Student at IIT(ISM) Dhanbad'

/** One-line pitch (the mascot's knowledge pack). */
export const TAGLINE = "Hey, I'm Shajith. I build things people want to use."

/** My degree. lib/studyYear.ts works out the current year and semester
 *  from these and IIT (ISM)'s academic calendar, so nothing on the site
 *  goes stale when a semester turns over. */
export const STUDY = {
  subject: 'Computer Science',
  startYear: 2024,
  gradYear: 2028,
} as const

/** About page bio paragraphs, in order. The last one is the sign-off,
 *  rendered after the "Some things I've built" list. "{standing}" is
 *  filled from the date by lib/studyYear.ts fillStanding(), e.g. "a
 *  third-year Computer Science student at". */
export const BIO: string[] = [
  "I'm {standing} IIT(ISM) Dhanbad. I lean toward practical thinking over theory — give me a real problem and I'll figure it out by building.",
  'I work across TypeScript, Python, and Java. My projects range from AI voice agents and automation scripts to full-stack web apps and systems-level experiments.',
  'Always open to collaborate on something interesting or just talk tech.',
]

/** About page "Some things I've built" list. Some of these are not in data/projects.ts. */
export const ABOUT_PROJECTS: AboutProjectMention[] = [
  { name: 'SHARPFLOW', blurb: 'TypeScript agency & landing page' },
  { name: 'IntelliDesk', blurb: 'productivity app' },
  { name: 'WIFI-AUTOMATION', blurb: 'Python WiFi automation tool' },
  { name: 'linux-container-runtime', blurb: 'low-level systems project' },
]

/** LocationWidget. */
export const LOCATION = {
  city: 'Rajahmundry',
  region: 'Andhra Pradesh, India',
  timeZone: 'Asia/Kolkata',
} as const

export const EMAIL = 'shajith240@gmail.com'

/** About page social links, in display order. */
export const SOCIALS: SocialLink[] = [
  { label: 'Email', url: 'mailto:shajith240@gmail.com' },
  { label: 'LinkedIn', url: 'https://linkedin.com/in/shajith240' },
  { label: 'GitHub', url: 'https://github.com/shajith240' },
  { label: 'Instagram', url: 'https://instagram.com/heyshajith' },
]

// Source of truth for app/education/page.tsx, newest first (the page
// draws it as a timeline). School entries are transcribed from the
// SSC and Intermediate certificates; marks only, nothing personal.
// The IIT entry's year of study is computed (lib/studyYear.ts). CGPA is
// deliberately not shown; coursework is blank rather than invented.
export const EDUCATION: EducationEntry[] = [
  {
    institution: 'Indian Institute of Technology (ISM), Dhanbad',
    degree: 'B.Tech, Computer Science',
    level: 'Undergraduate',
    period: `${STUDY.startYear} – ${STUDY.gradYear}`,
    details: [],
    location: 'Dhanbad, Jharkhand, India',
    url: 'https://www.iitism.ac.in',
    // Official emblem of IIT (ISM) Dhanbad. Not freely licensed: it's the
    // institute's own mark (sourced from the English Wikipedia file
    // "IIT (ISM) Dhanbad Logo.svg", tagged fair use / non-free), shown
    // here only to identify where I study.
    logo: {
      src: '/education/iit-ism-logo.svg',
      alt: 'IIT (ISM) Dhanbad emblem',
      width: 296,
      height: 337,
    },
    photo: {
      src: '/education/heritage-building.webp',
      alt: 'The red-brick Heritage Building of IIT (ISM) Dhanbad behind a formal garden, with the Indian flag on its roof',
      width: 1448,
      height: 1086,
      caption: 'Heritage Building',
    },
    photoCredit: {
      title: 'Heritage Building, IIT (ISM) Dhanbad',
      author: 'Rick17778',
      authorUrl: 'https://commons.wikimedia.org/wiki/User:Rick17778',
      license: 'CC0 1.0',
      licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:SAVE_20260815_12200.jpg',
      via: 'Wikimedia Commons',
    },
    // TODO: add real courses only (none recorded yet).
    coursework: [],
    precededBy: {
      period: '2023–24',
      label: 'Preparation year',
      note: 'A full year preparing for JEE, which got me into IIT (ISM).',
    },
  },
  {
    institution: 'Sri Chaitanya Boys Junior College',
    degree: 'Intermediate, MPC (Maths, Physics, Chemistry)',
    level: 'Class 12',
    board: 'Board of Intermediate Education, AP',
    location: 'Vijayawada, Andhra Pradesh',
    period: '2023',
    score: '94.9%',
    scoreDetail: '949 / 1000',
    details: ['A grade'],
  },
  {
    institution: 'Z P High School, Rangampeta',
    degree: 'Secondary School Certificate (SSC)',
    level: 'Class 10',
    board: 'Board of Secondary Education, AP',
    location: 'East Godavari, Andhra Pradesh',
    period: '2021',
    score: '96.2%',
    scoreDetail: '577 / 600',
    details: ['100 / 100 in Mathematics', 'First division'],
  },
]

// Source of truth for app/achievements/page.tsx. TODO: intentionally empty
// until real hackathon wins / contest ranks / certifications are added.
export const ACHIEVEMENTS: Achievement[] = []

// Resume. Empty = not uploaded yet: every Resume button and entry (About,
// Dock, Spotlight, the mascot's knowledge) stays hidden. To publish one,
// drop the PDF in public/ and set this to its path, e.g. '/resume.pdf'.
export const RESUME_URL = ''

// Public site URL, for absolute links in metadata, the sitemap and link
// previews. Set NEXT_PUBLIC_SITE_URL in the hosting dashboard; Vercel's
// own production URL is used as a fallback when it's available.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '') ||
  'http://localhost:3000'
).replace(/\/$/, '')
