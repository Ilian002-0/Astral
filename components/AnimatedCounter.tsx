import React, { useEffect, useRef, useState } from 'react';

interface AnimatedCounterProps {
  value: number;
  format: (val: number) => string;
  className?: string;
  duration?: number;
  getColor?: (val: number) => string;
}

const AnimatedCounter: React.FC<AnimatedCounterProps> = ({ value, format, className = '', duration = 1000, getColor }) => {
  const [displayValue, setDisplayValue] = useState(value);
  const startTimeRef = useRef<number | null>(null);
  const startValueRef = useRef<number>(value);
  const targetValueRef = useRef<number>(value);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (value === targetValueRef.current) return;

    startValueRef.current = displayValue;
    targetValueRef.current = value;
    startTimeRef.current = null;

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const progress = timestamp - startTimeRef.current;
      const progressRatio = Math.min(progress / duration, 1);
      
      // Easing: easeOutQuart for smooth settlement
      const ease = 1 - Math.pow(1 - progressRatio, 4);
      
      const nextValue = startValueRef.current + (targetValueRef.current - startValueRef.current) * ease;
      setDisplayValue(nextValue);

      if (progressRatio < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [value, duration]);

  const dynamicColor = getColor ? getColor(displayValue) : '';

  // Using tabular-nums ensures monospaced numbers, preventing horizontal jitter during animation
  return (
      <span className={`${className} ${dynamicColor}`} style={{ fontVariantNumeric: 'tabular-nums' }}>
          {format(displayValue)}
      </span>
  );
};

export default AnimatedCounter;