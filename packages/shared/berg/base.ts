import type { BergManager } from "./manager";

export abstract class BergComponent {
  constructor(protected bMgr: BergManager) {}
  /* package-private */ _resetManager(mgr: BergManager) {
    this.bMgr = mgr;
  }
  cleanup() {}
}