'use client'

import { motion, Variants, AnimatePresence } from 'framer-motion'
import { SocialPlatform } from '@/lib/types'

// Platform configurations with colors and icons
export const PLATFORM_STYLES: Record<SocialPlatform, {
  color: string
  bgClass: string
  darkBg: string
  lightBg: string
  gradientBg: string
  icon: React.ReactNode
}> = {
  twitch: {
    color: '#9146FF',
    bgClass: 'bg-[#9146FF]',
    darkBg: 'bg-gray-900',
    lightBg: 'bg-white',
    gradientBg: 'bg-gradient-to-r from-[#9146FF] to-[#6441A4]',
    icon: (
      <svg viewBox="0 0 24 24" className="w-full h-full" fill="currentColor">
        <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/>
      </svg>
    ),
  },
  youtube: {
    color: '#FF0000',
    bgClass: 'bg-[#FF0000]',
    darkBg: 'bg-gray-900',
    lightBg: 'bg-white',
    gradientBg: 'bg-gradient-to-r from-[#FF0000] to-[#CC0000]',
    icon: (
      <svg viewBox="0 0 24 24" className="w-full h-full" fill="currentColor">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    ),
  },
  tiktok: {
    color: '#000000',
    bgClass: 'bg-black',
    darkBg: 'bg-black',
    lightBg: 'bg-white',
    gradientBg: 'bg-gradient-to-r from-[#00f2ea] via-black to-[#ff0050]',
    icon: (
      <svg viewBox="0 0 24 24" className="w-full h-full" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
      </svg>
    ),
  },
  instagram: {
    color: '#E4405F',
    bgClass: 'bg-gradient-to-tr from-[#FCAF45] via-[#E4405F] to-[#833AB4]',
    darkBg: 'bg-gray-900',
    lightBg: 'bg-white',
    gradientBg: 'bg-gradient-to-tr from-[#FCAF45] via-[#E4405F] to-[#833AB4]',
    icon: (
      <svg viewBox="0 0 24 24" className="w-full h-full" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
      </svg>
    ),
  },
  kick: {
    color: '#53FC18',
    bgClass: 'bg-[#53FC18]',
    darkBg: 'bg-gray-900',
    lightBg: 'bg-white',
    gradientBg: 'bg-gradient-to-r from-[#53FC18] to-[#00D95F]',
    icon: (
      <svg viewBox="0 0 24 24" className="w-full h-full" fill="currentColor">
        <path d="M1.333 0v24h10.666V12.533L17.779 24h4.888l-7.334-12.8L22.667 0h-4.89l-5.778 10.133V0z"/>
      </svg>
    ),
  },
  twitter: {
    color: '#000000',
    bgClass: 'bg-black',
    darkBg: 'bg-black',
    lightBg: 'bg-white',
    gradientBg: 'bg-gradient-to-r from-gray-800 to-black',
    icon: (
      <svg viewBox="0 0 24 24" className="w-full h-full" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
  },
  facebook: {
    color: '#1877F2',
    bgClass: 'bg-[#1877F2]',
    darkBg: 'bg-gray-900',
    lightBg: 'bg-white',
    gradientBg: 'bg-gradient-to-r from-[#1877F2] to-[#0866FF]',
    icon: (
      <svg viewBox="0 0 24 24" className="w-full h-full" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
  },
  discord: {
    color: '#5865F2',
    bgClass: 'bg-[#5865F2]',
    darkBg: 'bg-gray-900',
    lightBg: 'bg-white',
    gradientBg: 'bg-gradient-to-r from-[#5865F2] to-[#7289DA]',
    icon: (
      <svg viewBox="0 0 24 24" className="w-full h-full" fill="currentColor">
        <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z"/>
      </svg>
    ),
  },
}

// Sticker template types
export type StickerTemplate =
  | 'basic'           // Icon + username
  | 'follow'          // "Follow" label + icon + username
  | 'subscribe'       // "Subscribe" button style
  | 'banner'          // Wide banner with gradient
  | 'badge'           // Compact badge style
  | 'card'            // Card with icon and text
  | 'minimal'         // Just icon and text, no background

export type StickerStyle = 'default' | 'dark' | 'light' | 'gradient' | 'purple' | 'red' | 'green' | 'blue'

export interface StickerConfig {
  id: string
  template: StickerTemplate
  platform: SocialPlatform
  platforms?: SocialPlatform[] // For multi-platform stickers
  username: string
  style: StickerStyle
  animated?: boolean
  animation?: string
  showFollowLabel?: boolean
  customLabel?: string
}

interface StickerRendererProps {
  config: StickerConfig
  className?: string
  onClick?: () => void
  isPreview?: boolean // Smaller for thumbnail preview
}

// Simple animation variants for Framer Motion
const animationVariants: Record<string, Variants> = {
  fadeIn: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { duration: 0.6, ease: 'easeOut' }
    }
  },
  slideRight: {
    hidden: { opacity: 0, x: -40 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }
    }
  },
  slideLeft: {
    hidden: { opacity: 0, x: 40 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }
    }
  },
  slideUp: {
    hidden: { opacity: 0, y: 40 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }
    }
  },
  slideDown: {
    hidden: { opacity: 0, y: -40 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }
    }
  },
  bounceIn: {
    hidden: { opacity: 0, scale: 0 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: 260,
        damping: 20,
        duration: 0.6
      }
    }
  },
  pop: {
    hidden: { opacity: 0, scale: 0.5 },
    visible: {
      opacity: 1,
      scale: [0.5, 1.15, 1],
      transition: {
        duration: 0.4,
        times: [0, 0.6, 1],
        ease: 'easeOut'
      }
    }
  },
  rollIn: {
    hidden: { opacity: 0, x: -100, rotate: -120 },
    visible: {
      opacity: 1,
      x: 0,
      rotate: 0,
      transition: {
        duration: 0.6,
        ease: [0.25, 0.46, 0.45, 0.94]
      }
    }
  },
  zoomIn: {
    hidden: { opacity: 0, scale: 0.3 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: 'easeOut'
      }
    }
  },
  flip: {
    hidden: { opacity: 0, rotateY: 90 },
    visible: {
      opacity: 1,
      rotateY: 0,
      transition: {
        duration: 0.5,
        ease: 'easeOut'
      }
    }
  },
  shake: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      x: [0, -10, 10, -10, 10, 0],
      transition: {
        duration: 0.5,
        ease: 'easeInOut'
      }
    }
  },
  pulse: {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: [0.8, 1.05, 0.95, 1.02, 1],
      transition: {
        duration: 0.6,
        ease: 'easeOut'
      }
    }
  },
  // Complex multi-step animations
  logoReveal: {
    hidden: { opacity: 0, y: 30, scale: 0.8 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.4,
        ease: [0.34, 1.56, 0.64, 1] // Custom spring-like curve
      }
    }
  },
  bannerSlide: {
    hidden: { opacity: 0, width: 0, x: -20 },
    visible: {
      opacity: 1,
      width: 'auto',
      x: 0,
      transition: {
        duration: 0.5,
        delay: 0.3, // Start after logo animation
        ease: [0.25, 0.46, 0.45, 0.94]
      }
    }
  },
  textReveal: {
    hidden: { opacity: 0, x: -10 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.3,
        delay: 0.5, // Start after banner slides
        ease: 'easeOut'
      }
    }
  },
  glowPulse: {
    hidden: { opacity: 0, scale: 0.9, filter: 'blur(8px)' },
    visible: {
      opacity: 1,
      scale: 1,
      filter: 'blur(0px)',
      transition: {
        duration: 0.6,
        ease: 'easeOut'
      }
    }
  },
  typewriter: {
    hidden: { opacity: 0, width: 0 },
    visible: {
      opacity: 1,
      width: 'auto',
      transition: {
        duration: 0.8,
        ease: 'linear'
      }
    }
  }
}

