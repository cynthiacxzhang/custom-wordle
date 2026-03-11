export default function Tile({ letter = "", status = "empty", reveal = false, bounce = false, index = 0 }) {
  const delay = `${index * 80}ms`;
  const style = (reveal || bounce) ? { "--delay": delay } : undefined;

  let className = `tile tile--${status}`;
  if (bounce) className += " tile--bounce";

  return (
    <div className={className} style={style} data-reveal={reveal || undefined}>
      {letter.toUpperCase()}
    </div>
  );
}
