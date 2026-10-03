export class Effects {
  private running = new Set<Animation>();
  speed = 1;
  flash(element: HTMLElement) {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const a = element.animate(
      [
        { filter: "brightness(1.8)", transform: "translateY(-3px)" },
        { filter: "brightness(1)", transform: "translateY(0)" },
      ],
      { duration: 360 },
    );
    a.playbackRate = this.speed;
    this.running.add(a);
    a.onfinish = () => this.running.delete(a);
    a.oncancel = () => this.running.delete(a);
  }
  setSpeed(value: number) {
    if (!Number.isFinite(value)) return;
    this.speed = Math.max(0.25, Math.min(2, value));
    this.running.forEach((a) => a.updatePlaybackRate(this.speed));
  }
  clear() {
    this.running.forEach((a) => a.cancel());
    this.running.clear();
  }
}
