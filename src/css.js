// RP Music Player — CSS (zero-loss modular split)
// CSS перенесён 1-в-1 из исходного index.js. Селекторы, цвета, размеры, blur/shadow/border/spacing,
// анимации — НЕ менялись. Инжектится из JS тем же способом (injectStyles), как и раньше.

import { PFX } from './constants.js';

export const CSS = `
  .${PFX}-root { position: fixed; z-index: 99998; box-sizing: border-box; font-family: Arial, sans-serif; color: var(--rp-text, #f0f0f5); -webkit-user-select: none; user-select: none; touch-action: none; overflow: visible; border-radius: 16px; display: flex; flex-direction: column; }
  .${PFX}-root *, .${PFX}-root *::before, .${PFX}-root *::after { box-sizing: border-box; }
  .${PFX}-root.dragging { transition: none !important; }
  .${PFX}-root.dragging * { cursor: grabbing !important; }
  .${PFX}-root.resizing { transition: none !important; }
  .${PFX}-root.${PFX}-pulse .${PFX}-glass { animation: ${PFX}-pulse 1.3s ease-in-out infinite; }
  @keyframes ${PFX}-pulse {
    0%, 100% { box-shadow: 0 12px 40px rgba(0,0,0,0.55), 0 0 0 0 var(--rp-accent, rgba(120,170,255,0.7)); }
    50% { box-shadow: 0 12px 40px rgba(0,0,0,0.55), 0 0 18px 4px var(--rp-accent, rgba(120,170,255,0.7)); }
  }
  .${PFX}-shell { flex: 1; display: flex; flex-direction: column; min-height: 0; }
  .${PFX}-body { flex: 1; display: flex; flex-direction: column; min-height: 0; }
  .${PFX}-glass { background: rgba(30,30,40,var(--rp-bg-alpha, 0.92)); backdrop-filter: blur(18px) saturate(150%); -webkit-backdrop-filter: blur(18px) saturate(150%); border: 1px solid rgba(255,255,255,0.18); box-shadow: 0 12px 40px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.1); border-radius: 16px; overflow: hidden; }

  .${PFX}-fab { width: 48px; height: 48px; border-radius: 50% !important; display: flex; align-items: center; justify-content: center; cursor: pointer; overflow: hidden; background-clip: padding-box; line-height: 0; }
  .${PFX}-root.${PFX}-fabmode { border-radius: 50% !important; overflow: visible; }
  .${PFX}-root.${PFX}-fabmode, .${PFX}-root.${PFX}-fabmode .${PFX}-shell, .${PFX}-root.${PFX}-fabmode .${PFX}-body { border-radius: 50% !important; }
  .${PFX}-fab[data-handle] { cursor: grab; }
  .${PFX}-fab .${PFX}-ic { width: 24px; height: 24px; pointer-events: none; display: block; }
  .${PFX}-fab[data-fabbtn] svg polygon { transform: translateX(1px); }
  .${PFX}-fab .${PFX}-spin { width: 22px; height: 22px; }
  .${PFX}-fab.vibe { background: var(--rp-accent, rgba(120,170,255,0.32)) !important; }

  .${PFX}-progress-container { display: flex; align-items: center; gap: 8px; margin: 4px 0; }
  .${PFX}-time-lbl { font-size: 10px; opacity: 0.6; min-width: 28px; text-align: center; font-family: monospace; }
  .${PFX}-progress-slider { flex: 1; height: 4px; -webkit-appearance: none; appearance: none; background: var(--rp-accent-soft, rgba(122,166,255,0.22)); border-radius: 2px; outline: none; }
  .${PFX}-progress-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 12px; height: 12px; border-radius: 50%; background: var(--rp-accent, #7aa6ff); cursor: pointer; border: 1px solid #fff; }
  .${PFX}-progress-slider::-moz-range-thumb { width: 12px; height: 12px; border-radius: 50%; background: var(--rp-accent, #7aa6ff); border: 1px solid #fff; cursor: pointer; }

  .${PFX}-ytlayer { display: none; transition: opacity .2s; flex-shrink: 0; }
  .${PFX}-ytlayer.show { display: block; position: relative; width: 100%; height: 130px; border-radius: 12px; overflow: hidden; background: #000; margin-bottom: 10px; }
  .${PFX}-ytlayer iframe { width: 100%; height: 130px; border: 0; display: block; }
  .${PFX}-ytlayer.hidden-layer { opacity: 0.25; }
  .${PFX}-ytlayer.hidden-layer:hover, .${PFX}-ytlayer.hidden-layer:active { opacity: 1; }
  .${PFX}-ytclose { position: absolute; top: 5px; right: 5px; z-index: 3; width: 24px; height: 24px; border-radius: 50%; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; cursor: pointer; }
  .${PFX}-yteye { position: absolute; top: 5px; right: 34px; z-index: 3; width: 24px; height: 24px; border-radius: 50%; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; cursor: pointer; }
  .${PFX}-ytclose .${PFX}-ic, .${PFX}-yteye .${PFX}-ic { width: 13px; height: 13px; color: #fff; pointer-events: none; }

  .${PFX}-pill { display: flex; align-items: center; gap: 10px; padding: 10px 12px; min-width: 170px; max-width: 92vw; }
  .${PFX}-pill[data-handle] { cursor: grab; }
  .${PFX}-pill-icon, .${PFX}-pill-theme, .${PFX}-pill-vibe, .${PFX}-note-btn, .${PFX}-head-btn { width: 30px; height: 30px; border-radius: 9px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.14); }
  .${PFX}-pill-icon, .${PFX}-pill-theme, .${PFX}-pill-vibe, .${PFX}-note-btn { cursor: pointer; touch-action: none; }
  .${PFX}-pill-icon .${PFX}-ic, .${PFX}-pill-theme .${PFX}-ic, .${PFX}-pill-vibe .${PFX}-ic, .${PFX}-note-btn .${PFX}-ic, .${PFX}-head-btn .${PFX}-ic { width: 16px; height: 16px; pointer-events: none; }
  .${PFX}-pill-text { font-size: 12px; font-weight: 600; white-space: nowrap; max-width: 140px; overflow: hidden; text-overflow: ellipsis; cursor: grab; touch-action: none; }
  .${PFX}-pill-controls { display: flex; align-items: center; gap: 8px; margin-left: auto; }
  .${PFX}-pill-theme { background: rgba(255,255,255,0.1); }
  .${PFX}-pill-vibe { background: var(--rp-accent, rgba(120,170,255,0.24)); }

  .${PFX}-panel { width: var(--rp-user-w, 264px); max-width: 92vw; flex: 1; min-height: 0; padding: 13px; display: flex; flex-direction: column; gap: 9px; overflow: hidden; }
  .${PFX}-scrollable { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 9px; padding-right: 2px; min-height: 0; }
  .${PFX}-sec { border-top: 1px solid rgba(255,255,255,0.1); padding-top: 8px; display: flex; flex-direction: column; gap: 4px; flex-shrink: 0; }
  .${PFX}-ymin { width: 232px; max-width: 82vw; padding: 11px; display: flex; flex-direction: column; gap: 8px; border-radius: 16px; overflow: hidden; }
  .${PFX}-ymin-body { display: flex; align-items: center; gap: 8px; }
  .${PFX}-ymin-title { flex: 1; min-width: 0; font-size: 12px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: grab; }
  .${PFX}-ymin-controls, .${PFX}-ymin-actions { display: flex; align-items: center; gap: 8px; }

  .${PFX}-note-btn { width: 30px; height: 30px; border-radius: 9px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.14); cursor: pointer; touch-action: none; }
  .${PFX}-note-btn:active { background: rgba(255,255,255,0.24); }
  .${PFX}-note-btn .${PFX}-ic { width: 16px; height: 16px; pointer-events: none; }

  .${PFX}-head { display: flex; align-items: center; gap: clamp(3px, calc((var(--rp-user-w, 264px) - 220px) * 0.06), 12px); flex-wrap: nowrap; flex-shrink: 0; }
  .${PFX}-head-grab { display: flex; align-items: center; flex: 1 1 auto; min-width: 0; height: 30px; cursor: grab; touch-action: none; }
  .${PFX}-head-title { font-size: 12px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; pointer-events: none; }
  .${PFX}-head-spacer { flex: 1; min-width: 6px; height: 26px; cursor: grab; touch-action: none; }
  .${PFX}-head-btn { width: 26px; height: 26px; border-radius: 7px; display: flex; align-items: center; justify-content: center; cursor: pointer; opacity: .7; background: rgba(255,255,255,0.1); flex-shrink: 0; }
  .${PFX}-head-btn:active { opacity: 1; background: rgba(255,255,255,0.24); }
  .${PFX}-head-btn.on { opacity: 1; background: var(--rp-accent, rgba(120,170,255,0.3)); }
  .${PFX}-head-btn .${PFX}-ic { width: 14px; height: 14px; pointer-events: none; }

  .${PFX}-theme-btn { width: 26px; height: 26px; border-radius: 7px; display: flex; align-items: center; justify-content: center; cursor: pointer; opacity: .55; background: rgba(255,255,255,0.08); flex-shrink: 0; }
  .${PFX}-theme-btn:active { opacity: 1; }
  .${PFX}-theme-btn .${PFX}-ic { width: 14px; height: 14px; pointer-events: none; }

  .${PFX}-now { display: flex; flex-direction: column; gap: 1px; min-height: 24px; justify-content: center; text-align: center; padding: 0; flex-shrink: 0; }
  .${PFX}-now-title { font-size: 12px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .${PFX}-now-artist { font-size: 10px; opacity: .6; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .${PFX}-now-status { font-size: 11px; opacity: .55; display: flex; align-items: center; justify-content: center; gap: 6px; }
  .${PFX}-now-pos { font-size: 10px; opacity: .4; margin-top: 1px; }

  .${PFX}-marq { overflow: hidden; white-space: nowrap; position: relative; }
  .${PFX}-marq-inner { display: inline-block; white-space: nowrap; will-change: transform; }
  .${PFX}-marq.run .${PFX}-marq-inner { animation: ${PFX}-marq-move var(--marq-dur, 6s) ease-in-out infinite alternate; }
  @keyframes ${PFX}-marq-move {
    0% { transform: translateX(0); }
    100% { transform: translateX(var(--marq-shift, 0px)); }
  }

  .${PFX}-spin { width: 12px; height: 12px; border: 2px solid rgba(255,255,255,0.25); border-top-color: var(--rp-accent, #7aa6ff); border-radius: 50%; display: inline-block; animation: ${PFX}-rot .7s linear infinite; flex-shrink: 0; }
  @keyframes ${PFX}-rot { to { transform: rotate(360deg); } }

  .${PFX}-search { display: flex; gap: 6px; align-items: center; }
  .${PFX}-search input { flex: 1; min-width: 0; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.12); border-radius: 9px; color: var(--rp-text, #f0f0f5); font-size: 13px; padding: 8px 10px; outline: none; font-family: inherit; }
  .${PFX}-search input::placeholder { color: rgba(255,255,255,0.35); }
  .${PFX}-search-btn { width: 38px; height: 38px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.14); border: none; border-radius: 9px; color: var(--rp-text, #f0f0f5); cursor: pointer; }
  .${PFX}-search-btn:active { background: rgba(255,255,255,0.26); }
  .${PFX}-search-btn .${PFX}-ic { width: 16px; height: 16px; pointer-events: none; }

  .${PFX}-controls { display: flex; align-items: center; justify-content: center; gap: 16px; flex-shrink: 0; }
  .${PFX}-cbtn { background: rgba(255,255,255,0.1); border: none; cursor: pointer; color: var(--rp-text, #f0f0f5); display: flex; align-items:center; justify-content:center; padding: 8px; border-radius: 50%; }
  .${PFX}-cbtn:active { transform: scale(.86); background: rgba(255,255,255,0.24); }
  .${PFX}-cbtn .${PFX}-ic { width: 17px; height: 17px; pointer-events: none; }
  .${PFX}-cbtn.play { background: rgba(255,255,255,0.16); padding: 10px; }
  .${PFX}-cbtn.play .${PFX}-ic { width: 20px; height: 20px; }
  .${PFX}-cbtn-sm { padding: 6px; background: rgba(255,255,255,0.1); }
  .${PFX}-cbtn-sm .${PFX}-ic { width: 14px; height: 14px; }

  .${PFX}-ymin-ctrls { display: flex; align-items: center; justify-content: center; gap: 12px; }
  .${PFX}-vol { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
  .${PFX}-vol .${PFX}-ic { width: 15px; height: 15px; opacity: .55; flex-shrink: 0; }
  .${PFX}-vol input { flex: 1; height:4px; -webkit-appearance: none; appearance: none; background: var(--rp-accent-soft, rgba(122,166,255,0.22)); border-radius: 2px; outline: none; }
  .${PFX}-vol input::-webkit-slider-thumb { -webkit-appearance: none; width: 13px; height: 13px; border-radius: 50%; background: var(--rp-accent, #fff); cursor: pointer; }
  .${PFX}-vol input::-moz-range-thumb { width: 13px; height: 13px; border-radius: 50%; background: var(--rp-accent, #fff); border: none; cursor: pointer; }

  .${PFX}-sec-h { font-size: 10px; font-weight: 700; opacity: .5; text-transform: uppercase; letter-spacing: .04em; margin: 4px 0 2px; display: flex; align-items: center; justify-content: space-between; gap: 6px; }
  .${PFX}-sec-h-actions { display: flex; gap: 4px; }
  .${PFX}-sec-h-btn { opacity: .6; cursor: pointer; display: flex; padding: 2px; }
  .${PFX}-sec-h-btn:active { opacity: 1; }
  .${PFX}-sec-h-btn .${PFX}-ic { width: 14px; height: 14px; pointer-events: none; }

  .${PFX}-empty { font-size: 11px; opacity: .4; text-align: center; padding: 6px 0; }
  .${PFX}-row { display: flex; align-items: center; gap: 6px; padding: 6px 8px; border-radius: 8px; cursor: pointer; background: rgba(255,255,255,0.03); }
  .${PFX}-row:active { background: rgba(255,255,255,0.1); }
  .${PFX}-row.active { background: var(--rp-accent, rgba(120,170,255,0.18)); }
  .${PFX}-row.rprow { flex-wrap: wrap; }
  .${PFX}-row-num { font-size: 10px; opacity: .4; width: 15px; flex-shrink: 0; }
  .${PFX}-row-meta { flex: 1; min-width: 0; }
  .${PFX}-row-t { font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .${PFX}-row-a { font-size: 10px; opacity: .5; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .${PFX}-row-why { font-size: 10px; opacity: .55; font-style: italic; line-height: 1.3; width: 100%; margin-top: 3px; white-space: normal; }
  .${PFX}-row-src { font-size: 9px; opacity: .55; background: rgba(255,255,255,0.1); border-radius: 5px; padding: 1px 5px; flex-shrink: 0; }
  .${PFX}-row-act { opacity: .35; cursor: pointer; display: flex; flex-shrink: 0; padding: 3px; }
  .${PFX}-row-act:active { opacity: 1; }
  .${PFX}-row-act .${PFX}-ic { width: 13px; height: 13px; pointer-events: none; }
  .${PFX}-row-play { opacity: .6; cursor: pointer; display: flex; flex-shrink: 0; padding: 3px; }
  .${PFX}-row-play:active { opacity: 1; }
  .${PFX}-row-play .${PFX}-ic { width: 14px; height: 14px; pointer-events: none; }
  .${PFX}-row-add { opacity: .55; cursor: pointer; display: flex; flex-shrink: 0; padding: 3px; }
  .${PFX}-row-add:active { opacity: 1; }
  .${PFX}-row-add .${PFX}-ic { width: 15px; height: 15px; pointer-events: none; }
  .${PFX}-row-fav { opacity: .55; cursor: pointer; display: flex; flex-shrink: 0; padding: 3px; }
  .${PFX}-row-fav:active { opacity: 1; }
  .${PFX}-row-fav .${PFX}-ic { width: 14px; height: 14px; pointer-events: none; }
  .${PFX}-rfav { opacity: .5; cursor: pointer; display: flex; flex-shrink: 0; padding: 3px; }
  .${PFX}-rfav:active { opacity: 1; }
  .${PFX}-rfav .${PFX}-ic { width: 14px; height: 14px; pointer-events: none; }

  .${PFX}-more { display: flex; align-items: center; justify-content: center; gap: 6px; padding: 6px 8px; border-radius: 8px; background: rgba(255,255,255,0.03); cursor: pointer; font-size: 11px; opacity: .65; }
  .${PFX}-more:active { background: rgba(255,255,255,0.1); opacity: 1; }
  .${PFX}-more .${PFX}-ic { width: 13px; height: 13px; opacity: .6; }
  .${PFX}-more .${PFX}-spin { width: 12px; height: 12px; }

  .${PFX}-savebar { display: flex; gap: 6px; margin-top: 4px; }
  .${PFX}-savebtn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 5px; font-size: 10px; font-weight: 600; padding: 8px 4px; border-radius: 8px; background: rgba(255,255,255,0.1); cursor: pointer; }
  .${PFX}-savebtn:active { background: rgba(255,255,255,0.22); }
  .${PFX}-savebtn .${PFX}-ic { width: 13px; height: 13px; pointer-events: none; }
  .${PFX}-savebtn.danger { background: rgba(255,90,90,0.18); }
  .${PFX}-savebtn.danger:active { background: rgba(255,90,90,0.34); }

  .${PFX}-pop { position: absolute; left: 8px; right: 8px; z-index: 5; background: rgba(20,20,30,0.98); border: 1px solid rgba(255,255,255,0.2); border-radius: 12px; box-shadow: 0 12px 36px rgba(0,0,0,0.6); padding: 10px; display: flex; flex-direction: column; gap: 5px; max-height: 260px; overflow-y: auto; }
  .${PFX}-pop-h { font-size: 11px; font-weight: 700; opacity: .7; display: flex; align-items: center; justify-content: space-between; margin-bottom: 3px; }
  .${PFX}-pop-h .${PFX}-row-act { opacity: .6; }
  .${PFX}-pop-item { display: flex; align-items: center; gap: 6px; padding: 8px 9px; border-radius: 8px; background: rgba(255,255,255,0.06); cursor: pointer; font-size: 12px; border: 1px solid transparent; transition: border-color .2s; }
  .${PFX}-pop-item:active { background: rgba(255,255,255,0.18); }
  .${PFX}-pop-item.flash { border-color: #3ad97f; box-shadow: 0 0 6px rgba(58,217,127,0.5); }
  .${PFX}-pop-item .${PFX}-ic { width: 14px; height: 14px; flex-shrink: 0; pointer-events: none; }
  .${PFX}-pop-new { background: var(--rp-accent, rgba(120,170,255,0.25)); font-weight: 600; }
  .${PFX}-pop-msg { font-size: 12px; opacity: .85; padding: 4px 2px 8px; line-height: 1.4; }
  .${PFX}-pop-btns { display: flex; gap: 6px; }
  .${PFX}-pop-btn { flex: 1; text-align: center; font-size: 12px; font-weight: 600; padding: 8px 4px; border-radius: 8px; background: rgba(255,255,255,0.1); cursor: pointer; }
  .${PFX}-pop-btn:active { background: rgba(255,255,255,0.24); }
  .${PFX}-pop-btn.danger { background: rgba(255,90,90,0.25); }
  .${PFX}-pop-btn.danger:active { background: rgba(255,90,90,0.45); }

  .${PFX}-drawer { border-top: 1px solid rgba(255,255,255,0.1); padding-top: 9px; display: flex; flex-direction: column; gap: 7px; }
  .${PFX}-srcrow { display: flex; flex-wrap: wrap; gap: 6px; }
  .${PFX}-srcbtn { flex: 1 1 28%; text-align: center; font-size: 10px; font-weight: 600; padding: 7px 4px; border-radius: 8px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.1); cursor: pointer; }
  .${PFX}-srcbtn.on { background: var(--rp-accent, rgba(120,170,255,0.28)); border-color: var(--rp-accent, rgba(120,170,255,0.5)); }

  .${PFX}-keybox { display: flex; flex-direction: column; gap: 5px; padding: 8px; border-radius: 8px; background: rgba(0,0,0,0.18); }
  .${PFX}-flabel { font-size: 10px; opacity: .6; text-transform: uppercase; letter-spacing: .03em; margin-top: 2px; }
  .${PFX}-finput { background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; color: var(--rp-text, #f0f0f5); font-size: 12px; padding: 7px 9px; outline: none; font-family: inherit; width: 100%; }
  .${PFX}-flink { font-size: 10px; color: #6cf; text-decoration: none; opacity: .8; cursor: pointer; }
  .${PFX}-ythint { font-size: 10px; opacity: .45; text-align: center; }

  .${PFX}-tabs { display: flex; gap: 6px; }
  .${PFX}-tab { flex: 1; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600; padding: 7px 4px; border-radius: 8px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.1); cursor: pointer; }
  .${PFX}-tab.on { background: var(--rp-accent, rgba(120,170,255,0.28)); border-color: var(--rp-accent, rgba(120,170,255,0.5)); }
  .${PFX}-tab .${PFX}-ic { width: 14px; height: 14px; pointer-events: none; }
  .${PFX}-chips { display: flex; flex-wrap: wrap; gap: 5px; }
  .${PFX}-chip { font-size: 10px; padding: 5px 9px; border-radius: 12px; background: rgba(255,255,255,0.1); cursor: pointer; }
  .${PFX}-chip:active { background: rgba(255,255,255,0.24); }
  .${PFX}-chip.on { background: var(--rp-accent, rgba(120,170,255,0.32)); }
  .${PFX}-chip.meme { background: linear-gradient(90deg, rgba(255,176,46,0.35), rgba(255,47,208,0.35)); font-weight: 700; }
  .${PFX}-chip.meme.on { background: linear-gradient(90deg, rgba(255,176,46,0.8), rgba(255,47,208,0.8)); }

  .${PFX}-acc { border-top: 1px solid rgba(255,255,255,0.08); }
  .${PFX}-acc-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 9px 2px; cursor: pointer; }
  .${PFX}-acc-head-lbl { font-size: 11px; font-weight: 700; opacity: .75; }
  .${PFX}-acc-head .${PFX}-ic { width: 14px; height: 14px; opacity: .6; pointer-events: none; }
  .${PFX}-acc-body { display: flex; flex-direction: column; gap: 7px; padding: 2px 0 8px; }

  .${PFX}-toggle { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 8px 10px; border-radius: 8px; background: rgba(255,255,255,0.05); cursor: pointer; }
  .${PFX}-toggle-label { font-size: 12px; font-weight: 600; }
  .${PFX}-toggle-sub { font-size: 9px; opacity: .5; margin-top: 1px; }
  .${PFX}-sw-track { width: 38px; height: 22px; border-radius: 11px; background: rgba(255,255,255,0.18); position: relative; flex-shrink: 0; transition: background .2s; }
  .${PFX}-sw-track.on { background: var(--rp-accent, rgba(120,170,255,0.7)); }
  .${PFX}-sw-knob { position: absolute; top: 2px; left: 2px; width: 18px; height: 18px; border-radius: 50%; background: #fff; transition: left .2s; }
  .${PFX}-sw-track.on .${PFX}-sw-knob { left: 18px; }

  .${PFX}-numrow { display: flex; gap: 8px; }
  .${PFX}-numbox { flex: 1; display: flex; flex-direction: column; gap: 3px; }
  .${PFX}-numbox input { background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; color: var(--rp-text, #f0f0f5); font-size: 13px; padding: 7px; outline: none; text-align: center; font-family: inherit; width: 100%; }
  .${PFX}-profsel { display: flex; align-items: center; justify-content: space-between; gap: 6px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; padding: 8px 10px; cursor: pointer; font-size: 12px; }
  .${PFX}-profsel .${PFX}-ic { width: 13px; height: 13px; opacity: .6; }
  .${PFX}-quickbtn { display: flex; align-items: center; justify-content: center; gap: 6px; padding: 9px; border-radius: 8px; background: var(--rp-accent, rgba(120,170,255,0.22)); cursor: pointer; font-size: 12px; font-weight: 600; }
  .${PFX}-quickbtn:active { opacity: .8; }
  .${PFX}-quickbtn .${PFX}-ic { width: 15px; height: 15px; }

  .${PFX}-colorpop { display: flex; flex-direction: column; gap: 4px; padding: 10px; border-radius: 10px; background: rgba(0,0,0,0.28); margin-top: 4px; max-height: min(58vh, 420px); overflow-y: auto; min-height: 0; flex-shrink: 1; }
  .${PFX}-colorpop-h { font-size: 10px; font-weight: 700; opacity: .6; text-transform: uppercase; letter-spacing: .04em; margin: 4px 0 2px; }
  .${PFX}-colorrow { display: flex; gap: 6px; align-items: center; }
  .${PFX}-colorrow input[type="color"] { width: 34px; height: 34px; padding: 0; border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; background: transparent; cursor: pointer; flex-shrink: 0; }
  .${PFX}-swatches { display: flex; flex-wrap: wrap; gap: 6px; }
  .${PFX}-sw { width: 22px; height: 22px; border-radius: 6px; cursor: pointer; border: 1px solid rgba(255,255,255,0.2); }
  .${PFX}-oprow { display: flex; align-items: center; gap: 8px; }
  .${PFX}-oprow .${PFX}-ic { width: 14px; height: 14px; opacity: .5; flex-shrink: 0; }
  .${PFX}-oprow input { flex: 1; height: 4px; -webkit-appearance: none; appearance: none; background: rgba(255,255,255,0.18); border-radius: 2px; outline: none; }
  .${PFX}-oprow input::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; border-radius: 50%; background: #fff; cursor: pointer; }
  .${PFX}-oprow input::-moz-range-thumb { width: 14px; height: 14px; border-radius: 50%; background: #fff; border: none; cursor: pointer; }
  .${PFX}-opval { font-size: 10px; opacity: .6; width: 34px; text-align: right; }
  .${PFX}-colorbtns { display: flex; gap: 6px; }
  .${PFX}-cbtn2 { flex: 1; font-size: 11px; font-weight: 600; padding: 7px 4px; border-radius: 8px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.1); cursor: pointer; text-align: center; transition: background .15s, border-color .15s, transform .1s; }
  .${PFX}-cbtn2:active, .${PFX}-cbtn2.flash { background: var(--rp-accent, rgba(120,170,255,0.5)); border-color: var(--rp-accent, rgba(120,170,255,0.7)); transform: scale(.96); }
  .${PFX}-solidtoggle { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 7px 9px; border-radius: 8px; background: rgba(255,255,255,0.05); cursor: pointer; }
  .${PFX}-solidtoggle-lbl { font-size: 11px; font-weight: 600; }

  .${PFX}-resize, .${PFX}-resize-left { position: absolute; width: 22px; height: 22px; z-index: 10; opacity: 0; cursor: nwse-resize; touch-action: none; }
  .${PFX}-resize:hover, .${PFX}-resize-left:hover, .${PFX}-root.resizing .${PFX}-resize, .${PFX}-root.resizing .${PFX}-resize-left { opacity: 0.6; }
  .${PFX}-resize { right: 2px; bottom: 2px; }
  .${PFX}-resize-left { left: 2px; bottom: 2px; cursor: nesw-resize; }

  .${PFX}-root[data-theme="neon"] .${PFX}-glass { background: rgba(10,10,18,var(--rp-bg-alpha, 1)); border: 1px solid var(--rp-accent, #ff2fd0); box-shadow: 0 0 8px var(--rp-accent, rgba(255,47,208,0.4)), 0 0 18px var(--rp-accent, rgba(255,47,208,0.15)); }
  .${PFX}-root[data-theme="glass"] .${PFX}-glass { background: rgba(255,255,255,var(--rp-bg-alpha, 0.08)); backdrop-filter: blur(22px) saturate(160%); -webkit-backdrop-filter: blur(22px) saturate(160%); border: 1px solid rgba(255,255,255,0.22); box-shadow: 0 12px 40px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.18); }
  .${PFX}-root[data-theme="neon"] .${PFX}-head-btn,
  .${PFX}-root[data-theme="neon"] .${PFX}-cbtn,
  .${PFX}-root[data-theme="neon"] .${PFX}-note-btn,
  .${PFX}-root[data-theme="neon"] .${PFX}-theme-btn,
  .${PFX}-root[data-theme="neon"] .${PFX}-pill-theme,
  .${PFX}-root[data-theme="neon"] .${PFX}-pill-icon,
  .${PFX}-root[data-theme="neon"] .${PFX}-fab {
  box-shadow:
    0 0 8px var(--rp-accent, rgba(255,47,208,0.75)),
    0 0 18px var(--rp-accent, rgba(255,47,208,0.35));
  }
  .${PFX}-root[data-theme="neon"].${PFX}-fabmode .${PFX}-fab {
  border: 1px solid var(--rp-accent, #ff2fd0);
  box-shadow:
    0 0 10px var(--rp-accent, rgba(255,47,208,0.85)),
    0 0 24px var(--rp-accent, rgba(255,47,208,0.45)),
    0 0 42px var(--rp-accent, rgba(255,47,208,0.22));
}
  .${PFX}-root[data-theme="neon"] .${PFX}-ic { filter: drop-shadow(0 0 2px var(--rp-accent, rgba(255,47,208,0.7))); }
  .${PFX}-root[data-theme="paper"] .${PFX}-glass { background: rgba(244,236,216,var(--rp-bg-alpha, 1)); border: 1px solid #c9b48a; box-shadow: 0 4px 14px rgba(80,60,30,0.25); color: var(--rp-text, #3a2f1c); }
  .${PFX}-root[data-theme="paper"] { color: var(--rp-text, #3a2f1c); }
  .${PFX}-root[data-theme="paper"] .${PFX}-note-btn, .${PFX}-root[data-theme="paper"] .${PFX}-head-btn, .${PFX}-root[data-theme="paper"] .${PFX}-cbtn, .${PFX}-root[data-theme="paper"] .${PFX}-theme-btn, .${PFX}-root[data-theme="paper"] .${PFX}-pill-icon, .${PFX}-root[data-theme="paper"] .${PFX}-pill-theme, .${PFX}-root[data-theme="paper"] .${PFX}-srcbtn, .${PFX}-root[data-theme="paper"] .${PFX}-savebtn, .${PFX}-root[data-theme="paper"] .${PFX}-row, .${PFX}-root[data-theme="paper"] .${PFX}-tab, .${PFX}-root[data-theme="paper"] .${PFX}-chip, .${PFX}-root[data-theme="paper"] .${PFX}-toggle { background: rgba(120,90,40,0.1); }
  .${PFX}-root[data-theme="paper"] .${PFX}-search input, .${PFX}-root[data-theme="paper"] .${PFX}-finput, .${PFX}-root[data-theme="paper"] .${PFX}-numbox input, .${PFX}-root[data-theme="paper"] .${PFX}-profsel { background: rgba(120,90,40,0.08); color: var(--rp-text, #3a2f1c); border-color: rgba(120,90,40,0.25); }
  .${PFX}-root[data-theme="paper"] .${PFX}-pop { background: #f4ecd8; color: var(--rp-text, #3a2f1c); border-color: #c9b48a; }
  .${PFX}-root[data-theme="paper"] .${PFX}-pop-item { background: rgba(120,90,40,0.1); }
  .${PFX}-root[data-theme="minimal"] .${PFX}-glass { background: color-mix(in srgb, var(--SmartThemeBodyColor, #888) calc(var(--rp-bg-alpha, 0.06) * 100%), transparent); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); border: 1px solid color-mix(in srgb, var(--SmartThemeBodyColor, #888) 16%, transparent); box-shadow: none; color: var(--rp-text, var(--SmartThemeBodyColor, #eee)); }
  .${PFX}-root[data-theme="minimal"] { color: var(--rp-text, var(--SmartThemeBodyColor, #eee)); }
  .${PFX}-root[data-theme="minimal"] .${PFX}-note-btn, .${PFX}-root[data-theme="minimal"] .${PFX}-head-btn, .${PFX}-root[data-theme="minimal"] .${PFX}-cbtn, .${PFX}-root[data-theme="minimal"] .${PFX}-theme-btn, .${PFX}-root[data-theme="minimal"] .${PFX}-pill-icon, .${PFX}-root[data-theme="minimal"] .${PFX}-pill-theme, .${PFX}-root[data-theme="minimal"] .${PFX}-row, .${PFX}-root[data-theme="minimal"] .${PFX}-srcbtn, .${PFX}-root[data-theme="minimal"] .${PFX}-savebtn, .${PFX}-root[data-theme="minimal"] .${PFX}-tab, .${PFX}-root[data-theme="minimal"] .${PFX}-chip, .${PFX}-root[data-theme="minimal"] .${PFX}-toggle { background: color-mix(in srgb, var(--SmartThemeBodyColor, #888) 8%, transparent); }

  .${PFX}-root.${PFX}-solid .${PFX}-row, .${PFX}-root.${PFX}-solid .${PFX}-srcbtn, .${PFX}-root.${PFX}-solid .${PFX}-savebtn, .${PFX}-root.${PFX}-solid .${PFX}-tab, .${PFX}-root.${PFX}-solid .${PFX}-chip, .${PFX}-root.${PFX}-solid .${PFX}-toggle, .${PFX}-root.${PFX}-solid .${PFX}-cbtn2, .${PFX}-root.${PFX}-solid .${PFX}-more, .${PFX}-root.${PFX}-solid .${PFX}-pop-item { background: rgba(0,0,0,0.45) !important; }
  .${PFX}-root.${PFX}-solid .${PFX}-head-btn, .${PFX}-root.${PFX}-solid .${PFX}-cbtn, .${PFX}-root.${PFX}-solid .${PFX}-note-btn, .${PFX}-root.${PFX}-solid .${PFX}-theme-btn, .${PFX}-root.${PFX}-solid .${PFX}-pill-icon, .${PFX}-root.${PFX}-solid .${PFX}-pill-theme, .${PFX}-root.${PFX}-solid .${PFX}-search-btn { background: rgba(0,0,0,0.5) !important; }
  .${PFX}-root.${PFX}-solid .${PFX}-search input, .${PFX}-root.${PFX}-solid .${PFX}-finput, .${PFX}-root.${PFX}-solid .${PFX}-numbox input, .${PFX}-root.${PFX}-solid .${PFX}-profsel, .${PFX}-root.${PFX}-solid .${PFX}-keybox { background: rgba(0,0,0,0.55) !important; }
  .${PFX}-root.${PFX}-solid[data-theme="paper"] .${PFX}-row, .${PFX}-root.${PFX}-solid[data-theme="paper"] .${PFX}-srcbtn, .${PFX}-root.${PFX}-solid[data-theme="paper"] .${PFX}-savebtn, .${PFX}-root.${PFX}-solid[data-theme="paper"] .${PFX}-tab, .${PFX}-root.${PFX}-solid[data-theme="paper"] .${PFX}-chip, .${PFX}-root.${PFX}-solid[data-theme="paper"] .${PFX}-toggle, .${PFX}-root.${PFX}-solid[data-theme="paper"] .${PFX}-cbtn2, .${PFX}-root.${PFX}-solid[data-theme="paper"] .${PFX}-more { background: rgba(120,90,40,0.32) !important; }
  .${PFX}-root.${PFX}-solid[data-theme="paper"] .${PFX}-head-btn, .${PFX}-root.${PFX}-solid[data-theme="paper"] .${PFX}-cbtn, .${PFX}-root.${PFX}-solid[data-theme="paper"] .${PFX}-note-btn, .${PFX}-root.${PFX}-solid[data-theme="paper"] .${PFX}-theme-btn, .${PFX}-root.${PFX}-solid[data-theme="paper"] .${PFX}-pill-icon, .${PFX}-root.${PFX}-solid[data-theme="paper"] .${PFX}-pill-theme { background: rgba(120,90,40,0.4) !important; }

  .${PFX}-root.${PFX}-solid-light .${PFX}-row, .${PFX}-root.${PFX}-solid-light .${PFX}-srcbtn, .${PFX}-root.${PFX}-solid-light .${PFX}-savebtn, .${PFX}-root.${PFX}-solid-light .${PFX}-tab, .${PFX}-root.${PFX}-solid-light .${PFX}-chip, .${PFX}-root.${PFX}-solid-light .${PFX}-toggle, .${PFX}-root.${PFX}-solid-light .${PFX}-cbtn2, .${PFX}-root.${PFX}-solid-light .${PFX}-more, .${PFX}-root.${PFX}-solid-light .${PFX}-pop-item { background: rgba(255,255,255,0.5) !important; }
  .${PFX}-root.${PFX}-solid-light .${PFX}-head-btn, .${PFX}-root.${PFX}-solid-light .${PFX}-cbtn, .${PFX}-root.${PFX}-solid-light .${PFX}-note-btn, .${PFX}-root.${PFX}-solid-light .${PFX}-theme-btn, .${PFX}-root.${PFX}-solid-light .${PFX}-pill-icon, .${PFX}-root.${PFX}-solid-light .${PFX}-pill-theme, .${PFX}-root.${PFX}-solid-light .${PFX}-search-btn { background: rgba(255,255,255,0.55) !important; }
  .${PFX}-root.${PFX}-solid-light .${PFX}-search input, .${PFX}-root.${PFX}-solid-light .${PFX}-finput, .${PFX}-root.${PFX}-solid-light .${PFX}-numbox input, .${PFX}-root.${PFX}-solid-light .${PFX}-profsel, .${PFX}-root.${PFX}-solid-light .${PFX}-keybox { background: rgba(255,255,255,0.6) !important; }

  .${PFX}-root.${PFX}-solid .${PFX}-row.active, .${PFX}-root.${PFX}-solid-light .${PFX}-row.active,
  .${PFX}-root.${PFX}-solid .${PFX}-srcbtn.on, .${PFX}-root.${PFX}-solid-light .${PFX}-srcbtn.on,
  .${PFX}-root.${PFX}-solid .${PFX}-tab.on, .${PFX}-root.${PFX}-solid-light .${PFX}-tab.on,
  .${PFX}-root.${PFX}-solid .${PFX}-chip.on, .${PFX}-root.${PFX}-solid-light .${PFX}-chip.on,
  .${PFX}-root.${PFX}-solid .${PFX}-head-btn.on, .${PFX}-root.${PFX}-solid-light .${PFX}-head-btn.on,
  .${PFX}-root.${PFX}-solid .${PFX}-sw-track.on, .${PFX}-root.${PFX}-solid-light .${PFX}-sw-track.on,
  .${PFX}-root.${PFX}-solid .${PFX}-quickbtn, .${PFX}-root.${PFX}-solid-light .${PFX}-quickbtn,
  .${PFX}-root.${PFX}-solid .${PFX}-pop-new, .${PFX}-root.${PFX}-solid-light .${PFX}-pop-new,
  .${PFX}-root.${PFX}-solid .${PFX}-pill-vibe, .${PFX}-root.${PFX}-solid-light .${PFX}-pill-vibe,
  .${PFX}-root.${PFX}-solid .${PFX}-cbtn2:active, .${PFX}-root.${PFX}-solid-light .${PFX}-cbtn2:active,
  .${PFX}-root.${PFX}-solid .${PFX}-cbtn2.flash, .${PFX}-root.${PFX}-solid-light .${PFX}-cbtn2.flash,
  .${PFX}-root.${PFX}-solid .${PFX}-fab.vibe, .${PFX}-root.${PFX}-solid-light .${PFX}-fab.vibe { background: var(--rp-accent, rgba(120,170,255,0.7)) !important; }

  .${PFX}-bgrow { display: flex; gap: 8px; align-items: center; }
  .${PFX}-bgfile-label { flex: 1; display: inline-block; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; padding: 7px 9px; font-size: 11px; cursor: pointer; text-align: center; color: #ccc; }
  .${PFX}-bgfile-input { display: none; }
  .${PFX}-bgfile-name { font-size: 10px; opacity: 0.7; margin-top: 2px; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  `;
