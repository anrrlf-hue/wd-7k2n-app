import { installAdditionalVerticalCreaseWorker } from "./additional-vertical-crease-worker";

installAdditionalVerticalCreaseWorker(self as unknown as {
  onmessage: ((event: MessageEvent) => void) | null;
  postMessage(message: unknown): void;
});
