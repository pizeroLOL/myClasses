export interface Config {
  start: string
}

export interface CsesConfig {
  version: 1
  subjects: Subject[]
  schedules: Schedule[]
}

export interface Subject {
  name: string
  simplified_name?: string
  teacher?: string
  room?: string
}

export interface Schedule {
  name: string
  enable_day: CsesWeekday
  weeks: WeekType
  classes: Class[]
}

export type CsesWeekday = 1 | 2 | 3 | 4 | 5 | 6 | 7
export type WeekType = 'all' | 'odd' | 'even'

export interface Class {
  subject: string
  start_time: string
  end_time: string
}

export interface Time {
  hours: number
  minutes: number
  seconds: number
}

export interface TempClass {
  startTime: number
  endTime: number
  teacher: string
  room: string
  subject: string
}

export interface TempSchedule {
  classes: TempClass[]
  name: string
  enable_day: CsesWeekday
  weeks: WeekType
}
