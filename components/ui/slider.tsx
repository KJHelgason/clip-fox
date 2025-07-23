import * as React from 'react'
import * as SliderPrimitive from '@radix-ui/react-slider'
import { cn } from '@/lib/utils'

const thumbStyles =
  'relative block h-10 w-3 rounded-sm bg-white shadow border border-border focus:outline-none'

interface SliderWithTicksProps
  extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> {
  overlays?: React.ReactNode
  connectors?: React.ReactNode
  duration?: number
  playheadTime?: number
}

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  SliderWithTicksProps
>(({ className, overlays, connectors, duration = 0, playheadTime, value = [0, duration], ...props }, ref) => {
  // ...track logic...
  return (
    <SliderPrimitive.Root
      ref={ref}
      className={cn('relative flex w-full touch-none select-none items-center my-slider-root', className)}
      value={value}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-8 w-full grow overflow-hidden rounded-sm bg-gray-300">
        {/* Layer overlays and connectors INSIDE the track */}
        {overlays}
        {connectors}
        <SliderPrimitive.Range className="absolute h-full bg-secondary" />
        {/* ticks if you want */}
      </SliderPrimitive.Track>
      {/* Thumbs */}
      {Array.isArray(value)
        ? value.map((v, i) => (
            <SliderPrimitive.Thumb key={i} className={thumbStyles} />
          ))
        : <SliderPrimitive.Thumb className={thumbStyles} />}
    </SliderPrimitive.Root>
  )
})

Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }