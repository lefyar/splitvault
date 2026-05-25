import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
    size?: 'sm' | 'md' | 'lg'
    isLoading?: boolean
}

export function Button({
    variant = 'primary',
    size = 'md',
    isLoading = false,
    className,
    children,
    ...props
}: ButtonProps) {
    const baseClasses = 'haptic inline-flex items-center justify-center gap-2 font-semibold rounded-full transition-all duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-[color:var(--color-accent)] focus:ring-offset-2 focus:ring-offset-[color:var(--color-bg)] disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:scale-100'

    const variantClasses = {
        primary: 'bg-[color:var(--color-accent)] text-white shadow-[0_10px_30px_rgba(135,25,252,0.28)] hover:-translate-y-0.5 hover:shadow-[0_14px_38px_rgba(135,25,252,0.34)] hover:brightness-110 active:translate-y-0 active:scale-[0.98] disabled:bg-[color:var(--color-soft)] disabled:text-[color:var(--color-muted)] disabled:shadow-none disabled:hover:brightness-100',
        secondary: 'bg-[color:var(--color-card)] text-[color:var(--color-text)] border border-[color:var(--color-border)] shadow-[0_12px_34px_rgba(0,0,0,0.18)] hover:-translate-y-0.5 hover:bg-white/[0.1] hover:shadow-[0_16px_44px_rgba(0,0,0,0.24)] active:translate-y-0 active:bg-[color:var(--color-soft)] disabled:bg-[color:var(--color-soft)] disabled:text-[color:var(--color-muted)] disabled:shadow-none',
        danger: 'bg-red-600 text-white shadow-[0_8px_24px_rgba(220,38,38,0.22)] hover:-translate-y-0.5 hover:bg-red-700 active:translate-y-0 active:bg-red-800 disabled:bg-red-200 disabled:text-red-500 disabled:shadow-none',
        ghost: 'text-[color:var(--color-muted)] hover:text-[color:var(--color-text)] hover:bg-[color:var(--color-soft)] active:bg-[color:var(--color-soft)] disabled:text-[color:var(--color-muted)] disabled:bg-transparent',
    }

    const sizeClasses = {
        sm: 'px-3.5 py-1.5 text-sm min-h-9',
        md: 'px-5 py-2.5 text-base min-h-11',
        lg: 'px-6 py-4 text-lg',
    }

    return (
        <button
            className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className || ''}`}
            disabled={isLoading || props.disabled}
            {...props}
        >
            {isLoading ? (
                <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                    </svg>
                    Loading...
                </span>
            ) : (
                children
            )}
        </button>
    )
}

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    hoverable?: boolean
}

export function Card({ className, hoverable = false, ...props }: CardProps) {
    return (
        <div
            className={`animate-soft-in bg-[color:var(--color-card)] rounded-2xl border border-[color:var(--color-border)] p-5 shadow-[0_18px_70px_rgba(0,0,0,0.28)] backdrop-blur-sm ${hoverable ? 'haptic hover:-translate-y-1 hover:border-[color:var(--color-accent)]/45 hover:bg-white/[0.1] hover:shadow-[0_24px_80px_rgba(0,0,0,0.34)] transition-all duration-200 ease-out cursor-pointer' : ''
                } ${className || ''}`}
            {...props}
        />
    )
}

interface SkeletonProps {
    className?: string
}

export function Skeleton({ className = '' }: SkeletonProps) {
    return (
        <div
            aria-hidden="true"
            className={`skeleton rounded-xl bg-white/[0.08] ${className}`}
        />
    )
}

interface SkeletonCardProps {
    rows?: number
    className?: string
}

export function SkeletonCard({ rows = 3, className = '' }: SkeletonCardProps) {
    return (
        <Card className={`space-y-4 ${className}`}>
            <div className="flex items-start justify-between gap-4">
                <div className="space-y-3 flex-1">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-7 w-40" />
                </div>
                <Skeleton className="h-7 w-20 rounded-full" />
            </div>
            <div className="space-y-2">
                {Array.from({ length: rows }).map((_, index) => (
                    <Skeleton key={index} className="h-4 w-full" />
                ))}
            </div>
        </Card>
    )
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string
    error?: string
}

export function Input({ label, error, className, ...props }: InputProps) {
    return (
        <div className="flex flex-col gap-2">
            {label && <label className="text-sm font-semibold text-[color:var(--color-muted)]">{label}</label>}
            <input
                className={`px-4 py-2.5 border rounded-xl bg-[color:var(--color-card)] text-[color:var(--color-text)] placeholder:text-[color:var(--color-muted)] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[color:var(--color-accent)] focus:border-transparent focus:bg-white/[0.1] focus:shadow-[0_10px_32px_rgba(0,0,0,0.24)] ${error ? 'border-red-500' : 'border-[color:var(--color-border)]'
                    } ${className || ''}`}
                {...props}
            />
            {error && <span className="text-sm text-red-600">{error}</span>}
        </div>
    )
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string
    error?: string
    options: { label: string; value: string }[]
}

export function Select({ label, error, options, className, ...props }: SelectProps) {
    return (
        <div className="flex flex-col gap-2">
            {label && <label className="text-sm font-semibold text-[color:var(--color-muted)]">{label}</label>}
            <select
                className={`px-4 py-2.5 border rounded-xl bg-[color:var(--color-card)] text-[color:var(--color-text)] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[color:var(--color-accent)] focus:border-transparent focus:bg-white/[0.1] focus:shadow-[0_10px_32px_rgba(0,0,0,0.24)] ${error ? 'border-red-500' : 'border-[color:var(--color-border)]'
                    } ${className || ''}`}
                {...props}
            >
                <option value="">Select...</option>
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>
            {error && <span className="text-sm text-red-600">{error}</span>}
        </div>
    )
}

interface ProgressBarProps {
    current: number
    total: number
    label?: string
}

export function ProgressBar({ current, total, label }: ProgressBarProps) {
    const percent = total > 0 ? Math.min(100, Math.max(0, Math.round((current / total) * 100))) : 0
    return (
        <div className="flex flex-col gap-2">
            {label && <div className="flex justify-between text-sm">
                <span className="font-medium">{label}</span>
                <span className="text-[color:var(--color-muted)]">{percent}%</span>
            </div>}
            <div className="w-full bg-[color:var(--color-soft)] rounded-full h-2">
                <div
                    className="bg-[color:var(--color-accent)] h-2 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${percent}%` }}
                />
            </div>
        </div>
    )
}

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    variant?: 'default' | 'success' | 'warning' | 'danger'
}

