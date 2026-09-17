import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { DISPLAY_FONT_FAMILIES, DISPLAY_FONT_WEIGHTS, type DisplayTextStyle } from '@cueclock/shared';
import { useEngineSocket } from '../shared/useEngineSocket';
import { formatClock, formatDuration } from '../shared/format';
import './display.css';

type FontRef = Pick<DisplayTextStyle, 'fontFamily' | 'customGoogleFont'>;

/** The actual Google Fonts family name to load/use, or null for a system font (or an empty custom-font field). */
function googleFamilyFor(style: FontRef): string | null {
  if (style.fontFamily === 'custom') return style.customGoogleFont?.trim() || null;
  const def = DISPLAY_FONT_FAMILIES.find((f) => f.id === style.fontFamily);
  return def?.source === 'google' ? def.googleFamily : null;
}

function fontFamilyCss(style: FontRef): string {
  const googleFamily = googleFamilyFor(style);
  if (style.fontFamily === 'custom') return googleFamily ? `'${googleFamily}', sans-serif` : DISPLAY_FONT_FAMILIES[0].css;
  return (DISPLAY_FONT_FAMILIES.find((f) => f.id === style.fontFamily) ?? DISPLAY_FONT_FAMILIES[0]).css;
}

const loadedGoogleFonts = new Set<string>();

/** Injects a Google Fonts <link> the first time a given font is actually selected. No-ops for system fonts. */
function ensureGoogleFontLoaded(style: FontRef) {
  const family = googleFamilyFor(style);
  if (!family || loadedGoogleFonts.has(family)) return;
  loadedGoogleFonts.add(family);
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  // Request every weight the picker offers, not just 400/700, since weight is now
  // user-selectable - browsers safely ignore any axis a given family doesn't have.
  link.href = `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, '+')}:wght@${DISPLAY_FONT_WEIGHTS.join(';')}&display=swap`;
  document.head.appendChild(link);
}

/** fontFamily/color/scale only - safe to put on a wrapping element, since child elements
 * at a different font-size (e.g. the block-name line under the giant timer digits) should
 * inherit these but not the weight/letter-spacing below (those are sized for the digits). */
function textStyleVars(style: DisplayTextStyle, colorOverride: boolean): CSSProperties {
  return {
    fontFamily: fontFamilyCss(style),
    ...(colorOverride && style.color !== 'auto' ? { color: style.color } : {}),
    ['--scale' as string]: style.sizePercent / 100,
  };
}

/** fontWeight/letterSpacing, meant to be applied directly to the actual sized text element -
 * NOT a wrapper around it. letter-spacing's "em" resolves against whichever element it's
 * declared on, so putting it on a wrapper with a normal (~16px) font-size while the real
 * text is 20x larger in a child would compute a barely-visible spacing instead of the
 * intended one, since CSS inherits the already-resolved pixel value, not the "em" itself. */
function scaledTextStyleVars(style: DisplayTextStyle): CSSProperties {
  return {
    fontWeight: style.weight,
    letterSpacing: `${style.letterSpacingEm}em`,
  };
}

export function Display() {
  const { state, status } = useEngineSocket();
  const [now, setNow] = useState(() => Date.now());
  const [keyFill, setKeyFill] = useState(() => new URLSearchParams(window.location.search).get('mode') === 'key');

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  const displaySettings = state?.displaySettings;

  useEffect(() => {
    if (!displaySettings) return;
    ensureGoogleFontLoaded(displaySettings.timerStyle);
    ensureGoogleFontLoaded(displaySettings.timeBelowStyle);
  }, [
    displaySettings?.timerStyle.fontFamily,
    displaySettings?.timerStyle.customGoogleFont,
    displaySettings?.timeBelowStyle.fontFamily,
    displaySettings?.timeBelowStyle.customGoogleFont,
  ]);

  const nextBlock = useMemo(
    () => state?.blockProjections.find((b) => b.status === 'upcoming') ?? null,
    [state],
  );
  const activeBlock = useMemo(
    () => state?.blockProjections.find((b) => b.status === 'active') ?? null,
    [state],
  );

  function enterFullscreen() {
    document.documentElement.requestFullscreen?.().catch(() => undefined);
  }

  const showClock = displaySettings?.mode === 'clock';
  // The clock reading is its own thing, not a timer readout - it never takes the running
  // timer's warning/critical/overtime color or flash, even while that timer is overtime.
  const colorState = keyFill || showClock ? 'normal' : state?.colorState ?? 'normal';
  const flashing = !keyFill && !showClock && colorState === 'overtime' && displaySettings?.flashOnOvertime;
  const isCountUp = state?.mode === 'countup';
  const timerSeconds = isCountUp ? Math.abs(state?.remainingSeconds ?? 0) : state?.remainingSeconds ?? 0;

  const timeBelowVisible = !!displaySettings && !showClock && displaySettings.showTimeBelow;
  // If both readouts share a position they'd otherwise stack directly on top of each other
  // (same grid cell) - render the time-below readout inside the timer's own wrapper instead,
  // so it always ends up timer-then-clock, top-to-bottom.
  const samePosition = timeBelowVisible && displaySettings!.timerStyle.position === displaySettings!.timeBelowStyle.position;

  const use24h = state?.timerSettings.use24HourClock ?? false;

  const timeBelowNode = timeBelowVisible && (
    <div
      className={`display__time-below ${samePosition ? '' : `pos-${displaySettings!.timeBelowStyle.position}`}`}
      style={{ ...textStyleVars(displaySettings!.timeBelowStyle, !keyFill), ...scaledTextStyleVars(displaySettings!.timeBelowStyle) }}
    >
      {formatClock(now, { use24h })}
    </div>
  );

  return (
    <div
      className={`display display--${colorState} ${keyFill ? 'display--keyfill' : ''}`}
      onClick={enterFullscreen}
    >
      {status !== 'open' && (
        <div className="display__banner display__banner--error">
          Reconnecting to CueClock server…
        </div>
      )}

      {displaySettings && (
        <div
          className={`display__timer-wrap pos-${displaySettings.timerStyle.position}`}
          style={textStyleVars(displaySettings.timerStyle, !keyFill)}
        >
          <div className={`display__timer ${flashing ? 'display__timer--flash' : ''}`}>
            {showClock ? formatClock(now, { use24h }) : formatDuration(timerSeconds)}
          </div>
          {!showClock && displaySettings.showBlockName && activeBlock && (
            <div className="display__block-name">{activeBlock.name}</div>
          )}
          {!showClock && displaySettings.showNextBlock && nextBlock && (
            <div className="display__next">
              Next: {nextBlock.name} ({formatDuration(nextBlock.durationSeconds)})
            </div>
          )}
          {samePosition && timeBelowNode}
        </div>
      )}

      {!samePosition && timeBelowNode}

      {!keyFill && state?.message && <div className="display__message">{state.message}</div>}

      <button
        className="display__keyfill-toggle"
        title={keyFill ? 'Switch to normal color output' : 'Switch to black & white key/fill output'}
        onClick={(e) => {
          e.stopPropagation();
          setKeyFill((v) => !v);
        }}
      >
        {keyFill ? '◐' : '◑'}
      </button>
    </div>
  );
}
