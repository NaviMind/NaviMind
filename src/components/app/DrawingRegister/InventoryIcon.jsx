"use client";

import { motion } from "framer-motion";

/**
 * Animated inventory/box icon based on the Material Design "inventory_2" icon.
 * The lid (upper portion) lifts when isOpen is true.
 *
 * Original Material Design path uses a 960x960 viewBox — we split it into:
 *   - body: the box walls + bottom (M200-80 ... path)
 *   - lid:  the top rim/cover (the h640v-120 rectangle)
 *   - latch: center ribbon inside the box
 */
export default function InventoryIcon({ isOpen = false, size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 -960 960 960"
      fill="currentColor"
      style={{ overflow: "visible" }}
      aria-hidden="true"
    >
      {/* Box body — walls + bottom + center ribbon (static) */}
      <path d="M200-80q-33 0-56.5-23.5T120-160v-451q-18-11-29-28.5T80-680v-40h800v40q0 23-11 40.5T840-611v451q0 33-23.5 56.5T760-80H200Zm0-80h560v-440H200v440Zm160-160h240v-80H360v80Z" />

      {/* Lid — top rim that lifts on open */}
      <motion.path
        d="M160-760h640v-80H160v80Z"
        animate={
          isOpen
            ? { scaleY: 0.2, y: -60, opacity: 0.5 }
            : { scaleY: 1, y: 0, opacity: 1 }
        }
        transition={{ duration: 0.22, ease: "easeOut" }}
        style={{ transformOrigin: "center bottom", transformBox: "fill-box" }}
      />
    </svg>
  );
}
