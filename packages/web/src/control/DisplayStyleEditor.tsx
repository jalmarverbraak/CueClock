import { DISPLAY_FONT_FAMILIES, DISPLAY_FONT_WEIGHTS, type DisplayPosition, type DisplayTextStyle } from '@cueclock/shared';

const POSITIONS: DisplayPosition[] = [
  'top-left',
  'top-center',
  'top-right',
  'center-left',
  'center',
  'center-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
];

const SIZE_MIN = 25;
const SIZE_MAX = 800;
const SPACING_MIN = -0.1;
const SPACING_MAX = 0.3;

const SYSTEM_FONTS = DISPLAY_FONT_FAMILIES.filter((f) => f.source === 'system');
const GOOGLE_FONTS = DISPLAY_FONT_FAMILIES.filter((f) => f.source === 'google');

interface Props {
  title: string;
  style: DisplayTextStyle;
  allowAuto: boolean;
  onChange: (style: DisplayTextStyle) => void;
}

export function DisplayStyleEditor({ title, style, allowAuto, onChange }: Props) {
  function patch(p: Partial<DisplayTextStyle>) {
    onChange({ ...style, ...p });
  }

  const isAuto = allowAuto && style.color === 'auto';

  return (
    <div className="style-editor">
      <h3>{title}</h3>
      <div className="style-editor__row">
        <label className="style-editor__field">
          <span>Font</span>
          <select
            className="text-input"
            value={style.fontFamily}
            onChange={(e) => patch({ fontFamily: e.target.value as DisplayTextStyle['fontFamily'] })}
          >
            <optgroup label="System (works offline)">
              {SYSTEM_FONTS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Google Fonts (needs internet on first use)">
              {GOOGLE_FONTS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
              <option value="custom">Custom Google Font…</option>
            </optgroup>
          </select>
          {style.fontFamily === 'custom' && (
            <input
              className="text-input"
              placeholder="Exact Google Fonts name, e.g. Montserrat"
              value={style.customGoogleFont ?? ''}
              onChange={(e) => patch({ customGoogleFont: e.target.value })}
            />
          )}
        </label>

        <label className="style-editor__field">
          <span>Color</span>
          <div className="style-editor__color">
            {allowAuto && (
              <div className="segmented">
                <button className={`segmented__option ${isAuto ? 'active' : ''}`} onClick={() => patch({ color: 'auto' })}>
                  Auto
                </button>
                <button
                  className={`segmented__option ${!isAuto ? 'active' : ''}`}
                  onClick={() => !isAuto || patch({ color: '#f2f2f2' })}
                >
                  Custom
                </button>
              </div>
            )}
            <input
              type="color"
              className="style-editor__swatch"
              disabled={isAuto}
              value={style.color === 'auto' ? '#f2f2f2' : style.color}
              onChange={(e) => patch({ color: e.target.value })}
            />
          </div>
          {allowAuto && isAuto && (
            <span className="style-editor__hint">Auto follows the normal/warning/critical/overtime status color.</span>
          )}
        </label>

        <label className="style-editor__field">
          <span>Size</span>
          <div className="style-editor__size">
            <input
              type="range"
              min={SIZE_MIN}
              max={SIZE_MAX}
              step={5}
              value={style.sizePercent}
              onChange={(e) => patch({ sizePercent: Number(e.target.value) })}
            />
            <input
              type="number"
              className="text-input style-editor__size-input"
              min={SIZE_MIN}
              max={SIZE_MAX}
              step={1}
              value={style.sizePercent}
              onChange={(e) => {
                const value = Number(e.target.value);
                if (Number.isNaN(value)) return;
                patch({ sizePercent: Math.min(SIZE_MAX, Math.max(SIZE_MIN, value)) });
              }}
            />
            <span>%</span>
          </div>
        </label>
      </div>

      <div className="style-editor__row">
        <label className="style-editor__field">
          <span>Weight</span>
          <select
            className="text-input"
            value={style.weight}
            onChange={(e) => patch({ weight: Number(e.target.value) as DisplayTextStyle['weight'] })}
          >
            {DISPLAY_FONT_WEIGHTS.map((w) => (
              <option key={w} value={w}>
                {w}
                {w === 400 ? ' (Regular)' : w === 700 ? ' (Bold)' : ''}
              </option>
            ))}
          </select>
        </label>

        <label className="style-editor__field">
          <span>Letter spacing</span>
          <div className="style-editor__size">
            <input
              type="range"
              min={SPACING_MIN}
              max={SPACING_MAX}
              step={0.01}
              value={style.letterSpacingEm}
              onChange={(e) => patch({ letterSpacingEm: Number(e.target.value) })}
            />
            <input
              type="number"
              className="text-input style-editor__size-input"
              min={SPACING_MIN}
              max={SPACING_MAX}
              step={0.01}
              value={style.letterSpacingEm}
              onChange={(e) => {
                const value = Number(e.target.value);
                if (Number.isNaN(value)) return;
                patch({ letterSpacingEm: Math.min(SPACING_MAX, Math.max(SPACING_MIN, value)) });
              }}
            />
            <span>em</span>
          </div>
        </label>
      </div>

      <div className="style-editor__field">
        <span>Position</span>
        <div className="position-grid">
          {POSITIONS.map((p) => (
            <button
              key={p}
              className={`position-grid__cell ${style.position === p ? 'active' : ''}`}
              title={p.replace('-', ' ')}
              onClick={() => patch({ position: p })}
            >
              ●
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
