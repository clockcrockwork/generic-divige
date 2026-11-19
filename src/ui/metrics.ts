export type Family =
  | "down → visual"
  | "move → position"
  | "up → commit"
  | "commit → refill"
  | "recipe → feedback";
export class Metrics {
  private samples = new Map<Family, number[]>();
  record(name: Family, ms: number) {
    if (!Number.isFinite(ms) || ms < 0) return;
    const values = this.samples.get(name) ?? [];
    values.push(ms);
    if (values.length > 120) values.shift();
    this.samples.set(name, values);
  }
  summary() {
    return [...this.samples].map(([name, v]) => ({
      name,
      count: v.length,
      min: Math.min(...v),
      max: Math.max(...v),
      mean: v.reduce((a, b) => a + b, 0) / v.length,
    }));
  }
}