export function Badge({ variant = 'default', className, ...props }: BadgeProps) {
    const variantClasses = {
        default: 'bg-[color:var(--color-soft)] text-[color:var(--color-text)]',
        success: 'bg-emerald-400/12 text-emerald-200',
        warning: 'bg-amber-400/14 text-amber-200',
        danger: 'bg-red-400/14 text-red-200',
    }

    return (
        <span
            className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium border border-current/10 ${variantClasses[variant]} ${className || ''
                }`}
            {...props}
        />
    )
}

interface TabsProps {
    tabs: { label: string; value: string }[]
    activeTab: string
    onChange: (value: string) => void
}

export function Tabs({ tabs, activeTab, onChange }: TabsProps) {
    return (
        <div className="flex gap-2 border-b border-[color:var(--color-border)] overflow-x-auto">
            {tabs.map((tab) => (
                <button
                    key={tab.value}
                    onClick={() => onChange(tab.value)}
                    className={`pb-4 px-4 font-medium text-sm transition-colors whitespace-nowrap ${activeTab === tab.value
                        ? 'text-[color:var(--color-accent)] border-b-2 border-[color:var(--color-accent)]'
                        : 'text-[color:var(--color-muted)] hover:text-[color:var(--color-text)]'
                        }`}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    )
}

interface AccordionItem {
    title: string
    content: string
}

interface AccordionProps {
    items: AccordionItem[]
    className?: string
}

export function Accordion({ items, className = '' }: AccordionProps) {
    const [openIndex, setOpenIndex] = React.useState<number | null>(null)

    const handleToggle = (index: number) => {
        setOpenIndex(openIndex === index ? null : index)
    }

    return (
        <div className={`flex flex-col gap-2 ${className}`}>
            {items.map((item, index) => {
                const isOpen = openIndex === index
                return (
                    <div
                        key={index}
                        className="bg-[color:var(--color-card)] rounded-2xl border border-[color:var(--color-border)] overflow-hidden"
                    >
                        <button
                            onClick={() => handleToggle(index)}
                            className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-[color:var(--color-soft)] transition-colors"
                        >
                            <span className="font-semibold text-[color:var(--color-text)]">{item.title}</span>
                            <svg
                                className={`w-5 h-5 text-[color:var(--color-accent)] transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                        <div
                            className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96' : 'max-h-0'
                                }`}
                        >
                            <div className="px-5 pb-4 text-sm leading-6 text-[color:var(--color-muted)]">
                                {item.content}
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
