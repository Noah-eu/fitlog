import React from 'react'

export type ProgressLineChartPoint = {
    label: string
    value: number
}

type ProgressLineChartProps = {
    points: ProgressLineChartPoint[]
    valueSuffix: string
    emptyStateText: string
}

const CHART_WIDTH = 320
const CHART_HEIGHT = 180
const PADDING_LEFT = 22
const PADDING_RIGHT = 16
const PADDING_TOP = 18
const PADDING_BOTTOM = 32

function formatValue(value: number, suffix: string) {
    const rounded = Number.isInteger(value) ? value.toString() : value.toFixed(1)
    return `${rounded} ${suffix}`
}

export default function ProgressLineChart({ points, valueSuffix, emptyStateText }: ProgressLineChartProps) {
    if (points.length < 2) {
        return <p className="chart-empty">{emptyStateText}</p>
    }

    const values = points.map((point) => point.value)
    const minValue = Math.min(...values)
    const maxValue = Math.max(...values)
    const valueRange = maxValue - minValue || 1
    const innerWidth = CHART_WIDTH - PADDING_LEFT - PADDING_RIGHT
    const innerHeight = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM

    const coords = points.map((point, index) => {
        const x = PADDING_LEFT + (index / Math.max(points.length - 1, 1)) * innerWidth
        const normalized = (point.value - minValue) / valueRange
        const y = PADDING_TOP + innerHeight - normalized * innerHeight
        return { ...point, x, y }
    })

    const polylinePoints = coords.map((point) => `${point.x},${point.y}`).join(' ')
    const firstPoint = points[0]
    const middlePoint = points[Math.floor((points.length - 1) / 2)]
    const lastPoint = points[points.length - 1]
    const tickPoints = [firstPoint, middlePoint, lastPoint].filter((point, index, all) => all.findIndex((item) => item.label === point.label) === index)

    return (
        <div className="progress-chart">
            <div className="chart-summary">
                <div>
                    <span>Poslední hodnota</span>
                    <strong>{formatValue(lastPoint.value, valueSuffix)}</strong>
                </div>
                <div>
                    <span>Rozsah</span>
                    <strong>{formatValue(minValue, valueSuffix)} - {formatValue(maxValue, valueSuffix)}</strong>
                </div>
            </div>

            <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} className="chart-svg" aria-hidden="true" preserveAspectRatio="none">
                <defs>
                    <linearGradient id="progress-line-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="rgba(225, 29, 47, 1)" />
                        <stop offset="100%" stopColor="rgba(242, 194, 48, 1)" />
                    </linearGradient>
                </defs>

                {[0, 0.5, 1].map((ratio) => {
                    const y = PADDING_TOP + innerHeight * ratio
                    return (
                        <line
                            key={ratio}
                            x1={PADDING_LEFT}
                            y1={y}
                            x2={CHART_WIDTH - PADDING_RIGHT}
                            y2={y}
                            className="chart-grid-line"
                        />
                    )
                })}

                <polyline className="chart-line-shadow" points={polylinePoints} />
                <polyline className="chart-line" points={polylinePoints} />

                {coords.map((point) => (
                    <g key={`${point.label}-${point.value}`}>
                        <circle cx={point.x} cy={point.y} r="5" className="chart-dot-shadow" />
                        <circle cx={point.x} cy={point.y} r="3.5" className="chart-dot" />
                    </g>
                ))}

                <text x={6} y={PADDING_TOP + 4} className="chart-axis-label">{formatValue(maxValue, valueSuffix)}</text>
                <text x={6} y={PADDING_TOP + innerHeight + 4} className="chart-axis-label">{formatValue(minValue, valueSuffix)}</text>

                {tickPoints.map((point) => {
                    const tick = coords.find((item) => item.label === point.label && item.value === point.value)
                    if (!tick) return null

                    return (
                        <text key={`${point.label}-tick`} x={tick.x} y={CHART_HEIGHT - 8} textAnchor="middle" className="chart-tick-label">
                            {point.label}
                        </text>
                    )
                })}
            </svg>
        </div>
    )
}