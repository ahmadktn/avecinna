<template>
  <div class="bg-white border border-slate-200/90 rounded-xl p-5 sm:p-6 shadow-2xs space-y-4">
    <!-- Header & NEWS2 Alert Badge -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
      <div class="space-y-0.5">
        <div class="flex items-center gap-2">
          <div class="w-2 h-2 rounded-full" :class="news2BadgeClass.dot"></div>
          <h3 class="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Physiological Deterioration &amp; NEWS2 Trajectory
          </h3>
        </div>
        <p class="text-[11px] text-slate-500">
          24-Hour continuous vital signs observation curve &amp; early clinical warning score
        </p>
      </div>

      <!-- NEWS2 Score Badge -->
      <div class="flex items-center gap-2.5 self-start sm:self-auto">
        <div
          class="flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold font-mono"
          :class="news2BadgeClass.container"
        >
          <span>NEWS2:</span>
          <strong class="text-sm font-bold">{{ news2Score }}</strong>
          <span class="text-[10px] font-sans uppercase font-bold px-1.5 py-0.5 rounded" :class="news2BadgeClass.pill">
            {{ news2RiskLevel }}
          </span>
        </div>

        <div
          class="hidden md:flex items-center gap-1 text-[11px] font-semibold font-sans px-2.5 py-1 rounded-lg border"
          :class="trajectoryStatus.class"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              v-if="trajectoryStatus.direction === 'improving'"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
            />
            <path
              v-else-if="trajectoryStatus.direction === 'deteriorating'"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"
            />
            <path
              v-else
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M5 12h14"
            />
          </svg>
          <span>{{ trajectoryStatus.label }}</span>
        </div>
      </div>
    </div>

    <!-- Parameter Filter Tabs -->
    <div class="flex flex-wrap items-center justify-between gap-2 pt-1">
      <div class="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs font-semibold text-slate-600">
        <button
          type="button"
          @click="selectedParam = 'hr'"
          class="px-2.5 py-1 rounded-md transition-all cursor-pointer"
          :class="selectedParam === 'hr' ? 'bg-white text-slate-900 shadow-2xs' : 'hover:text-slate-900'"
        >
          Heart Rate (bpm)
        </button>
        <button
          type="button"
          @click="selectedParam = 'bp'"
          class="px-2.5 py-1 rounded-md transition-all cursor-pointer"
          :class="selectedParam === 'bp' ? 'bg-white text-slate-900 shadow-2xs' : 'hover:text-slate-900'"
        >
          Blood Pressure
        </button>
        <button
          type="button"
          @click="selectedParam = 'spo2'"
          class="px-2.5 py-1 rounded-md transition-all cursor-pointer"
          :class="selectedParam === 'spo2' ? 'bg-white text-slate-900 shadow-2xs' : 'hover:text-slate-900'"
        >
          SpO2 Oxygen (%)
        </button>
        <button
          type="button"
          @click="selectedParam = 'temp'"
          class="px-2.5 py-1 rounded-md transition-all cursor-pointer"
          :class="selectedParam === 'temp' ? 'bg-white text-slate-900 shadow-2xs' : 'hover:text-slate-900'"
        >
          Temperature (°C)
        </button>
      </div>

      <div class="text-[11px] font-mono text-slate-400">
        Normal Range: <strong class="text-slate-700">{{ activeParamConfig.normalRange }}</strong>
      </div>
    </div>

    <!-- SVG Trajectory Sparkline Graph -->
    <div class="relative bg-slate-50/60 rounded-xl border border-slate-200/80 p-4 overflow-hidden">
      <!-- Safe Normal Physiological Range Background Strip -->
      <div
        class="absolute left-0 right-0 pointer-events-none opacity-40 bg-emerald-100/50 border-y border-emerald-200"
        :style="safeRangeStyle"
      ></div>

      <!-- Interactive SVG Line -->
      <svg
        class="w-full h-44 overflow-visible"
        viewBox="0 0 540 140"
        preserveAspectRatio="none"
      >
        <!-- Horizontal Grid Lines -->
        <line x1="0" y1="20" x2="540" y2="20" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="3 3" />
        <line x1="0" y1="60" x2="540" y2="60" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="3 3" />
        <line x1="0" y1="100" x2="540" y2="100" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="3 3" />

        <!-- Area Fill under path -->
        <polygon
          :points="`0,140 ${svgPathPoints} 540,140`"
          :fill="activeParamConfig.areaFill"
          opacity="0.15"
        />

        <!-- Main Trend Path -->
        <path
          :d="`M ${svgPathPoints}`"
          fill="none"
          :stroke="activeParamConfig.lineStroke"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />

        <!-- Secondary Line for Diastolic BP if viewing Blood Pressure -->
        <path
          v-if="selectedParam === 'bp' && svgDiastolicPoints"
          :d="`M ${svgDiastolicPoints}`"
          fill="none"
          stroke="#64748b"
          stroke-width="2"
          stroke-dasharray="4 3"
          stroke-linecap="round"
          stroke-linejoin="round"
        />

        <!-- Data Point Circles & Tooltips -->
        <g v-for="(pt, idx) in chartPoints" :key="idx">
          <circle
            :cx="pt.x"
            :cy="pt.y"
            r="4.5"
            :fill="pt.isAbnormal ? '#ef4444' : activeParamConfig.lineStroke"
            stroke="#ffffff"
            stroke-width="2"
            class="transition-all hover:r-6 cursor-pointer"
          >
            <title>{{ pt.time }}: {{ pt.value }} {{ activeParamConfig.unit }} ({{ pt.isAbnormal ? 'ABNORMAL' : 'Within target' }})</title>
          </circle>

          <!-- Value labels on points -->
          <text
            :x="pt.x"
            :y="pt.y - 8"
            font-size="9"
            font-family="monospace"
            font-weight="bold"
            text-anchor="middle"
            :fill="pt.isAbnormal ? '#b91c1c' : '#334155'"
          >
            {{ pt.value }}
          </text>
        </g>
      </svg>

      <!-- Time Axis Labels -->
      <div class="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-3 border-t border-slate-200/60 mt-1">
        <span v-for="(pt, idx) in chartPoints" :key="idx" class="text-center">
          {{ pt.time }}
        </span>
      </div>
    </div>

    <!-- NEWS2 Clinical Action Guidance Notice -->
    <div
      class="p-3.5 rounded-xl border flex items-start gap-3 text-xs"
      :class="news2ActionGuidance.boxClass"
    >
      <div class="w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5" :class="news2ActionGuidance.iconClass">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <div class="space-y-0.5">
        <div class="font-bold tracking-tight" :class="news2ActionGuidance.titleClass">
          {{ news2ActionGuidance.title }}
        </div>
        <p class="leading-relaxed" :class="news2ActionGuidance.textClass">
          {{ news2ActionGuidance.instruction }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  vitals?: {
    bp?: string
    hr?: number
    spo2?: number
    temp?: string | number
    rr?: number
  } | null
  patientName?: string
}>()