// Stagger animation for container with children
const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1
    }
  }
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: 'easeOut' }
  }
}

// Complex sequence animation presets for professional sticker animations
export const COMPLEX_ANIMATIONS = {
  // Logo slides up from bottom, then banner reveals from left
  logoAndBanner: {
    container: {
      hidden: {},
      visible: {
        transition: { staggerChildren: 0 }
      }
    },
    icon: {
      hidden: { opacity: 0, y: 30, scale: 0.5 },
      visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
          duration: 0.4,
          ease: [0.34, 1.56, 0.64, 1]
        }
      }
    },
    banner: {
      hidden: { opacity: 0, scaleX: 0, originX: 0 },
      visible: {
        opacity: 1,
        scaleX: 1,
        transition: {
          duration: 0.4,
          delay: 0.35,
          ease: [0.25, 0.46, 0.45, 0.94]
        }
      }
    },
    text: {
      hidden: { opacity: 0, x: -8 },
      visible: {
        opacity: 1,
        x: 0,
        transition: {
          duration: 0.25,
          delay: 0.55,
          ease: 'easeOut'
        }
      }
    }
  },
  // Icon pops in with glow, text types in
  glowType: {
    container: {
      hidden: {},
      visible: {
        transition: { staggerChildren: 0 }
      }
    },
    icon: {
      hidden: { opacity: 0, scale: 0, filter: 'blur(10px)' },
      visible: {
        opacity: 1,
        scale: [0, 1.2, 1],
        filter: 'blur(0px)',
        transition: {
          duration: 0.5,
          times: [0, 0.6, 1],
          ease: 'easeOut'
        }
      }
    },
    text: {
      hidden: { opacity: 0, clipPath: 'inset(0 100% 0 0)' },
      visible: {
        opacity: 1,
        clipPath: 'inset(0 0% 0 0)',
        transition: {
          duration: 0.6,
          delay: 0.4,
          ease: 'easeOut'
        }
      }
    }
  },
  // Card flips in from the side
  cardFlip: {
    container: {
      hidden: { opacity: 0, rotateY: -90, transformPerspective: 1000 },
      visible: {
        opacity: 1,
        rotateY: 0,
        transition: {
          duration: 0.6,
          ease: [0.25, 0.46, 0.45, 0.94]
        }
      }
    },
    icon: {
      hidden: { opacity: 0, scale: 0.5 },
      visible: {
        opacity: 1,
        scale: 1,
        transition: {
          duration: 0.3,
          delay: 0.4,
          ease: 'easeOut'
        }
      }
    },
    text: {
      hidden: { opacity: 0, y: 10 },
      visible: {
        opacity: 1,
        y: 0,
        transition: {
          duration: 0.3,
          delay: 0.5,
          ease: 'easeOut'
        }
      }
    }
  },
  // Elastic bounce with overshoot
  elasticBounce: {
    container: {
      hidden: { opacity: 0, scale: 0, y: 50 },
      visible: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: {
          type: 'spring',
          stiffness: 400,
          damping: 15,
          mass: 1
        }
      }
    },
    icon: {
      hidden: { opacity: 0, rotate: -180 },
      visible: {
        opacity: 1,
        rotate: 0,
        transition: {
          type: 'spring',
          stiffness: 200,
          damping: 12,
          delay: 0.1
        }
      }
    },
    text: {
      hidden: { opacity: 0, x: -20 },
      visible: {
        opacity: 1,
        x: 0,
        transition: {
          type: 'spring',
          stiffness: 300,
          damping: 20,
          delay: 0.2
        }
      }
    }
  },
  // Cinematic zoom with blur
  cinematicZoom: {
    container: {
      hidden: { opacity: 0, scale: 2, filter: 'blur(20px)' },
      visible: {
        opacity: 1,
        scale: 1,
        filter: 'blur(0px)',
        transition: {
          duration: 0.8,
          ease: [0.25, 0.46, 0.45, 0.94]
        }
      }
    },
    icon: {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: {
          duration: 0.3,
          delay: 0.6,
          ease: 'easeOut'
        }
      }
    },
    text: {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: {
          duration: 0.3,
          delay: 0.7,
          ease: 'easeOut'
        }
      }
    }
  },
  // Split reveal - elements come from opposite directions
  splitReveal: {
    container: {
      hidden: {},
      visible: {
        transition: { staggerChildren: 0 }
      }
    },
    icon: {
      hidden: { opacity: 0, x: -50, rotate: -30 },
      visible: {
        opacity: 1,
        x: 0,
        rotate: 0,
        transition: {
          duration: 0.5,
          ease: [0.25, 0.46, 0.45, 0.94]
        }
      }
    },
    text: {
      hidden: { opacity: 0, x: 50 },
      visible: {
        opacity: 1,
        x: 0,
        transition: {
          duration: 0.5,
          delay: 0.2,
          ease: [0.25, 0.46, 0.45, 0.94]
        }
      }
    }
  }
}

