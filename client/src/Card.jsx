import React, { useState } from "react";
import { motion, useAnimation } from "framer-motion";

function Card({ img, title, text, onClick }) {
  const controls = useAnimation();

  const bounceUp = { y: -15 };
  const bounceDown = { y: 0 };

  return (
    <motion.div
      className="card"
      onClick={onClick}
      style={{ cursor: "pointer" }}
      animate={controls}
      onHoverStart={() => controls.start(bounceUp, { duration: 0.1, ease: "easeInOut" })}
      onHoverEnd={() => controls.start(bounceDown, { duration: 0.1, ease: "easeInOut" })}
    >
      <img className="card-image" src={img} alt={title} />
      <h2 className="card-title">{title}</h2>
      <p className="card-text">{text}</p>
    </motion.div>
  );
}

export default Card;