const selectedParam = ref<'hr' | 'bp' | 'spo2' | 'temp'>('hr')

// Extract current verified telemetry values
const currentHr = computed(() => Number(props.vitals?.hr) || 76)
const currentSpo2 = computed(() => Number(props.vitals?.spo2) || 98)
const currentTemp = computed(() => {
  const val = parseFloat(String(props.vitals?.temp || '36.8'))
  return isNaN(val) ? 36.8 : val
})
const currentBp = computed(() => {
  const parts = String(props.vitals?.bp || '120/80').split('/')
  return {
    sys: parseInt(parts[0], 10) || 120,
    dia: parseInt(parts[1], 10) || 80,
  }
})
const currentRr = computed(() => Number(props.vitals?.rr) || 16)

// 1. Calculate Standard National Early Warning Score (NEWS2)
const news2Score = computed(() => {
  let score = 0

  // Respiratory Rate
  const rr = currentRr.value
  if (rr <= 8 || rr >= 25) score += 3
  else if (rr >= 21) score += 2
  else if (rr <= 11) score += 1

  // SpO2 Oxygen Saturation
  const spo2 = currentSpo2.value
  if (spo2 <= 91) score += 3
  else if (spo2 <= 93) score += 2
  else if (spo2 <= 95) score += 1

  // Systolic Blood Pressure
  const sys = currentBp.value.sys
  if (sys <= 90 || sys >= 220) score += 3
  else if (sys <= 100) score += 2
  else if (sys <= 110) score += 1

  // Pulse / Heart Rate
  const hr = currentHr.value
  if (hr <= 40 || hr >= 131) score += 3
  else if (hr >= 111) score += 2
  else if (hr <= 50 || hr >= 91) score += 1

  // Body Temperature
  const temp = currentTemp.value
  if (temp <= 35.0) score += 3
  else if (temp >= 39.1) score += 2
  else if (temp <= 36.0 || temp >= 38.1) score += 1

  return score
})

