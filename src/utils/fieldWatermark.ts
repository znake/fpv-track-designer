export const FIELD_WATERMARK_TEXT = '#FPVOOE'

// troika-three-text renders the default Roboto; '#FPVOOE' advances roughly 0.63 em
// per character. 0.72 keeps headroom so the text never leaves the grass.
const APPROXIMATE_ADVANCE_PER_CHARACTER_EM = 0.72
const MAX_ALONG_AXIS_RATIO = 0.85
const MAX_ACROSS_AXIS_RATIO = 0.3

export interface FieldSize {
  width: number
  height: number
}

export type FieldWatermarkAxis = 'width' | 'height'

export interface FieldWatermarkMetrics {
  fontSize: number
  estimatedLengthMeters: number
  estimatedHeightMeters: number
  alongAxis: FieldWatermarkAxis
}

export function calculateFieldWatermarkMetrics(fieldSize: FieldSize): FieldWatermarkMetrics {
  const alongAxis: FieldWatermarkAxis = fieldSize.height > fieldSize.width ? 'height' : 'width'
  const alongExtent = alongAxis === 'height' ? fieldSize.height : fieldSize.width
  const acrossExtent = alongAxis === 'height' ? fieldSize.width : fieldSize.height

  const lengthLimitedFontSize =
    (alongExtent * MAX_ALONG_AXIS_RATIO) /
    (FIELD_WATERMARK_TEXT.length * APPROXIMATE_ADVANCE_PER_CHARACTER_EM)
  const heightLimitedFontSize = acrossExtent * MAX_ACROSS_AXIS_RATIO
  const fontSize = Math.min(lengthLimitedFontSize, heightLimitedFontSize)

  return {
    fontSize,
    estimatedLengthMeters: FIELD_WATERMARK_TEXT.length * APPROXIMATE_ADVANCE_PER_CHARACTER_EM * fontSize,
    estimatedHeightMeters: fontSize,
    alongAxis,
  }
}
