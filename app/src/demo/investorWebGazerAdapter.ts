/**
 * Investor Demo — optional WebGazer loader (dynamic script, no npm bundle).
 * Fallback-first: failures return to simulated POP Live in the view layer.
 */

import type { WebGazerAPI } from '../types/webgazer'

const WEBGAZER_SCRIPT =
  'https://cdn.jsdelivr.net/npm/webgazer@3.3.0/dist/webgazer.js'

const HIDE_STYLE_ID = 'id-investor-webgazer-hide'

let loadPromise: Promise<WebGazerAPI> | null = null

function injectHideStyles(): void {
  if (document.getElementById(HIDE_STYLE_ID)) return
  const style = document.createElement('style')
  style.id = HIDE_STYLE_ID
  style.textContent = `
    #webgazerVideoContainer,
    #webgazerFaceOverlay,
    #webgazerFaceFeedbackBox,
    #webgazerGazeDot {
      display: none !important;
      opacity: 0 !important;
      pointer-events: none !important;
    }
  `
  document.head.appendChild(style)
}

function removeHideStyles(): void {
  document.getElementById(HIDE_STYLE_ID)?.remove()
}

export function hideWebGazerDom(): void {
  injectHideStyles()
  for (const id of [
    'webgazerVideoContainer',
    'webgazerFaceOverlay',
    'webgazerFaceFeedbackBox',
    'webgazerGazeDot',
  ]) {
    const el = document.getElementById(id)
    if (el) {
      el.style.display = 'none'
      el.style.opacity = '0'
      el.style.pointerEvents = 'none'
    }
  }
}

export function loadWebGazerScript(): Promise<WebGazerAPI> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('WebGazer requires a browser environment'))
  }
  if (window.webgazer) return Promise.resolve(window.webgazer)
  if (loadPromise) return loadPromise

  loadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[data-investor-webgazer="1"]`,
    )
    if (existing) {
      existing.addEventListener('load', () => {
        if (window.webgazer) resolve(window.webgazer)
        else reject(new Error('WebGazer global missing after load'))
      })
      existing.addEventListener('error', () => {
        loadPromise = null
        reject(new Error('WebGazer script failed to load'))
      })
      return
    }

    const script = document.createElement('script')
    script.src = WEBGAZER_SCRIPT
    script.async = true
    script.crossOrigin = 'anonymous'
    script.dataset.investorWebgazer = '1'
    script.onload = () => {
      if (window.webgazer) resolve(window.webgazer)
      else {
        loadPromise = null
        reject(new Error('WebGazer global missing after load'))
      }
    }
    script.onerror = () => {
      loadPromise = null
      reject(new Error('WebGazer script failed to load'))
    }
    document.head.appendChild(script)
  })

  return loadPromise
}

export async function beginWebGazerPreview(): Promise<WebGazerAPI> {
  const wg = await loadWebGazerScript()
  wg
    .showVideoPreview(false)
    .showPredictionPoints(false)
    .showFaceOverlay(false)
    .showFaceFeedbackBox(false)
    .setRegression('ridge')

  try {
    await wg.begin()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Camera access failed'
    if (/denied|not allowed|permission/i.test(message)) {
      throw new Error('CAMERA_DENIED')
    }
    throw err
  }

  hideWebGazerDom()
  return wg
}

export function recordCalibrationClick(
  wg: WebGazerAPI,
  clientX: number,
  clientY: number,
): void {
  wg.recordScreenPosition(clientX, clientY, 'click')
  hideWebGazerDom()
}

export function attachGazeListener(
  wg: WebGazerAPI,
  onGaze: (x: number | null, y: number | null) => void,
): () => void {
  wg.setGazeListener((data) => {
    if (!data || data.x == null || data.y == null || Number.isNaN(data.x) || Number.isNaN(data.y)) {
      onGaze(null, null)
      return
    }
    onGaze(data.x, data.y)
  })
  return () => {
    wg.clearGazeListener()
  }
}

export async function stopInvestorWebGazer(): Promise<void> {
  const wg = window.webgazer
  if (!wg) return

  try {
    wg.clearGazeListener()
    wg.pause()
    await wg.end()
  } catch {
    /* best-effort cleanup */
  }

  hideWebGazerDom()
  removeHideStyles()
}

export function isCameraDeniedError(err: unknown): boolean {
  if (!(err instanceof Error)) return false
  if (err.message === 'CAMERA_DENIED') return true
  if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') return true
  return /denied|not allowed|permission/i.test(err.message)
}
