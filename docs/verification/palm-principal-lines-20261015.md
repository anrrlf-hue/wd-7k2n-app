# Principal-line extraction feasibility review

- Branch: `exp/palm-principal-lines-20261015`
- Baseline preserved: integration `48d2c47`
- Scope: feasibility only; no product-path or production change

## Reference requirements

Wu, Wang, and Zhang define the life line as a smooth curve originating in region ABML, crossing segment AH, and whose endpoint chord does not cross EQ. The method first derives palm-boundary key points A–G, then extracts line initials from the boundary-defined regions before recursive tracing. See the [paper's definitions and key-point detection](https://www.cs.unm.edu/~williams/cvpr/lakshman/271.pdf), pp. 1–3.

## Local input check

The two existing Library photos were inspected locally only. No original, personal output, or overlay is committed. A small RGB skin-mask precheck using the already-installed `sharp` package was used only to test whether a closed palm boundary could be recovered without introducing a model or external package.

At a 512-pixel-wide working scale, the largest candidate components were:

- Photo A: 183,305 pixels, bbox `[0, 12, 476, 682]`
- Photo B: 217,701 pixels, bbox `[0, 29, 502, 682]`

Both components touch the image sides and bottom and include similarly colored background. They are not closed hand boundaries. Existing MediaPipe landmarks can indicate a thumb-side area, but substituting those landmarks for the paper's boundary-derived A–G construction would no longer be an independent implementation of the cited method.

## Decision

The required boundary and thumb-side line-initial region were not reliably available. No principal-line tracker or overlay was implemented, and no hardcoded curve or coordinate was introduced. This method-specific feasibility test is closed as blocked by capture/background conditions; it does not evaluate the paper's reported accuracy and does not claim anything about other palm lines.