// Get background class based on style and platform
function getBackgroundClass(style: StickerStyle, platform: SocialPlatform): string {
  const platformStyle = PLATFORM_STYLES[platform]

  switch (style) {
    case 'dark':
      return platformStyle.darkBg + ' text-white'
    case 'light':
      return platformStyle.lightBg + ' text-gray-900'
    case 'gradient':
      return platformStyle.gradientBg + ' text-white'
    case 'purple':
      return 'bg-purple-600 text-white'
    case 'red':
      return 'bg-red-600 text-white'
    case 'green':
      return 'bg-green-500 text-black'
    case 'blue':
      return 'bg-blue-600 text-white'
    default:
      return platformStyle.bgClass + ' text-white'
  }
}

// Basic sticker: Icon + Username - Clean pill style with glowType animation
function BasicSticker({ config, isPreview, animated }: { config: StickerConfig; isPreview?: boolean; animated?: boolean }) {
  const platformStyle = PLATFORM_STYLES[config.platform]
  const iconSize = isPreview ? 'w-4 h-4' : 'w-5 h-5'
  const textSize = isPreview ? 'text-xs' : 'text-sm'
  const padding = isPreview ? 'px-2.5 py-1.5' : 'px-4 py-2'

  // Professional gradient backgrounds based on style
  const getBgStyle = () => {
    switch (config.style) {
      case 'dark':
        return { background: 'linear-gradient(135deg, #1a1a2e 0%, #16162a 100%)' }
      case 'light':
        return { background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)' }
      case 'gradient':
        return { background: `linear-gradient(135deg, ${platformStyle.color} 0%, ${platformStyle.color}dd 100%)` }
      default:
        return { background: platformStyle.color }
    }
  }

  const textColor = config.style === 'light' ? 'text-gray-900' : 'text-white'

  // Animated version with glowType animation
  if (animated) {
    const animationType = config.animation || 'glowType'
    const complexAnim = COMPLEX_ANIMATIONS[animationType as keyof typeof COMPLEX_ANIMATIONS] || COMPLEX_ANIMATIONS.glowType

    return (
      <motion.div
        className={`inline-flex items-center gap-2 ${padding} rounded-full shadow-lg ${textColor}`}
        style={{
          ...getBgStyle(),
          boxShadow: '0 4px 14px rgba(0,0,0,0.25), 0 2px 4px rgba(0,0,0,0.1)',
        }}
        variants={complexAnim.container}
        initial="hidden"
        animate="visible"
      >
        <motion.span
          className={`${iconSize} flex-shrink-0`}
          variants={complexAnim.icon}
        >
          {platformStyle.icon}
        </motion.span>
        <motion.span
          className={`font-bold ${textSize} whitespace-nowrap overflow-hidden`}
          variants={complexAnim.text}
        >
          {config.username}
        </motion.span>
      </motion.div>
    )
  }

  return (
    <div
      className={`inline-flex items-center gap-2 ${padding} rounded-full shadow-lg ${textColor}`}
      style={{
        ...getBgStyle(),
        boxShadow: '0 4px 14px rgba(0,0,0,0.25), 0 2px 4px rgba(0,0,0,0.1)',
      }}
    >
      <span className={`${iconSize} flex-shrink-0`}>{platformStyle.icon}</span>
      <span className={`font-bold ${textSize} whitespace-nowrap`}>{config.username}</span>
    </div>
  )
}

