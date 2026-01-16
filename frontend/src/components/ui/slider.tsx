import { InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '../../lib/utils'

export interface SliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  showValue?: boolean
}

const Slider = forwardRef<HTMLInputElement, SliderProps>(
  ({ className, showValue = false, ...props }, ref) => {
    return (
      <div className="flex items-center gap-3">
        <input
          type="range"
          className={cn(
            'flex-1 h-2 rounded-lg appearance-none cursor-pointer',
            'bg-secondary',
            '[&::-webkit-slider-thumb]:appearance-none',
            '[&::-webkit-slider-thumb]:w-4',
            '[&::-webkit-slider-thumb]:h-4',
            '[&::-webkit-slider-thumb]:rounded-full',
            '[&::-webkit-slider-thumb]:bg-primary',
            '[&::-webkit-slider-thumb]:cursor-pointer',
            '[&::-moz-range-thumb]:w-4',
            '[&::-moz-range-thumb]:h-4',
            '[&::-moz-range-thumb]:rounded-full',
            '[&::-moz-range-thumb]:bg-primary',
            '[&::-moz-range-thumb]:border-0',
            '[&::-moz-range-thumb]:cursor-pointer',
            'disabled:cursor-not-allowed disabled:opacity-50',
            className
          )}
          ref={ref}
          {...props}
        />
        {showValue && (
          <span className="text-sm font-medium text-muted-foreground min-w-[3rem] text-right">
            {props.value}
          </span>
        )}
      </div>
    )
  }
)
Slider.displayName = 'Slider'

export { Slider }