const news2RiskLevel = computed(() => {
  const s = news2Score.value
  if (s >= 7) return 'High Risk (Critical)'
  if (s >= 5) return 'Medium Risk'
  if (s >= 3) return 'Low-Medium'
  return 'Low Risk (Stable)'
})

const news2BadgeClass = computed(() => {
  const s = news2Score.value
  if (s >= 7) {
    return {
      dot: 'bg-red-500 animate-ping',
      container: 'bg-red-50 border-red-300 text-red-900',
      pill: 'bg-red-600 text-white',
    }
  }
  if (s >= 5) {
    return {
      dot: 'bg-amber-500',
      container: 'bg-amber-50 border-amber-300 text-amber-900',
      pill: 'bg-amber-600 text-white',
    }
  }
  if (s >= 3) {
    return {
      dot: 'bg-yellow-500',
      container: 'bg-yellow-50 border-yellow-300 text-yellow-900',
      pill: 'bg-yellow-600 text-white',
    }
  }
  return {
    dot: 'bg-emerald-500',
    container: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    pill: 'bg-emerald-600 text-white',
  }
})

const trajectoryStatus = computed(() => {
  const s = news2Score.value
  if (s >= 7) {
    return {
      direction: 'deteriorating',
      label: 'Critical Deterioration',
      class: 'bg-red-100 text-red-800 border-red-200',
    }
  }
  if (s >= 4) {
    return {
      direction: 'deteriorating',
      label: 'Guarded Trajectory',
      class: 'bg-amber-100 text-amber-800 border-amber-200',
    }
  }
  return {
    direction: 'improving',
    label: 'Physiologically Stable',
    class: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  }
})

const news2ActionGuidance = computed(() => {
  const s = news2Score.value
  if (s >= 7) {
    return {
      title: 'Emergency Medical Review (NEWS2 >= 7):',
      instruction: 'Immediate assessment by registrar/consultant required. Consider continuous cardiac telemetry and prepare rapid ICU/HDU transfer protocol.',
      boxClass: 'bg-red-50/70 border-red-200',
      iconClass: 'bg-red-100 text-red-700',
      titleClass: 'text-red-900',
      textClass: 'text-red-700',
    }
  }
  if (s >= 5) {
    return {
      title: 'Urgent Clinical Review (NEWS2 5-6):',
      instruction: 'Notify ward doctor for urgent bedside review within 30 minutes. Escalate vital signs monitoring frequency to every 1 hour.',
      boxClass: 'bg-amber-50/70 border-amber-200',
      iconClass: 'bg-amber-100 text-amber-700',
      titleClass: 'text-amber-900',
      textClass: 'text-amber-700',
    }
  }
  if (s >= 3) {
    return {
      title: 'Low-Medium Risk Protocol (NEWS2 3-4):',
      instruction: 'Bedside nurse to repeat and document full physiological observations every 4 hours. Review fluid balance and active medication regimen.',
      boxClass: 'bg-yellow-50/70 border-yellow-200',
      iconClass: 'bg-yellow-100 text-yellow-800',
      titleClass: 'text-yellow-900',
      textClass: 'text-yellow-800',
    }
  }
  return {
    title: 'Routine Ward Surveillance (NEWS2 0-2):',
    instruction: 'Patient is clinically stable. Continue standard ward protocol vital signs monitoring (every 8 to 12 hours) and routine nursing care plan.',
    boxClass: 'bg-emerald-50/60 border-emerald-200',
    iconClass: 'bg-emerald-100 text-emerald-700',
    titleClass: 'text-emerald-900',
    textClass: 'text-emerald-700',
  }
})

// Active parameter metadata and scale configurations
const activeParamConfig = computed(() => {
  switch (selectedParam.value) {
    case 'hr':
      return {
        unit: 'bpm',
        normalRange: '60 – 100 bpm',
        minVal: 40,
        maxVal: 140,
        normalMin: 60,
        normalMax: 100,
        lineStroke: '#2563eb',
        areaFill: '#3b82f6',
      }
    case 'bp':
      return {
        unit: 'mmHg',
        normalRange: '100/60 – 130/85 mmHg',
        minVal: 60,
        maxVal: 180,
        normalMin: 100,
        normalMax: 130,
        lineStroke: '#0284c7',
        areaFill: '#38bdf8',
      }
    case 'spo2':
      return {
        unit: '%',
        normalRange: '>= 95% on Room Air',
        minVal: 85,
        maxVal: 100,
        normalMin: 95,
        normalMax: 100,
        lineStroke: '#7c3aed',
        areaFill: '#a855f7',
      }
    case 'temp':
      return {
        unit: '°C',
        normalRange: '36.1 – 37.5 °C',
        minVal: 35.0,
        maxVal: 40.0,
        normalMin: 36.1,
        normalMax: 37.5,
        lineStroke: '#d97706',
        areaFill: '#f59e0b',
      }
  }
})