// Follow sticker with label header - Professional card style with complex animation
function FollowSticker({ config, isPreview, animated }: { config: StickerConfig; isPreview?: boolean; animated?: boolean }) {
  const platformStyle = PLATFORM_STYLES[config.platform]
  const iconSize = isPreview ? 'w-4 h-4' : 'w-6 h-6'
  const textSize = isPreview ? 'text-xs' : 'text-sm'
  const labelSize = isPreview ? 'text-[7px]' : 'text-[9px]'

  const getBgStyle = () => {
    switch (config.style) {
      case 'dark':
        return { background: 'linear-gradient(135deg, #1a1a2e 0%, #0d0d1a 100%)' }
      case 'light':
        return { background: 'linear-gradient(135deg, #ffffff 0%, #f0f0f5 100%)' }
      default:
        return { background: platformStyle.color }
    }
  }

  const textColor = config.style === 'light' ? 'text-gray-900' : 'text-white'

  // Get animation type from config
  const animationType = config.animation || 'logoAndBanner'
  const complexAnim = COMPLEX_ANIMATIONS[animationType as keyof typeof COMPLEX_ANIMATIONS] || COMPLEX_ANIMATIONS.logoAndBanner

  // Animated version with multi-step sequence
  if (animated) {
    return (
      <motion.div
        className="flex items-center gap-0"
        variants={complexAnim.container}
        initial="hidden"
        animate="visible"
      >
        {/* Icon appears first with bounce */}
        <motion.div
          className={`${iconSize} flex-shrink-0 z-10`}
          variants={complexAnim.icon}
          style={{ color: config.style === 'light' ? platformStyle.color : 'white' }}
        >
          {platformStyle.icon}
        </motion.div>

        {/* Banner slides in from left */}
        <motion.div
          className={`flex flex-col items-stretch rounded-r-xl overflow-hidden shadow-lg ${textColor} -ml-2`}
          style={{
            ...getBgStyle(),
            boxShadow: '0 8px 24px rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.15)',
            transformOrigin: 'left center',
          }}
          variants={complexAnim.banner || complexAnim.text}
        >
          {config.showFollowLabel !== false && (
            <div
              className={`w-full text-center ${labelSize} font-black tracking-[0.15em] py-1 uppercase`}
              style={{
                background: config.style === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(0,0,0,0.3)',
              }}
            >
              {config.customLabel || 'FOLLOW'}
            </div>
          )}
          <motion.div
            className={`flex items-center gap-2 ${isPreview ? 'px-3 py-1.5' : 'px-4 py-2.5'}`}
            variants={complexAnim.text}
          >
            <span className={`font-bold ${textSize} whitespace-nowrap`}>{config.username}</span>
          </motion.div>
        </motion.div>
      </motion.div>
    )
  }

  // Static version
  return (
    <div
      className={`flex flex-col items-stretch rounded-xl overflow-hidden shadow-lg ${textColor}`}
      style={{
        ...getBgStyle(),
        boxShadow: '0 8px 24px rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.15)',
      }}
    >
      {config.showFollowLabel !== false && (
        <div
          className={`w-full text-center ${labelSize} font-black tracking-[0.15em] py-1 uppercase`}
          style={{
            background: config.style === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(0,0,0,0.3)',
          }}
        >
          {config.customLabel || 'FOLLOW'}
        </div>
      )}
      <div className={`flex items-center gap-2 ${isPreview ? 'px-2.5 py-1.5' : 'px-4 py-2.5'}`}>
        <span className={`${iconSize} flex-shrink-0`}>{platformStyle.icon}</span>
        <span className={`font-bold ${textSize} whitespace-nowrap`}>{config.username}</span>
      </div>
    </div>
  )
}

