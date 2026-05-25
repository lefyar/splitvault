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
    const baseClasses = 'inline-flex items-center justify-center gap-2 font-medium rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-black disabled:opacity-50 disabled:cursor-not-allowed'

    const variantClasses = {
        primary: 'bg-primary text-black hover:bg-[#f0edd7] active:bg-[#c9c5ad]',
        secondary: 'bg-[#161616] text-primary border border-primary/20 hover:border-primary/60 hover:bg-[#212121] active:bg-[#292929]',
        danger: 'bg-red-700 text-white hover:bg-red-600 active:bg-red-800',
        ghost: 'text-primary/80 hover:text-primary hover:bg-primary/10 active:bg-primary/15',
    }

    const sizeClasses = {
        sm: 'px-3 py-1.5 text-sm min-h-9',
        md: 'px-4 py-2 text-base min-h-11',
        lg: 'px-6 py-3 text-lg',
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
            className={`bg-[#101010]/95 rounded-2xl border border-primary/10 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)] ${hoverable ? 'hover:border-primary/45 hover:bg-[#161616] transition-all cursor-pointer' : ''
                } ${className || ''}`}
            {...props}
        />
    )
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string
    error?: string
}

export function Input({ label, error, className, ...props }: InputProps) {
    return (
        <div className="flex flex-col gap-2">
            {label && <label className="text-sm font-medium text-primary/80">{label}</label>}
            <input
                className={`px-4 py-2.5 border rounded-xl bg-black/40 text-primary placeholder:text-primary/35 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ${error ? 'border-red-500' : 'border-primary/20'
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
            {label && <label className="text-sm font-medium text-primary/80">{label}</label>}
            <select
                className={`px-4 py-2.5 border rounded-xl bg-black/40 text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ${error ? 'border-red-500' : 'border-primary/20'
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
                <span className="text-primary/55">{percent}%</span>
            </div>}
            <div className="w-full bg-primary/10 rounded-full h-2">
                <div
                    className="bg-primary h-2 rounded-full transition-all"
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
        default: 'bg-primary/10 text-primary',
        success: 'bg-emerald-400/15 text-emerald-200',
        warning: 'bg-amber-300/15 text-amber-200',
        danger: 'bg-red-400/15 text-red-200',
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
        <div className="flex gap-2 border-b border-primary/10 overflow-x-auto">
            {tabs.map((tab) => (
                <button
                    key={tab.value}
                    onClick={() => onChange(tab.value)}
                    className={`pb-4 px-4 font-medium text-sm transition-colors whitespace-nowrap ${activeTab === tab.value
                            ? 'text-primary border-b-2 border-primary'
                            : 'text-primary/55 hover:text-primary'
                        }`}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    )
}
