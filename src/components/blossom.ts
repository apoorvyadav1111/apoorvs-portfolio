// Cherry blossom shapes, shared by the spring particles and its celebration.

// One petal: rounded, with the notch at the tip that cherry petals have.
// Drawn pointing up from (0, 0), `s` tall.
export function petalPath(ctx: CanvasRenderingContext2D, s: number) {
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(-s * 0.9, -s * 0.3, -s * 0.75, -s * 1.1, -s * 0.2, -s * 1.12);
  ctx.lineTo(0, -s * 0.92);
  ctx.lineTo(s * 0.2, -s * 1.12);
  ctx.bezierCurveTo(s * 0.75, -s * 1.1, s * 0.9, -s * 0.3, 0, 0);
}

// A loose petal, centred on (0, 0)
export function drawPetal(ctx: CanvasRenderingContext2D, s: number) {
  ctx.save();
  ctx.translate(0, s * 0.55);
  ctx.beginPath();
  petalPath(ctx, s);
  ctx.fill();
  ctx.restore();
}

// A whole flower: five petals around a small golden centre
export function drawBlossom(ctx: CanvasRenderingContext2D, s: number, centre: string) {
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    petalPath(ctx, s * 0.6);
    ctx.rotate((Math.PI * 2) / 5);
  }
  ctx.fill();
  ctx.fillStyle = centre;
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.14, 0, Math.PI * 2);
  ctx.fill();
}