// Subscribe button style (YouTube-like) with animated CTA - Professional button
function SubscribeSticker({ config, isPreview, animated }: { config: StickerConfig; isPreview?: boolean; animated?: boolean }) {
  const platformStyle = PLATFORM_STYLES[config.platform]
  const isLight = config.style === 'light'
  const iconSize = isPreview ? 'w-4 h-4' : 'w-5 h-5'
  const textSize = isPreview ? 'text-xs' : 'text-sm'
  const padding = isPreview ? 'px-3 py-1.5' : 'px-5 py-2.5'

  const getBgStyle = () => {
    if (isLight) {
      return {
        background: 'linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%)',
        border: '1px solid #e0e0e0',
      }
    }
    // YouTube-style red gradient
    return {
      background: 'linear-gradient(135deg, #FF0000 0%, #CC0000 100%)',
    }
  }

  const content = (
    <>
      <motion.span
        className={iconSize}
        variants={animated ? itemVariants : undefined}
      >
        {platformStyle.icon}
      </motion.span>
      <motion.span
        className={`font-bold ${textSize} tracking-wide`}
        variants={animated ? itemVariants : undefined}
      >
        {config.customLabel || 'Subscribe'}
      </motion.span>
    </>
  )

  if (animated) {
    return (
      <motion.div
        className={`flex items-center gap-2.5 ${padding} rounded-full ${isLight ? 'text-gray-900' : 'text-white'}`}
        style={{
          ...getBgStyle(),
          boxShadow: '0 4px 14px rgba(0,0,0,0.2), 0 2px 6px rgba(0,0,0,0.1)',
        }}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {content}
      </motion.div>
    )
  }

  return (
    <div
      className={`flex items-center gap-2.5 ${padding} rounded-full ${isLight ? 'text-gray-900' : 'text-white'}`}
      style={{
        ...getBgStyle(),
        boxShadow: '0 4px 14px rgba(0,0,0,0.2), 0 2px 6px rgba(0,0,0,0.1)',
      }}
    >
      <span className={iconSize}>{platformStyle.icon}</span>
      <span className={`font-bold ${textSize} tracking-wide`}>
        {config.customLabel || 'Subscribe'}
      </span>
    </div>
  )
}

