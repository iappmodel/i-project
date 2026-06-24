/** Minimal WebGazer.js surface for Investor Demo POP Live preview. */

export interface WebGazerGazeData {
  x: number | null
  y: number | null
}

export interface WebGazerAPI {
  setRegression(type: string): WebGazerAPI
  setGazeListener(
    callback: (data: WebGazerGazeData | null, elapsedTime: number) => void,
  ): WebGazerAPI
  showVideoPreview(show: boolean): WebGazerAPI
  showPredictionPoints(show: boolean): WebGazerAPI
  showFaceOverlay(show: boolean): WebGazerAPI
  showFaceFeedbackBox(show: boolean): WebGazerAPI
  begin(): Promise<WebGazerAPI>
  pause(): WebGazerAPI
  end(): Promise<boolean>
  recordScreenPosition(x: number, y: number, eventType: string): void
  clearGazeListener(): WebGazerAPI
  isReady(): boolean
}

declare global {
  interface Window {
    webgazer?: WebGazerAPI
  }
}

export {}
