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
    const baseClasses = 'inline-flex items-center justify-center gap-2 font-medium rounded-md transition-all focus:outline-none focus:ring-2 focus:ring-teal-700 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'

    const variantClasses = {
        primary: 'bg-teal-700 text-white hover:bg-teal-800 active:bg-teal-900',
        secondary: 'bg-white text-gray-900 border border-gray-300 hover:bg-gray-50 active:bg-gray-100',
        danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800',
        ghost: 'text-gray-900 hover:bg-gray-100 active:bg-gray-200',
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
            className={`bg-white rounded-md border border-gray-200 p-5 shadow-sm ${hoverable ? 'hover:border-teal-500 hover:shadow-md transition-all cursor-pointer' : ''
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
            {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
            <input
                className={`px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700 focus:border-transparent ${error ? 'border-red-500' : 'border-gray-300'
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
            {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
            <select
                className={`px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700 focus:border-transparent ${error ? 'border-red-500' : 'border-gray-300'
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
                <span className="text-gray-600">{percent}%</span>
            </div>}
            <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                    className="bg-teal-700 h-2 rounded-full transition-all"
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
        default: 'bg-gray-100 text-gray-800',
        success: 'bg-emerald-100 text-emerald-800',
        warning: 'bg-amber-100 text-amber-800',
        danger: 'bg-red-100 text-red-800',
    }

    return (
        <span
            className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${variantClasses[variant]} ${className || ''
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
        <div className="flex gap-4 border-b border-gray-200">
            {tabs.map((tab) => (
                <button
                    key={tab.value}
                    onClick={() => onChange(tab.value)}
                    className={`pb-4 px-4 font-medium text-sm transition-colors ${activeTab === tab.value
                            ? 'text-gray-900 border-b-2 border-gray-900'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    )
}
