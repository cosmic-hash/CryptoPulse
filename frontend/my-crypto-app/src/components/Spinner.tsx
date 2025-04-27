import React from 'react';
import { motion } from 'framer-motion';

interface SpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: 'pink' | 'yellow' | 'white';
  overlay?: boolean;
}

const Spinner: React.FC<SpinnerProps> = ({ 
  size = 'medium', 
  color = 'pink',
  overlay = false 
}) => {
  const sizeMap = {
    small: 'h-6 w-6',
    medium: 'h-12 w-12',
    large: 'h-16 w-16',
  };
  
  const colorMap = {
    pink: 'border-neon-pink',
    yellow: 'border-pastel-yellow',
    white: 'border-white',
  };

  const spinner = (
    <motion.div
      className={`${sizeMap[size]} rounded-full border-t-4 border-b-4 ${colorMap[color]}`}
      animate={{ rotate: 360 }}
      transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
    />
  );

  if (overlay) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-navy bg-opacity-80 z-50">
        {spinner}
      </div>
    );
  }

  return spinner;
};

export default Spinner;