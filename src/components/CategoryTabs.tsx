import React from 'react'

type Props = {
    categories: string[]
    value: string
    onChange: (cat: string) => void
    className?: string
}

export default function CategoryTabs({ categories, value, onChange, className }: Props) {
    const tabsClassName = className ? `category-tabs ${className}` : 'category-tabs'

    return (
        <div className={tabsClassName}>
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