// Banner style: Wide with gradient - Professional banner with depth
function BannerSticker({ config, isPreview, animated }: { config: StickerConfig; isPreview?: boolean; animated?: boolean }) {
  const platformStyle = PLATFORM_STYLES[config.platform]
  const iconSize = isPreview ? 'w-6 h-6' : 'w-8 h-8'
  const padding = isPreview ? 'px-4 py-2.5' : 'px-6 py-3.5'
  const textSize = isPreview ? 'text-sm' : 'text-base'

  const getBgStyle = () => {
    switch (config.style) {
      case 'dark':
        return {
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16162a 100%)',
          borderLeft: `4px solid ${platformStyle.color}`,
        }
      case 'light':
        return {
          background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
          borderLeft: `4px solid ${platformStyle.color}`,
        }
      default:
        return {
          background: `linear-gradient(135deg, ${platformStyle.color} 0%, ${platformStyle.color}cc 50%, ${platformStyle.color}99 100%)`,
        }
    }
  }

  const textColor = config.style === 'light' ? 'text-gray-900' : 'text-white'

  if (animated) {
    return (
      <motion.div
        className={`flex items-center justify-center gap-4 ${padding} rounded-xl ${textColor}`}
        style={{
          ...getBgStyle(),
          boxShadow: '0 8px 32px rgba(0,0,0,0.25), 0 4px 12px rgba(0,0,0,0.15)',
        }}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.span
          className={iconSize}
          variants={itemVariants}
        >
          {platformStyle.icon}
        </motion.span>
        <motion.div className="flex flex-col" variants={itemVariants}>
          <span className={`font-bold ${textSize} tracking-tight whitespace-nowrap`}>{config.username}</span>
          {!isPreview && (
            <motion.span
              className="text-xs opacity-75 font-medium"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.75 }}
              transition={{ delay: 0.5 }}
            >
              {config.customLabel || 'Follow for more!'}
            </motion.span>
          )}
        </motion.div>
      </motion.div>
    )
  }

  return (
    <div
      className={`flex items-center justify-center gap-4 ${padding} rounded-xl ${textColor}`}
      style={{
        ...getBgStyle(),
        boxShadow: '0 8px 32px rgba(0,0,0,0.25), 0 4px 12px rgba(0,0,0,0.15)',
      }}
    >
      <span className={iconSize}>{platformStyle.icon}</span>
      <div className="flex flex-col">
        <span className={`font-bold ${textSize} tracking-tight whitespace-nowrap`}>{config.username}</span>
        {!isPreview && (
          <span className="text-xs opacity-75 font-medium whitespace-nowrap">{config.customLabel || 'Follow for more!'}</span>
        )}
      </div>
    </div>
  )
}

// Badge style: Compact - Polished mini badge with glow
function BadgeSticker({ config, isPreview }: { config: StickerConfig; isPreview?: boolean }) {
  const platformStyle = PLATFORM_STYLES[config.platform]
  const iconSize = isPreview ? 'w-3.5 h-3.5' : 'w-4 h-4'
  const textSize = isPreview ? 'text-[10px]' : 'text-xs'
  const padding = isPreview ? 'px-2.5 py-1' : 'px-3 py-1.5'

  const getBgStyle = () => {
    switch (config.style) {
      case 'dark':
        return {
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16162a 100%)',
        }
      case 'light':
        return {
          background: 'linear-gradient(135deg, #ffffff 0%, #f0f0f5 100%)',
        }
      case 'gradient':
        return {
          background: `linear-gradient(135deg, ${platformStyle.color} 0%, ${platformStyle.color}cc 100%)`,
        }
      default:
        return {
          background: platformStyle.color,
        }
    }
  }

  const textColor = config.style === 'light' ? 'text-gray-900' : 'text-white'
  const glowColor = config.style === 'light' ? 'rgba(0,0,0,0.1)' : `${platformStyle.color}40`

  return (
    <div
      className={`inline-flex items-center gap-1.5 ${padding} rounded-full ${textColor}`}
      style={{
        ...getBgStyle(),
        boxShadow: `0 2px 8px rgba(0,0,0,0.2), 0 0 12px ${glowColor}`,
      }}
    >
      <span className={iconSize}>{platformStyle.icon}</span>
      <span className={`font-semibold ${textSize} tracking-tight whitespace-nowrap`}>{config.username}</span>
    </div>
  )
}

