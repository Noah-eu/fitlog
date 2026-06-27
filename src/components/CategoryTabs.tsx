import React from 'react'

type Props = {
    categories: string[]
    value: string
    onChange: (cat: string) => void
}

export default function CategoryTabs({ categories, value, onChange }: Props) {
    return (
        <div className="category-tabs">
            {categories.map((c) => (
                <button
                    type="button"
                    key={c}
                    className={c === value ? 'tab active' : 'tab'}
                    onClick={() => onChange(c)}
                >
                    {c}
                </button>
            ))}
        </div>
    )
}
