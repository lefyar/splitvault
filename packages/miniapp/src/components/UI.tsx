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
    const baseClasses = 'inline-flex items-center justify-center gap-2 font-semibold rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-[#F2F2EE] disabled:opacity-50 disabled:cursor-not-allowed'

    const variantClasses = {
        primary: 'bg-primary text-white shadow-[0_4px_24px_rgba(115,66,226,0.28)] hover:scale-[1.04] hover:brightness-110 active:scale-[0.96]',
        secondary: 'bg-[#F2F2EE] text-[#192837] border border-[#192837]/10 hover:bg-white active:bg-[#E8E6DE]',
        danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800',
        ghost: 'text-[#192837]/80 hover:text-[#192837] hover:bg-[#192837]/8 active:bg-[#192837]/12',
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
            className={`bg-white/70 rounded-[1.25rem] border border-[#192837]/10 p-5 shadow-[0_18px_60px_rgba(25,40,55,0.08)] backdrop-blur-sm ${hoverable ? 'hover:border-primary/35 hover:bg-white hover:shadow-[0_22px_70px_rgba(25,40,55,0.12)] transition-all cursor-pointer' : ''
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
            {label && <label className="text-sm font-semibold text-[#192837]/80">{label}</label>}
            <input
                className={`px-4 py-2.5 border rounded-2xl bg-white/75 text-[#192837] placeholder:text-[#192837]/35 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ${error ? 'border-red-500' : 'border-[#192837]/12'
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
            {label && <label className="text-sm font-semibold text-[#192837]/80">{label}</label>}
            <select
                className={`px-4 py-2.5 border rounded-2xl bg-white/75 text-[#192837] focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ${error ? 'border-red-500' : 'border-[#192837]/12'
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
                <span className="text-[#192837]/55">{percent}%</span>
            </div>}
            <div className="w-full bg-[#192837]/10 rounded-full h-2">
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
        default: 'bg-[#192837]/8 text-[#192837]',
        success: 'bg-emerald-100 text-emerald-800',
        warning: 'bg-amber-100 text-amber-800',
        danger: 'bg-red-100 text-red-800',
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
        <div className="flex gap-2 border-b border-[#192837]/10 overflow-x-auto">
            {tabs.map((tab) => (
                <button
                    key={tab.value}
                    onClick={() => onChange(tab.value)}
                    className={`pb-4 px-4 font-medium text-sm transition-colors whitespace-nowrap ${activeTab === tab.value
                            ? 'text-primary border-b-2 border-primary'
                            : 'text-[#192837]/55 hover:text-[#192837]'
                        }`}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    )
}
