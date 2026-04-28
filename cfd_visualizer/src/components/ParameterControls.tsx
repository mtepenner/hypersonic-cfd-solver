type Props = {
  machNumber: number;
  angleOfAttackDeg: number;
  onMachChange: (value: number) => void;
  onAngleChange: (value: number) => void;
  onApply: () => void;
};

export function ParameterControls({ machNumber, angleOfAttackDeg, onMachChange, onAngleChange, onApply }: Props) {
  return (
    <section className="panel stack-gap">
      <div className="section-heading">
        <span>Flight Conditions</span>
        <small>Interactive solver inputs</small>
      </div>

      <label className="slider-group">
        <div className="metric-row">
          <span>Mach number</span>
          <strong>{machNumber.toFixed(1)}</strong>
        </div>
        <input type="range" min="3" max="18" step="0.1" value={machNumber} onChange={(event) => onMachChange(Number(event.target.value))} />
      </label>

      <label className="slider-group">
        <div className="metric-row">
          <span>Angle of attack</span>
          <strong>{angleOfAttackDeg.toFixed(1)} deg</strong>
        </div>
        <input type="range" min="-12" max="18" step="0.5" value={angleOfAttackDeg} onChange={(event) => onAngleChange(Number(event.target.value))} />
      </label>

      <button type="button" className="apply-button" onClick={onApply}>
        Recompute Flow Field
      </button>
    </section>
  );
}
