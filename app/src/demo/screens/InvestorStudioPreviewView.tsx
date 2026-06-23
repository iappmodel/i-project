import { useInvestorDemo } from '../useInvestorDemoState'
import { InvestorDock } from '../components/InvestorDock'
import {
  STUDIO_CLIPS,
  STUDIO_CTA_OPTIONS,
  STUDIO_FORMAT_OPTIONS,
  studioCtaLabel,
  studioFormatAspect,
  studioStatusLabel,
} from '../investorDemoData'

export function InvestorStudioPreviewView() {
  const {
    state,
    goView,
    showToast,
    setStudioClip,
    toggleStudioCaptions,
    toggleStudioRewardOverlay,
    setStudioCta,
    setStudioFormat,
    generateStudioPreview,
    sendStudioToCampaign,
  } = useInvestorDemo()

  const { studio, campaign } = state
  const selectedClip = STUDIO_CLIPS.find((c) => c.id === studio.selectedClipId) ?? STUDIO_CLIPS[1]

  const handleBack = () => goView('campaignPreview')

  const handleGenerate = () => {
    generateStudioPreview()
    showToast('Preview ready · simulated only')
  }

  const handleSend = () => {
    sendStudioToCampaign()
    showToast('Media sent to Campaign Builder · simulated')
  }

  return (
    <div className="id-studio">
      <div className="id-studio__scroll">
        <header className="id-studio__header">
          <button type="button" className="id-studio__back" onClick={handleBack}>
            <span className="id-studio__back-icon" aria-hidden>←</span>
            Campaign Builder
          </button>
          <div className="id-studio__header-row">
            <h1 className="id-studio__title">Studio</h1>
            <span className={`id-studio__status${studio.studioStatus === 'preview_ready' ? ' ready' : ''}`}>
              {studioStatusLabel(studio.studioStatus)}
            </span>
          </div>
          <p className="id-studio__sub">Build media for rewarded attention</p>
        </header>

        {/* Canvas */}
        <section className="id-studio__canvas-wrap">
          <p className="id-studio__sec">Media canvas</p>
          <div
            className="id-studio__canvas"
            style={{ aspectRatio: studioFormatAspect(studio.studioFormat) }}
          >
            <div className="id-studio__canvas-bg" aria-hidden />
            <div className="id-studio__canvas-wave" aria-hidden>
              {[18, 28, 22, 36, 30, 24, 32, 20].map((h, i) => (
                <span key={i} style={{ height: `${h}px` }} />
              ))}
            </div>

            {studio.captionsEnabled ? (
              <div className="id-studio__overlay id-studio__overlay--captions">
                <span>Watch & earn · demo clip</span>
              </div>
            ) : null}

            {studio.rewardOverlayEnabled ? (
              <div className="id-studio__overlay id-studio__overlay--reward">
                Earn {campaign.selectedReward.toFixed(2)} iC
              </div>
            ) : null}

            <div className="id-studio__overlay id-studio__overlay--cta">
              {studioCtaLabel(studio.studioCta)}
            </div>

            <div className="id-studio__overlay id-studio__overlay--pop">
              <span aria-hidden>◎</span> POP verified
            </div>

            <div className="id-studio__playhead" aria-hidden>
              <span className="id-studio__playhead-bar" />
            </div>
          </div>
          <p className="id-studio__clip-label">
            Clip: <strong>{selectedClip.label}</strong> · {selectedClip.duration} · simulated
          </p>
        </section>

        {/* Timeline */}
        <section className="id-studio__card">
          <p className="id-studio__sec">Timeline</p>
          <div className="id-studio__ruler">
            <span>0:00</span>
            <span>0:12</span>
            <span>0:24</span>
          </div>
          <div className="id-studio__timeline">
            {STUDIO_CLIPS.map((clip) => (
              <button
                key={clip.id}
                type="button"
                className={`id-studio__clip${studio.selectedClipId === clip.id ? ' active' : ''}`}
                style={{
                  left: `${clip.startPct}%`,
                  width: `${clip.widthPct}%`,
                  background: `${clip.color}33`,
                  borderColor: `${clip.color}88`,
                }}
                onClick={() => setStudioClip(clip.id)}
                aria-pressed={studio.selectedClipId === clip.id}
              >
                <span className="id-studio__clip-name">{clip.label}</span>
                <span className="id-studio__clip-dur">{clip.duration}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Tools */}
        <section className="id-studio__card">
          <p className="id-studio__sec">Editor tools</p>
          <div className="id-studio__tools">
            <button
              type="button"
              className={`id-studio__tool${studio.captionsEnabled ? ' on' : ''}`}
              onClick={toggleStudioCaptions}
              aria-pressed={studio.captionsEnabled}
            >
              <span className="id-studio__tool-icon" aria-hidden>T</span>
              <span className="id-studio__tool-label">Captions</span>
              <span className="id-studio__tool-state">{studio.captionsEnabled ? 'On' : 'Off'}</span>
            </button>
            <button
              type="button"
              className={`id-studio__tool${studio.rewardOverlayEnabled ? ' on' : ''}`}
              onClick={toggleStudioRewardOverlay}
              aria-pressed={studio.rewardOverlayEnabled}
            >
              <span className="id-studio__tool-icon" aria-hidden>◎</span>
              <span className="id-studio__tool-label">Reward overlay</span>
              <span className="id-studio__tool-state">{studio.rewardOverlayEnabled ? 'On' : 'Off'}</span>
            </button>
          </div>
        </section>

        <section className="id-studio__card">
          <p className="id-studio__sec">CTA button</p>
          <div className="id-studio__chips">
            {STUDIO_CTA_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`id-studio__chip${studio.studioCta === opt.id ? ' active' : ''}`}
                onClick={() => setStudioCta(opt.id)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </section>

        <section className="id-studio__card">
          <p className="id-studio__sec">Format</p>
          <div className="id-studio__chips">
            {STUDIO_FORMAT_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`id-studio__chip${studio.studioFormat === opt.id ? ' active' : ''}`}
                onClick={() => setStudioFormat(opt.id)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </section>

        <section className="id-studio__card id-studio__export">
          <p className="id-studio__sec">Export preview</p>
          <div className="id-studio__export-rows">
            <div className="id-studio__export-row">
              <span>Format</span>
              <span className="mono">{studio.studioFormat}</span>
            </div>
            <div className="id-studio__export-row">
              <span>CTA</span>
              <span>{studioCtaLabel(studio.studioCta)}</span>
            </div>
            <div className="id-studio__export-row">
              <span>Captions</span>
              <span>{studio.captionsEnabled ? 'Enabled' : 'Hidden'}</span>
            </div>
            <div className="id-studio__export-row">
              <span>Reward overlay</span>
              <span>{studio.rewardOverlayEnabled ? 'Visible' : 'Hidden'}</span>
            </div>
            <div className="id-studio__export-row">
              <span>POP marker</span>
              <span>Simulated</span>
            </div>
          </div>
        </section>

        <button type="button" className="id-studio__btn id-studio__btn--secondary" onClick={handleGenerate}>
          Generate preview
        </button>
        <button type="button" className="id-studio__btn id-studio__btn--primary" onClick={handleSend}>
          Send to Campaign Builder
        </button>

        <p className="id-studio__disclaimer">
          Simulated studio preview. No real upload, rendering, or export.
        </p>
      </div>
      <InvestorDock />
    </div>
  )
}
