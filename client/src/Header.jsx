import React from 'react';
import { motion } from 'framer-motion';

const bounceTransition = {
  repeat: Infinity, // makes the animation loop back and forth
  duration: 2,
  ease: "easeInOut", // gives a "bounce" feel
};

function Header() {
  return (
    <header>
      <motion.h1
        animate={{
          y: [0, -10, 0] // moves up slightly, then back down
        }}
        transition={bounceTransition}
      >
        The Imitation Project
      </motion.h1>
      <hr />
    </header>
  );
}

export default Header;
