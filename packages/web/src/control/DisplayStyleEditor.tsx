import { DISPLAY_FONT_FAMILIES, type DisplayPosition, type DisplayTextStyle } from '@cueclock/shared';

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
            </optgroup>
          </select>
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
          <span>Size ({style.sizePercent}%)</span>
          <input
            type="range"
            min={40}
            max={200}
            step={10}
            value={style.sizePercent}
            onChange={(e) => patch({ sizePercent: Number(e.target.value) })}
          />
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
