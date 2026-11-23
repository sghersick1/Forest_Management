/*
 * Size and position of the details-panel scrollbar thumb.
 * The thumb stays inside the scrollport and is absent when the text fits.
 */

export function detailsThumb(scrollHeight: number, clientHeight: number, scrollTop: number) {
  const overflow = scrollHeight - clientHeight;
  if (overflow <= 1 || clientHeight <= 0) return null;
  const height = Math.min(clientHeight, Math.max(18, (clientHeight * clientHeight) / scrollHeight));
  const travel = clientHeight - height;
  const top = travel * (clamp(scrollTop, 0, overflow) / overflow);
  return { height, top };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
