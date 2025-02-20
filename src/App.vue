<script setup lang="ts">
import { computed, ref } from 'vue'
import type {
  CsesConfig as CsesType,
  Config as ConfigType,
  Schedule as SceduleType,
  TempSchedule,
  TempClass,
} from './types'
import Cses from '../cses.json'
import Config from '../config.json'
import { TransitionGroup } from 'vue'

const rawCses = Cses as CsesType
const timeFromString = (s: string) =>
  s
    .split(':')
    .map(Number)
    .reduce(
      (acc, now, index) => (index == 0 ? 60 * 60 * now : index == 1 ? acc + now * 60 : acc + now),
      0,
    )

const defaultClass = {
  subject: '无课',
  startTime: 0,
  endTime: 24 * 60 * 60 - 1,
  teacher: '无老师',
  room: '教室',
}

const schedules = rawCses.schedules.map((it) => ({
  ...it,
  classes: (() => {
    const tmp = it.classes
      .map((it) => {
        const subjectInfo = rawCses.subjects.find((subject) => it.subject == subject.name)
        return {
          subject: it.subject,
          startTime: timeFromString(it.start_time),
          endTime: timeFromString(it.end_time),
          teacher: subjectInfo?.teacher ?? '无老师',
          room: subjectInfo?.room ?? '教室',
        }
      })
      .sort((a, b) => a.startTime - b.startTime)
      .reduce((acc, now) => {
        // 修正
        if (now.endTime < now.startTime) {
          now.endTime = now.startTime
        }
        if (now.endTime > 24 * 60 * 60) {
          now.endTime = 24 * 60 * 60 - 1
        }
        // 补前
        if (acc.length == 0) {
          return now.startTime == 0 ? [now] : acc.concat([now])
        }
        const back = acc[acc.length - 1]
        // 修正
        if (back.startTime == back.endTime || back.endTime > now.startTime) {
          // 修改 back 指向 arr 中的值
          back.endTime = now.startTime
          return acc.concat(now)
        }
        if (back.endTime == now.startTime) {
          return acc.concat(now)
        }
        return acc.concat([now])
      }, [] as TempClass[])
    // 补后
    return tmp.length == 0 ? [defaultClass] : tmp
  })(),
}))

const startUTC = new Date((Config as ConfigType).start).getUTCMilliseconds()
const csesWeekdayToDate = (n: number) => (n == 7 ? 0 : n)
const getOddOrEven = (bigger: number, smaller: number) =>
  ['odd', 'even'][Math.floor((bigger - smaller) / (7 * 24 * 60 * 60 * 1000)) % 2] as 'odd' | 'even'
const getNow = (oddOrEven: 'odd' | 'even', schedules: TempSchedule[]) => {
  if (schedules.length <= 1) {
    return schedules.length == 0 ? [defaultClass] : schedules[0].classes
  }
  // schedules.lenght > 1
  const oddOrEvenSchedule = schedules.find((it) => it.weeks == oddOrEven)
  if (oddOrEvenSchedule != undefined) {
    return oddOrEvenSchedule.classes
  }
  const allSchedule = schedules.find((it) => it.weeks == 'all')
  if (allSchedule != undefined) {
    return allSchedule.classes
  }
  // 找不到复合 odd/even 和 all 的
  console.error("can't find odd/even or all schedule")
  return [defaultClass]
}

const nowClasses = ref([{ value: defaultClass, index: 0 }])
const nowTime = ref('00:00:00')
const eta = ref('00:00:00')
const dateInfo = ref('2025/2/12 周二')
const weekdayMap = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

const timePad = (num: number) => num.toString().padStart(2, '0')
const formatTime = (num: number) =>
  `${timePad(Math.floor(num / 60 / 60))}:${timePad(Math.floor((num / 60) % 60))}:${timePad(Math.floor(num % 60))}`
const formatDateTime = (date: Date) =>
  `${timePad(date.getHours())}:${timePad(date.getMinutes())}:${timePad(date.getSeconds())}`
const formatDateInfo = (date: Date) =>
  `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate() + 1} ${weekdayMap[date.getDay()]}`
setInterval(async () => {
  const datetime = new Date()
  nowTime.value = formatDateTime(datetime)
  dateInfo.value = formatDateInfo(datetime)
  const oddOrEven = getOddOrEven(datetime.getUTCMilliseconds(), startUTC)
  const tempTime =
    datetime.getHours() * 60 * 60 + datetime.getMinutes() * 60 + datetime.getSeconds()
  const tempSchedules = schedules.filter(
    (schedule) =>
      csesWeekdayToDate(schedule.enable_day) == datetime.getDay() &&
      ['all', oddOrEven].some((it) => it == schedule.weeks),
  )
  const todayClasses = getNow(oddOrEven, tempSchedules).map((value, index) => ({
    value: value,
    index,
  }))
  const tempClasses = todayClasses.filter(({ value }) => value.endTime > tempTime)
  if (tempClasses.length == 0) {
    nowClasses.value = [{ value: defaultClass, index: 0 }]
  } else if (tempClasses[0].value.startTime > tempTime) {
    nowClasses.value = [
      {
        value: {
          ...defaultClass,
          startTime: todayClasses[tempClasses[0].index].value.endTime ?? 0,
          endTime: tempClasses[0].value.startTime,
          subject: '下课',
        },
        index: 0,
      },
    ].concat(tempClasses.map((i) => ({ ...i, index: i.index + 1 })))
  }
  eta.value = formatTime(nowClasses.value[0].value.endTime - tempTime)
}, 1000)
</script>

<template>
  <div
    class="fixed right-4 bottom-4 flex items-end justify-end text-stone-500 font-mono flex-col gap-2"
  >
    <div class="text-xl lg:text-4xl">{{ dateInfo }}</div>
    <div class="text-2xl lg:text-6xl">ETA: {{ eta }}</div>
    <div class="text-5xl lg:text-9xl">{{ nowTime }}</div>
  </div>
  <main class="px-8 min-h-dvh bg-stone-200 py-4">
    <TransitionGroup name="fade" tag="div" class="w-fit flex flex-col gap-8">
      <div
        v-for="({ value, index }, rowIndex) in nowClasses"
        :key="index"
        class="grid grid-cols-2 grid-rows-2 w-fit gap-1"
      >
        <div
          class="col-start-1 row-start-1 row-end-3 text-5xl lg:text-6xl font-light aria-expanded:font-medium aria-expanded:text-6xl lg:aria-expanded:text-9xl"
          :aria-expanded="rowIndex == 0"
        >
          {{ value.subject }}
        </div>
        <div
          class="col-start-2 row-start-1 w-fit self-end text:lg lg:text-xl font-light aria-expanded:font-medium aria-expanded:text-xl lg:aria-expanded:text-5xl"
          :aria-expanded="rowIndex == 0"
        >
          {{ value.room }}
        </div>
        <div
          class="col-start-2 row-start-2 w-fit self-end text:lg lg:text-xl font-light aria-expanded:font-medium aria-expanded:text-xl lg:aria-expanded:text-5xl"
          :aria-expanded="rowIndex == 0"
        >
          {{ value.teacher }}
        </div>
      </div>
    </TransitionGroup>
  </main>
</template>

<style scoped>
.fade-move,
.fade-enter-active,
.fade-leave-active {
  transition: all 0.5s cubic-bezier(0.55, 0, 0.1, 1);
}

/* 2. 声明进入和离开的状态 */
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: scaleY(0.01);
}

/* 3. 确保离开的项目被移除出了布局流
以便正确地计算移动时的动画效果。 */
.fade-leave-active {
  position: absolute;
}
</style>