// Card style: Icon on top, text below - Professional elevated card with flip animation
function CardSticker({ config, isPreview, animated }: { config: StickerConfig; isPreview?: boolean; animated?: boolean }) {
  const platformStyle = PLATFORM_STYLES[config.platform]
  const iconSize = isPreview ? 'w-10 h-10' : 'w-14 h-14'
  const textSize = isPreview ? 'text-xs' : 'text-sm'
  const padding = isPreview ? 'p-3' : 'p-5'

  const getBgStyle = () => {
    switch (config.style) {
      case 'dark':
        return {
          background: 'linear-gradient(145deg, #1e1e32 0%, #141428 100%)',
        }
      case 'light':
        return {
          background: 'linear-gradient(145deg, #ffffff 0%, #f5f5fa 100%)',
        }
      case 'gradient':
        return {
          background: `linear-gradient(145deg, ${platformStyle.color} 0%, ${platformStyle.color}bb 100%)`,
        }
      default:
        return {
          background: platformStyle.color,
        }
    }
  }

  const textColor = config.style === 'light' ? 'text-gray-900' : 'text-white'

  if (animated) {
    const animationType = config.animation || 'cardFlip'
    const complexAnim = COMPLEX_ANIMATIONS[animationType as keyof typeof COMPLEX_ANIMATIONS] || COMPLEX_ANIMATIONS.cardFlip

    return (
      <motion.div
        className={`flex flex-col items-center gap-3 ${padding} rounded-2xl ${textColor}`}
        style={{
          ...getBgStyle(),
          boxShadow: '0 12px 40px rgba(0,0,0,0.3), 0 4px 12px rgba(0,0,0,0.15)',
          perspective: 1000,
        }}
        variants={complexAnim.container}
        initial="hidden"
        animate="visible"
      >
        <motion.div
          className={`${iconSize} p-2 rounded-xl`}
          style={{
            background: config.style === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.15)',
          }}
          variants={complexAnim.icon}
        >
          {platformStyle.icon}
        </motion.div>
        <motion.span
          className={`font-bold ${textSize} tracking-tight whitespace-nowrap`}
          variants={complexAnim.text}
        >
          {config.username}
        </motion.span>
      </motion.div>
    )
  }

  return (
    <div
      className={`flex flex-col items-center gap-3 ${padding} rounded-2xl ${textColor}`}
      style={{
        ...getBgStyle(),
        boxShadow: '0 12px 40px rgba(0,0,0,0.3), 0 4px 12px rgba(0,0,0,0.15)',
      }}
    >
      <div
        className={`${iconSize} p-2 rounded-xl`}
        style={{
          background: config.style === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.15)',
        }}
      >
        {platformStyle.icon}
      </div>
      <span className={`font-bold ${textSize} tracking-tight whitespace-nowrap`}>{config.username}</span>
    </div>
  )
}

// Minimal style: No background - Clean text with subtle shadow
function MinimalSticker({ config, isPreview }: { config: StickerConfig; isPreview?: boolean }) {
  const platformStyle = PLATFORM_STYLES[config.platform]
  const iconSize = isPreview ? 'w-5 h-5' : 'w-7 h-7'
  const textSize = isPreview ? 'text-sm' : 'text-base'

  const getColor = () => {
    switch (config.style) {
      case 'dark':
        return '#ffffff'
      case 'light':
        return '#1a1a2e'
      default:
        return platformStyle.color
    }
  }

  const color = getColor()
  const shadowColor = config.style === 'light' ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.8)'

  return (
    <div
      className="flex items-center gap-2.5"
      style={{
        filter: `drop-shadow(0 2px 4px ${shadowColor})`,
      }}
    >
      <span
        className={iconSize}
        style={{ color }}
      >
        {platformStyle.icon}
      </span>
      <span
        className={`font-bold ${textSize} tracking-tight whitespace-nowrap`}
        style={{ color }}
      >
        {config.username}
      </span>
    </div>
  )
}

