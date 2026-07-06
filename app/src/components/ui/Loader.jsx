export default function Loader({
  variant = 'block',
  size = 'md',
  label = '',
  className = '',
}) {
  const classes = ['loader', `loader--${variant}`, `loader--${size}`, className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} role="status" aria-live="polite" aria-busy="true">
      <span className="loader__spinner" aria-hidden="true" />
      {label ? <span className="loader__label">{label}</span> : null}
    </div>
  );
}