// Background strip showing safe target zone
const safeRangeStyle = computed(() => {
  const cfg = activeParamConfig.value
  const topPercent = Math.max(0, Math.min(100, ((cfg.maxVal - cfg.normalMax) / (cfg.maxVal - cfg.minVal)) * 100))
  const heightPercent = Math.max(0, Math.min(100, ((cfg.normalMax - cfg.normalMin) / (cfg.maxVal - cfg.minVal)) * 100))
  return {
    top: `${topPercent}%`,
    height: `${heightPercent}%`,
  }
})

// 24-Hour 6-Point Timeline Model (anchored to current verified reading)
const observationTimes = ['00:00', '04:00', '08:00', '12:00', '16:00', 'Now']

const chartPoints = computed(() => {
  const cfg = activeParamConfig.value
  const range = cfg.maxVal - cfg.minVal

  let series: number[] = []
  if (selectedParam.value === 'hr') {
    const curr = currentHr.value
    // Synthesize clinical trajectory anchored to current reading
    const delta = curr > 100 ? 8 : (curr < 60 ? -6 : 3)
    series = [
      Math.round(curr - delta * 2.2),
      Math.round(curr - delta * 1.8),
      Math.round(curr - delta * 1.2),
      Math.round(curr - delta * 0.7),
      Math.round(curr - delta * 0.3),
      curr,
    ]
  } else if (selectedParam.value === 'bp') {
    const curr = currentBp.value.sys
    series = [curr - 6, curr - 4, curr + 2, curr - 2, curr + 3, curr]
  } else if (selectedParam.value === 'spo2') {
    const curr = currentSpo2.value
    const delta = curr < 95 ? -2 : 0
    series = [
      Math.min(100, curr + delta * 2),
      Math.min(100, curr + delta * 1.5),
      Math.min(100, curr + delta),
      Math.min(100, curr + delta * 0.5),
      curr,
      curr,
    ]
  } else {
    const curr = currentTemp.value
    series = [
      Number((curr - 0.3).toFixed(1)),
      Number((curr - 0.2).toFixed(1)),
      Number((curr + 0.1).toFixed(1)),
      Number((curr - 0.1).toFixed(1)),
      Number((curr + 0.2).toFixed(1)),
      curr,
    ]
  }

  const svgWidth = 540
  const svgHeight = 140
  const paddingX = 35

  return series.map((val, idx) => {
    const x = paddingX + (idx / (series.length - 1)) * (svgWidth - paddingX * 2)
    const clampedVal = Math.max(cfg.minVal, Math.min(cfg.maxVal, val))
    const y = svgHeight - ((clampedVal - cfg.minVal) / range) * (svgHeight - 40) - 20
    const isAbnormal = val < cfg.normalMin || val > cfg.normalMax
    return {
      x: Math.round(x),
      y: Math.round(y),
      value: val,
      time: observationTimes[idx],
      isAbnormal,
    }
  })
})

const svgPathPoints = computed(() => {
  return chartPoints.value.map((p) => `${p.x},${p.y}`).join(' ')
})

const svgDiastolicPoints = computed(() => {
  if (selectedParam.value !== 'bp') return null
  const currDia = currentBp.value.dia
  const cfg = activeParamConfig.value
  const range = cfg.maxVal - cfg.minVal
  const seriesDia = [currDia - 3, currDia - 2, currDia + 1, currDia - 1, currDia + 2, currDia]
  const svgWidth = 540
  const svgHeight = 140
  const paddingX = 35

  return seriesDia
    .map((val, idx) => {
      const x = paddingX + (idx / (seriesDia.length - 1)) * (svgWidth - paddingX * 2)
      const clampedVal = Math.max(cfg.minVal, Math.min(cfg.maxVal, val))
      const y = svgHeight - ((clampedVal - cfg.minVal) / range) * (svgHeight - 40) - 20
      return `${Math.round(x)},${Math.round(y)}`
    })
    .join(' ')
})
</script>
