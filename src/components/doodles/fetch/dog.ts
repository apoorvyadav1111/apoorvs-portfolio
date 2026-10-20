// The dog, seen from above, centred on (0, 0) and facing along +x (rotate the
// canvas to point it anywhere). It comes in two parts so it can stand: its
// paws on the ground, and its body drawn a little higher (the game joins them
// with legs). Paws pad along while it runs, the tail swings, it sits up
// shorter, and whatever it's carrying is drawn in its mouth.

export interface DogPose {
  run: number; // stride phase, radians
  moving: boolean;
  sit: number; // 0 standing → 1 sitting
  wag: number; // tail swing phase, radians
  blink: boolean;
}

const FUR = "#c8913f";
const FUR_DARK = "#9a6a2a";
const NOSE = "#2a1d14";

// Where its mouth is, from its centre along the way it faces
export const MOUTH = 31;

// Where its four paws are (front pair first), stepping in turn as it runs
export function paws(p: DogPose) {
  const shrink = 1 - p.sit * 0.28;
  const at = (x: number, y: number, phase: number, front: boolean) => ({
    x: x * (front ? 1 : shrink) + (p.moving ? Math.sin(p.run + phase) * 6 : 0),
    y,
    front,
  });
  return [at(13, -9, 0, true), at(13, 9, Math.PI, true), at(-14, -9, Math.PI, false), at(-14, 9, 0, false)];
}

export function drawPaws(ctx: CanvasRenderingContext2D, p: DogPose) {
  ctx.fillStyle = FUR_DARK;
  for (const paw of paws(p)) {
    if (!paw.front && p.sit > 0.6) continue; // tucked under when sitting
    ctx.beginPath();
    ctx.ellipse(paw.x, paw.y, 4.5, 3.2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

export const LEG_COLOUR = FUR_DARK;

export function drawDog(ctx: CanvasRenderingContext2D, p: DogPose, collar: string, carrying?: () => void) {
  const shrink = 1 - p.sit * 0.28;

  // Tail, swinging side to side
  ctx.strokeStyle = FUR;
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  const tailX = -20 * shrink;
  ctx.beginPath();
  ctx.moveTo(tailX, 0);
  ctx.quadraticCurveTo(tailX - 8, Math.sin(p.wag) * 5, tailX - 15, Math.sin(p.wag) * 12);
  ctx.stroke();

  // Body, with a darker saddle along the back
  ctx.fillStyle = FUR;
  ctx.beginPath();
  ctx.ellipse(-2 * shrink, 0, 21 * shrink, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = FUR_DARK;
  ctx.globalAlpha = 0.35;
  ctx.beginPath();
  ctx.ellipse(-4 * shrink, 0, 13 * shrink, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Collar
  ctx.strokeStyle = collar;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(12, 0, 3, 8.5, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Head, snout, nose and eyes
  ctx.fillStyle = FUR;
  ctx.beginPath();
  ctx.arc(19, 0, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(27, 0, 7, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = NOSE;
  ctx.beginPath();
  ctx.arc(33, 0, 2.6, 0, Math.PI * 2);
  ctx.fill();
  for (const side of [-1, 1]) {
    if (p.blink) {
      ctx.strokeStyle = NOSE;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(22, side * 3.5);
      ctx.lineTo(25, side * 3.5);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(23.5, side * 4, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Floppy ears, flapping a little as it runs
  ctx.fillStyle = FUR_DARK;
  for (const side of [-1, 1]) {
    const flap = p.moving ? Math.sin(p.run * 2 + side) * 0.25 : 0;
    ctx.save();
    ctx.translate(15, side * 8);
    ctx.rotate(side * (0.5 + flap));
    ctx.beginPath();
    ctx.ellipse(-2, side * 3, 6, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Whatever it's carrying
  if (carrying) {
    ctx.save();
    ctx.translate(MOUTH + 2, 0);
    carrying();
    ctx.restore();
  }
}
