// The dog, drawn side-on with its feet at (0, 0), facing right (flip the
// canvas to face left). One function covers every pose: standing, running
// (legs swinging with `run`), sitting, crouched and eager, mid-leap, and
// carrying the ball.

export interface DogPose {
  run: number; // stride phase, radians; legs only move while `moving`
  moving: boolean;
  sit: number; // 0 standing → 1 sitting
  crouch: number; // 0 → 1, ready to spring after a ball you're holding
  air: boolean; // leaping: legs tucked
  wag: number; // tail swing, radians
  tilt: number; // head tilt, radians (curious)
  ball: boolean; // ball in its mouth
  blink: boolean;
}

const FUR = "#c8913f";
const FUR_DARK = "#9a6a2a";
const BELLY = "#e7c58f";
const NOSE = "#2a1d14";
export const BALL = "#d8e34a";

export function drawDog(ctx: CanvasRenderingContext2D, p: DogPose, collar: string) {
  const crouch = p.crouch * (1 - p.sit);
  const bodyY = -30 + crouch * 5;

  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Legs: back pair behind the body, front pair in front
  const leg = (hipX: number, offset: number, back: boolean) => {
    const swing = p.moving && !p.air ? Math.sin(p.run + offset) : 0;
    const lift = p.moving && !p.air ? Math.max(0, Math.cos(p.run + offset)) * 6 : 0;
    let footX = hipX + swing * 11;
    let footY = -lift;
    if (p.air) {
      footX = hipX + (back ? -9 : 9);
      footY = -12;
    }
    // Sitting folds the hind legs under; the front ones stay straight
    if (back && p.sit > 0) {
      footX = footX * (1 - p.sit) + (hipX + 10) * p.sit;
      footY = footY * (1 - p.sit);
    }
    const hipY = bodyY + 8 + (back ? p.sit * 14 : 0);
    ctx.strokeStyle = back ? FUR_DARK : FUR;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(hipX, hipY);
    ctx.quadraticCurveTo(hipX + (back ? -3 : 2), (hipY + footY) / 2, footX, footY);
    ctx.stroke();
  };
  leg(-17, Math.PI, true);
  leg(14, 0, true);

  // Tail, swinging
  ctx.save();
  ctx.translate(-24, bodyY - 3 + p.sit * 12);
  ctx.rotate(-0.9 + p.sit * 0.7 + Math.sin(p.wag) * 0.45);
  ctx.strokeStyle = FUR;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-10, -6, -16, -18);
  ctx.stroke();
  ctx.restore();

  // Body, tipping back as it sits
  ctx.save();
  ctx.translate(-2, bodyY);
  ctx.rotate(-p.sit * 0.5);
  ctx.fillStyle = FUR;
  ctx.beginPath();
  ctx.ellipse(0, 0, 27, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = BELLY;
  ctx.beginPath();
  ctx.ellipse(6, 6, 16, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  leg(-12, 0, false);
  leg(18, Math.PI, false);

  // Head: up when sitting, down and forward when crouched
  const headX = 27 - p.sit * 3 + crouch * 4;
  const headY = bodyY - 15 - p.sit * 10 + crouch * 7;
  ctx.save();
  ctx.translate(headX, headY);
  ctx.rotate(p.tilt);
  // Neck
  ctx.fillStyle = FUR;
  ctx.beginPath();
  ctx.ellipse(-6, 8, 7, 10, -0.5, 0, Math.PI * 2);
  ctx.fill();
  // Collar
  ctx.strokeStyle = collar;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-12, 9);
  ctx.lineTo(-2, 13);
  ctx.stroke();
  // Head and snout
  ctx.fillStyle = FUR;
  ctx.beginPath();
  ctx.arc(0, 0, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(10, 3, 9, 6, 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = NOSE;
  ctx.beginPath();
  ctx.arc(18, 1.5, 2.4, 0, Math.PI * 2);
  ctx.fill();
  // Eye
  if (p.blink) {
    ctx.strokeStyle = NOSE;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(1, -3);
    ctx.lineTo(5, -3);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(3, -3, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
  // Floppy ear
  ctx.fillStyle = FUR_DARK;
  ctx.beginPath();
  ctx.moveTo(-5, -9);
  ctx.quadraticCurveTo(-12, -2, -8, 9);
  ctx.quadraticCurveTo(-2, 3, -1, -8);
  ctx.closePath();
  ctx.fill();
  // The ball, held in its mouth
  if (p.ball) {
    ctx.fillStyle = BALL;
    ctx.beginPath();
    ctx.arc(17, 8, 7, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// Where the mouth is, relative to the feet (facing right): where the dog
// catches and carries the ball
export function mouthOffset(p: Pick<DogPose, "sit" | "crouch">) {
  const crouch = p.crouch * (1 - p.sit);
  const bodyY = -30 + crouch * 5;
  return { x: 27 - p.sit * 3 + crouch * 4 + 17, y: bodyY - 15 - p.sit * 10 + crouch * 7 + 8 };
}
