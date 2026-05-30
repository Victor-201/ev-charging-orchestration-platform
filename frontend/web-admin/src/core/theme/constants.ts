/**
 * Framer Motion Animation & Spring Presets
 */
export const SPRING_TRANSITIONS = {
  // Ultra smooth spring for cards, layout shifts, and major transitions
  smooth: {
    type: 'spring',
    stiffness: 100,
    damping: 15,
    mass: 0.8
  },
  // Bouncy spring for micro-animations, toggles, buttons, and switches
  bouncy: {
    type: 'spring',
    stiffness: 300,
    damping: 20
  },
  // Soft hover state transition
  hover: {
    type: 'spring',
    stiffness: 400,
    damping: 25
  },
  // Easing transition for fades and simple scaling
  fade: {
    duration: 0.35,
    ease: 'easeInOut'
  }
};

/**
 * Brand Gadients configurations matching theme_design.md
 */
export const BRAND_GRADIENTS = {
  cyanLime: 'linear-gradient(135deg, #10bfc9 0%, #19be4b 100%)',
  orangePink: 'linear-gradient(135deg, #ffd3a5 0%, #fd6585 100%)',
  blueCyan: 'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)',
  yellowOrange: 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)',
  purpleBlue: 'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)',
};

export const BRAND_GLOWS = {
  cyan: 'rgba(16, 191, 201, 0.4)',
  pink: 'rgba(253, 101, 133, 0.4)',
  blue: 'rgba(102, 166, 255, 0.4)',
  orange: 'rgba(253, 160, 133, 0.4)',
  purple: 'rgba(168, 85, 247, 0.4)',
};