// Multi-platform sticker - Premium multi-brand card
function MultiPlatformSticker({ config, isPreview, animated }: { config: StickerConfig; isPreview?: boolean; animated?: boolean }) {
  const platforms = config.platforms || [config.platform]
  const iconSize = isPreview ? 'w-5 h-5' : 'w-6 h-6'
  const textSize = isPreview ? 'text-xs' : 'text-sm'
  const padding = isPreview ? 'p-3' : 'p-4'

  const getBgStyle = () => {
    switch (config.style) {
      case 'dark':
        return {
          background: 'linear-gradient(145deg, #1e1e32 0%, #0d0d1a 100%)',
        }
      case 'light':
        return {
          background: 'linear-gradient(145deg, #ffffff 0%, #f0f0f5 100%)',
        }
      default:
        // Rainbow gradient for multi-platform
        return {
          background: 'linear-gradient(135deg, #9146FF 0%, #E4405F 50%, #00f2ea 100%)',
        }
    }
  }

  const textColor = config.style === 'light' ? 'text-gray-900' : 'text-white'

  if (animated) {
    return (
      <motion.div
        className={`flex flex-col items-center gap-3 ${padding} rounded-2xl ${textColor}`}
        style={{
          ...getBgStyle(),
          boxShadow: '0 10px 40px rgba(0,0,0,0.3), 0 4px 12px rgba(0,0,0,0.2)',
        }}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-full"
          style={{
            background: config.style === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.15)',
          }}
        >
          {platforms.slice(0, 4).map((p, i) => (
            <motion.span
              key={p}
              className={iconSize}
              style={{ color: config.style === 'light' ? PLATFORM_STYLES[p].color : undefined }}
              variants={itemVariants}
              custom={i}
            >
              {PLATFORM_STYLES[p].icon}
            </motion.span>
          ))}
        </div>
        <motion.span
          className={`font-bold ${textSize} tracking-tight whitespace-nowrap`}
          variants={itemVariants}
        >
          {config.username}
        </motion.span>
      </motion.div>
    )
  }

  return (
    <div
      className={`flex flex-col items-center gap-3 ${padding} rounded-2xl ${textColor}`}
      style={{
        ...getBgStyle(),
        boxShadow: '0 10px 40px rgba(0,0,0,0.3), 0 4px 12px rgba(0,0,0,0.2)',
      }}
    >
      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded-full"
        style={{
          background: config.style === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.15)',
        }}
      >
        {platforms.slice(0, 4).map(p => (
          <span
            key={p}
            className={iconSize}
            style={{ color: config.style === 'light' ? PLATFORM_STYLES[p].color : undefined }}
          >
            {PLATFORM_STYLES[p].icon}
          </span>
        ))}
      </div>
      <span className={`font-bold ${textSize} tracking-tight whitespace-nowrap`}>{config.username}</span>
    </div>
  )
}

// Main renderer component - Factory pattern
export default function StickerRenderer({ config, className = '', onClick, isPreview = false }: StickerRendererProps) {
  const isAnimated = config.animated && !isPreview

  const renderSticker = () => {
    // Handle multi-platform stickers
    if (config.platforms && config.platforms.length > 1) {
      return <MultiPlatformSticker config={config} isPreview={isPreview} animated={isAnimated} />
    }

    switch (config.template) {
      case 'follow':
        return <FollowSticker config={config} isPreview={isPreview} animated={isAnimated} />
      case 'subscribe':
        return <SubscribeSticker config={config} isPreview={isPreview} animated={isAnimated} />
      case 'banner':
        return <BannerSticker config={config} isPreview={isPreview} animated={isAnimated} />
      case 'badge':
        return <BadgeSticker config={config} isPreview={isPreview} />
      case 'card':
        return <CardSticker config={config} isPreview={isPreview} animated={isAnimated} />
      case 'minimal':
        return <MinimalSticker config={config} isPreview={isPreview} />
      case 'basic':
      default:
        return <BasicSticker config={config} isPreview={isPreview} animated={isAnimated} />
    }
  }

  // For preview thumbnails, don't animate
  if (isPreview) {
    return (
      <div className={className} onClick={onClick}>
        {renderSticker()}
      </div>
    )
  }

  // For animated stickers, the component handles its own animation
  // No need for outer wrapper animation when using complex animations
  if (config.animated) {
    return (
      <div className={className} onClick={onClick}>
        {renderSticker()}
      </div>
    )
  }

  // Non-animated sticker
  return (
    <div className={className} onClick={onClick}>
      {renderSticker()}
    </div>
  )
}

// Export a function to create sticker configs from the existing SOCIAL_STICKERS format
export function createStickerConfig(
  stickerId: string,
  platform: SocialPlatform | 'multiple',
  platforms: SocialPlatform[] | undefined,
  username: string,
  style: string,
  template: StickerTemplate = 'basic'
): StickerConfig {
  return {
    id: stickerId,
    template,
    platform: platform === 'multiple' ? (platforms?.[0] || 'twitch') : platform,
    platforms: platform === 'multiple' ? platforms : undefined,
    username,
    style: style as StickerStyle,
    animated: false,
  }
}
