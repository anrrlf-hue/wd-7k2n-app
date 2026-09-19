export function shouldStartAmbientAudio({ userInitiated, muted }) {
  return userInitiated && !muted;
}
