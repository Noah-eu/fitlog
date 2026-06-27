import React from 'react'
import { useNavigate } from 'react-router-dom'

type BackButtonProps = {
    fallbackTo: string
    label?: string
}

function hasRouterHistory() {
    if (typeof window === 'undefined') return false
    const state = window.history.state as { idx?: number } | null
    return typeof state?.idx === 'number' && state.idx > 0
}

export default function BackButton({ fallbackTo, label = 'Zpět' }: BackButtonProps) {
    const navigate = useNavigate()

    function handleBack() {
        if (hasRouterHistory()) {
            navigate(-1)
            return
        }

        navigate(fallbackTo, { replace: true })
    }

    return (
        <button className="back-button" type="button" onClick={handleBack}>
            {label}
        </button>
    )
}
