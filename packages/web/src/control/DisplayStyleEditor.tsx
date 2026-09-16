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
            {DISPLAY_FONT_FAMILIES.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        </label>

        <label className="style-editor__field">
          <span>Color</span>
          <div className="style-editor__color">
            {allowAuto && (
              <button
                className={`btn btn--chip ${style.color === 'auto' ? 'active' : ''}`}
                onClick={() => patch({ color: 'auto' })}
              >
                Auto
              </button>
            )}
            <input
              type="color"
              className="style-editor__swatch"
              value={style.color === 'auto' ? '#f2f2f2' : style.color}
              onChange={(e) => patch({ color: e.target.value })}
            />
          </div>
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
