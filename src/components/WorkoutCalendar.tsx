import React, { useMemo } from 'react'

type Props = {
    month: Date
    selectedDateKey: string
    highlightedDateKeys: Set<string>
    todayDateKey: string
    onSelectDate: (dateKey: string) => void
    onChangeMonth: (delta: number) => void
}

const WEEKDAYS = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne']

function toDateKey(date: Date) {
    const yyyy = date.getFullYear()
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const dd = String(date.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
}

export default function WorkoutCalendar({ month, selectedDateKey, highlightedDateKeys, todayDateKey, onSelectDate, onChangeMonth }: Props) {
    const calendarDays = useMemo(() => {
        const firstDay = new Date(month.getFullYear(), month.getMonth(), 1, 12)
        const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0, 12).getDate()
        const leadingEmpty = (firstDay.getDay() + 6) % 7
        const cells: Array<string | null> = []

        for (let index = 0; index < leadingEmpty; index += 1) {
            cells.push(null)
        }

        for (let day = 1; day <= daysInMonth; day += 1) {
            cells.push(toDateKey(new Date(month.getFullYear(), month.getMonth(), day, 12)))
        }

        while (cells.length % 7 !== 0) {
            cells.push(null)
        }

        return cells
    }, [month])

    return (
        <section className="card workout-calendar">
            <div className="workout-calendar-head">
                <button type="button" className="calendar-nav" onClick={() => onChangeMonth(-1)} aria-label="Předchozí měsíc">←</button>
                <h2>{month.toLocaleDateString('cs-CZ', { month: 'long', year: 'numeric' })}</h2>
                <button type="button" className="calendar-nav" onClick={() => onChangeMonth(1)} aria-label="Další měsíc">→</button>
            </div>

            <div className="calendar-grid calendar-weekdays" aria-hidden>
                {WEEKDAYS.map((day) => <span key={day}>{day}</span>)}
            </div>

            <div className="calendar-grid">
                {calendarDays.map((dateKey, index) => {
                    if (!dateKey) {
                        return <span key={`empty-${index}`} className="calendar-day empty" />
                    }

                    const hasEntries = highlightedDateKeys.has(dateKey)
                    const isSelected = dateKey === selectedDateKey
                    const isToday = dateKey === todayDateKey
                    const className = [
                        'calendar-day',
                        hasEntries ? 'has-entries' : '',
                        isSelected ? 'selected' : '',
                        isToday ? 'today' : '',
                    ].filter(Boolean).join(' ')

                    return (
                        <button
                            key={dateKey}
                            type="button"
                            className={className}
                            onClick={() => onSelectDate(dateKey)}
                            aria-pressed={isSelected}
                        >
                            <span>{Number(dateKey.slice(-2))}</span>
                        </button>
                    )
                })}
            </div>
        </section>
    )
}