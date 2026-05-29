import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import { createPortal } from "react-dom";
import { motion, useAnimation } from "framer-motion";

const tabs = [
  { id: "home", label: "Play", icon: "▶" },
  { id: "dashboard", label: "Data", icon: "☰" },
  { id: "patchnotes", label: "Notes", icon: "⋮" },
  { id: "settings", label: "Settings", icon: "◎" },
];

const getPotency = (ms) => {
  if (ms <= 20000) return Math.sqrt(ms / 5000);
  return 2 + (ms - 20000) / 10000;
};

const getColor = (pot) => {
  if (pot < 1) {
    const t = pot;
    return `hsl(${15 - t * 15}, ${t * 100}%, ${88 - t * 38}%)`;
  }
  if (pot < 2) {
    const t = pot - 1;
    return `hsl(${350 - t * 70}, 100%, ${50 - t * 12}%)`;
  }
  if (pot < 3) {
    const t = pot - 2;
    return `hsl(${280 - t * 40}, 100%, ${38 - t * 5}%)`;
  }
  if (pot < 4.9) {
    const t = (pot - 3) / 1.9;
    return `hsl(${240 - t * 40}, 100%, ${33 - t * 5}%)`;
  }
  const hue = ((pot - 4.9) * 60) % 360;
  return `hsl(${hue}, 100%, 50%)`;
};

const NavButton = forwardRef(({ tab, active, onPress, onSecret, onTimerUpdate, onEasterEggUpdate, onSecretRelease }, ref) => {
  const isSecret = tab.id === "settings";
  const anim = useAnimation();
  const btnRef = useRef();
  const holdStartRef = useRef(0);
  const releasedRef = useRef(false);
  const timerRef = useRef(null);
  const [holdTime, setHoldTime] = useState(0);
  const [btnColor, setBtnColor] = useState("");
  const [detached, setDetached] = useState(false);
  const detachedRef = useRef(false);
  const [pointerPos, setPointerPos] = useState({ x: 0, y: 0 });
  const [bounceData, setBounceData] = useState(null);
  const secretLaunchedRef = useRef(false);
  const easterEggSentRef = useRef(false);

  const setAnimating = (v) => {
    btnRef.current?.setAttribute("data-animating", v ? "true" : "false");
  };

  useEffect(() => {
    anim.set({ scale: 0.85 });
  }, []);

  // --- SIMPLE COMPRESS ---
  const simpleCompress = async () => {
    setAnimating(true);
    await anim.start({
      y: -18, scale: 0.82, scaleX: 1.3,
      transition: { duration: 0.07, ease: "easeOut" }
    });
  };

  // --- SECRET COMPRESS ---
  const secretCompress = async () => {
    setAnimating(true);

    await anim.start({
      y: -18, scale: 0.82, scaleX: 1.3,
      filter: "brightness(1)",
      transition: { duration: 0.07, ease: "easeOut" }
    });

    if (releasedRef.current) return;

    let shakeAmp = 3;
    let screenShakeActive = false;
    const injectScreenShake = () => {
      if (document.getElementById("shake-css")) return;
      const el = document.createElement("style");
      el.id = "shake-css";
      el.textContent = `@keyframes screen-rattle {
        0% { transform: translate(0); }
        10% { transform: translate(-6px, 3px); }
        20% { transform: translate(5px, -4px); }
        30% { transform: translate(-3px, 5px); }
        40% { transform: translate(7px, -2px); }
        50% { transform: translate(-5px, -3px); }
        60% { transform: translate(4px, 6px); }
        70% { transform: translate(-7px, -2px); }
        80% { transform: translate(3px, -5px); }
        90% { transform: translate(-2px, 4px); }
      }
      .app-wrapper { animation: screen-rattle 0.08s infinite; }`;
      document.head.appendChild(el);
    };
    const removeScreenShake = () => {
      document.getElementById("shake-css")?.remove();
    };

    const escalateShake = () => {
      if (releasedRef.current) return;
      shakeAmp += 3;

      const elapsed = Date.now() - holdStartRef.current;
      const pot = getPotency(elapsed);

      if (elapsed > 10000 && !detachedRef.current) {
        setDetached(true);
        detachedRef.current = true;
      }

      if (elapsed > 60000 && !secretLaunchedRef.current) {
        secretLaunchedRef.current = true;
        onSecret({
          holdStart: holdStartRef.current,
          color: getColor(pot),
          tabLabel: tab.label
        });
      }

      if (!detachedRef.current) {
        const vals = [0];
        for (let a = shakeAmp; a >= 1; a -= 1) vals.push(-a, a);
        vals.push(0);
        const shakeDur = Math.max(0.18, 0.5 - shakeAmp * 0.018);
        const scalePulse = 0.85 + shakeAmp * 0.008;
        anim.start({
          x: vals,
          scale: [0.85, scalePulse, 0.85],
          rotate: [0, shakeAmp * 0.3, -shakeAmp * 0.2, 0],
          transition: { duration: shakeDur, ease: "easeInOut", repeat: Infinity }
        });
      }

      setBtnColor(getColor(pot));

      if (elapsed > 60000 && !screenShakeActive && !secretLaunchedRef.current) {
        screenShakeActive = true;
        injectScreenShake();
      }

      const interval = Math.max(600, 1500 - shakeAmp * 30);
      setTimeout(escalateShake, interval);
    };

    const initialVals = [0, -3, 3, -2, 2, -1, 1, 0];
    anim.start({
      filter: "brightness(4)",
      x: initialVals,
      transition: { filter: { duration: 0.3 }, x: { duration: 0.5, ease: "easeInOut", repeat: Infinity } }
    });

    setBtnColor("#fff");
    setTimeout(escalateShake, 1500);
  };

  // --- SIMPLE RELEASE ---
  const simpleRelease = async () => {
    releasedRef.current = true;
    anim.stop();
    await anim.start({
      y: 0, scale: 0.85, scaleX: 1, x: 0,
      filter: "brightness(1)",
      transition: { type: "spring", stiffness: 300, damping: 15, mass: 0.8 }
    });
    setAnimating(false);
  };

  // --- SECRET RELEASE ---
  const secretRelease = async (holdDuration) => {
    releasedRef.current = true;
    anim.stop();
    setBtnColor("");

    if (secretLaunchedRef.current) {
      setAnimating(false);
      document.getElementById("shake-css")?.remove();
      return;
    }

    try {
      const pot = getPotency(holdDuration);

      const popDur = 0.04 + Math.min(pot * 0.02, 0.1);
      setBtnColor(getColor(pot));
      await anim.start({
        y: 0, scale: 0.85, scaleX: 1, x: 0,
        filter: "brightness(" + (1.4 - pot * 0.05) + ") saturate(" + (3 + pot * 0.5) + ")",
        transition: { duration: popDur }
      });

      if (holdDuration > 60000) {
        const navPc = btnRef.current?.closest(".nav-bar-pc");
        if (navPc) navPc.style.overflow = "visible";

        const extra = Math.floor((holdDuration - 60000) / 30000);
        const loops = 1 + extra;

        for (let i = 0; i < loops; i++) {
          const m = 1 + i * 0.8;
          await anim.start({
            y: -350 * m, x: -250 * m, rotate: 900 * m,
            scale: 2.2 * m, scaleX: 1.3 + 0.3 * i,
            transition: { duration: 0.7 + i * 0.15, ease: "easeOut" }
          });
          await anim.start({
            y: -150 * m, x: 200 * m, rotate: 720 * m, scale: 1.6 * m, scaleX: 0.6 - 0.12 * i,
            transition: { duration: 0.5 + i * 0.1, ease: "easeInOut" }
          });
          if (i < loops - 1) {
            const r = i + 1;
            await anim.start({
              y: -80 * r, x: 0, rotate: 540, scaleX: 1.4,
              scale: 1.3 * r,
              transition: { duration: 0.35, ease: "easeInOut" }
            });
          }
        }

        if (holdDuration > 120000) {
          await new Promise(r => setTimeout(r, 800 + extra * 200));
        }

        await anim.start({
          x: 0, y: 0, rotate: 0, scale: 0.85, scaleX: 1,
          filter: "brightness(4)",
          transition: { type: "spring", stiffness: 60, damping: 6, mass: 1.2 }
        });

        document.getElementById("shake-css")?.remove();
        if (navPc) navPc.style.overflow = "";
      } else {
        const cycles = Math.max(1, 1 + Math.floor(pot * 2.5));
        const totalDur = 0.4 + pot * 0.5;
        const cx = 0.92 - pot * 0.05;
        const cy = 1.03 + pot * 0.035;
        const scaleJitter = 0.85 + pot * 0.02;

        const scX = [1];
        const scY = [1];
        const sc = [0.85];
        const rot = [0];
        for (let i = 0; i < cycles; i++) {
          const jitter = (i % 3 - 1) * (0.03 + pot * 0.008);
          scX.push(cx + jitter, 1);
          scY.push(cy - jitter * 0.5, 1);
          sc.push(scaleJitter + jitter, 0.85);
          rot.push((i % 2 === 0 ? -1 : 1) * (1 + pot * 1.2), 0);
        }

        await anim.start({
          scaleX: scX,
          scaleY: scY,
          scale: sc,
          rotate: rot,
          filter: "brightness(4)",
          transition: { duration: totalDur, ease: "easeInOut" }
        });
      }
    } finally {
      setBtnColor("");
      setAnimating(false);
    }
    await anim.start({
      y: 0, x: 0, scale: 0.85, scaleX: 1, scaleY: 1, rotate: 0,
      filter: "brightness(1)",
      transition: { type: "spring", stiffness: 300, damping: 15 }
    });
  };

  const compressFn = isSecret ? secretCompress : simpleCompress;
  const releaseFn = isSecret ? secretRelease : simpleRelease;
  const shrinkFn = async () => {};

  useImperativeHandle(ref, () => ({
    shrink: shrinkFn,
    compress: compressFn,
    release: releaseFn
  }), [isSecret, anim]);

  const handlePointerDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    holdStartRef.current = Date.now();
    releasedRef.current = false;
    secretLaunchedRef.current = false;
    detachedRef.current = false;
    easterEggSentRef.current = false;
    setHoldTime(0);
    setDetached(false);
    setBounceData(null);
    compressFn();
    onPress(tab.id);

    if (isSecret) {
      timerRef.current = setInterval(() => {
        if (releasedRef.current) { clearInterval(timerRef.current); return; }
        const t = Date.now() - holdStartRef.current;
        setHoldTime(t);
        onTimerUpdate?.(t);
        if (t > 10000 && !easterEggSentRef.current) {
          easterEggSentRef.current = true;
          onEasterEggUpdate?.({ holdStart: holdStartRef.current });
        }
      }, 100);
    }
  };

  const handlePointerMove = (e) => {
    if (holdStartRef.current > 0) {
      setPointerPos({ x: e.clientX, y: e.clientY });
    }
  };

  const handlePointerUp = () => {
    if (holdStartRef.current > 0) {
      clearInterval(timerRef.current);
      const duration = Date.now() - holdStartRef.current;

      if (detachedRef.current) {
        const vw = window.innerWidth, vh = window.innerHeight;
        const size = 100;
        const steps = 5;
        const targets = [];
        let cx = pointerPos.x, cy = pointerPos.y;
        for (let i = 0; i < steps; i++) {
          cx = Math.max(size, Math.min(vw - size, cx + (Math.random() - 0.5) * (vw * 0.6)));
          cy = Math.max(size, Math.min(vh - size, cy + (Math.random() - 0.5) * (vh * 0.6)));
          targets.push({ x: cx, y: cy, scale: 1 - i * 0.12, rotate: (i % 2 === 0 ? 1 : -1) * (360 + 180 * i), opacity: i < steps - 1 ? 1 : 0 });
        }
        setBounceData({
          startX: pointerPos.x - 50, startY: pointerPos.y - 20,
          targets, color: btnColor, icon: tab.icon, label: tab.label
        });
        setDetached(false);
        setTimeout(() => {
          setBounceData(null);
          anim.stop();
          anim.set({ y: 0, scale: 0.85, scaleX: 1, x: 0, filter: "brightness(1)" });
          holdStartRef.current = 0;
          setHoldTime(0);
          onTimerUpdate?.(0);
          if (easterEggSentRef.current) {
            easterEggSentRef.current = false;
            onEasterEggUpdate?.(null);
          }
          if (secretLaunchedRef.current) onSecretRelease?.();
        }, 2800);
        return;
      }

      releaseFn(duration);
      holdStartRef.current = 0;
      setHoldTime(0);
      setDetached(false);
      onTimerUpdate?.(0);
      if (easterEggSentRef.current) {
        easterEggSentRef.current = false;
        onEasterEggUpdate?.(null);
      }
    }
  };

  const pot = isSecret && holdTime > 0 ? getPotency(holdTime) : 0;
  const multiplier = (1 + pot * 0.5).toFixed(2);

  return (
    <>
      <motion.button
        ref={btnRef}
        key={tab.id}
        className={`nav-item-pc ${active ? "active" : ""}`}
        aria-label={tab.label}
        animate={anim}
        style={{
          transformOrigin: "top center", position: "relative",
          color: btnColor || undefined,
          ...(detached ? { visibility: "hidden", pointerEvents: "none" } : {})
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <span className="nav-icon">{tab.icon}</span>
        <span className="nav-label">{tab.label}</span>
      </motion.button>
      {isSecret && detached && createPortal(
        (() => {
          const dur = Math.max(0.15, 0.5 - pot * 0.025);
          const rotAmp = 5 + pot * 4;
          const sAmp = 0.1 + pot * 0.025;
          return (
            <motion.div
              style={{
                position: "fixed", left: pointerPos.x - 50, top: pointerPos.y - 20,
                zIndex: 1000, pointerEvents: "none",
                display: "flex", alignItems: "center", gap: "8px",
                padding: "7px 14px", background: "#000",
                border: `1px solid ${btnColor || "#555"}`,
                color: btnColor || "#fff",
                fontFamily: "'Goudy Old Style', serif",
                fontSize: `${0.85 + pot * 0.06}rem`,
                letterSpacing: "0.08rem",
                boxShadow: `0 0 20px ${btnColor || "transparent"}`
              }}
              animate={{
                rotate: [0, rotAmp, -rotAmp, rotAmp * 0.6, -rotAmp * 0.8, rotAmp * 0.3, 0],
                scaleX: [1, 1 + sAmp * 3, 1 - sAmp * 2, 1 + sAmp, 1 - sAmp * 0.5, 1],
                scaleY: [1, 1 - sAmp * 2, 1 + sAmp * 3, 1 - sAmp, 1 + sAmp * 0.5, 1],
                borderRadius: ["4px", `${8 + pot * 4}px`, "2px", `${4 + pot * 2}px`, `${12 + pot * 4}px`, "4px"],
                skewX: [0, 4 + pot, -(3 + pot * 0.5), 2 + pot * 0.3, -(1 + pot * 0.2), 0]
              }}
              transition={{ duration: dur, repeat: Infinity, ease: "easeInOut" }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </motion.div>
          );
        })(),
        document.body
      )}
      {bounceData && createPortal(
        <motion.div
          initial={{ left: bounceData.startX, top: bounceData.startY, scale: 1, rotate: 0, opacity: 1 }}
          animate={{
            left: bounceData.targets.map(t => t.x),
            top: bounceData.targets.map(t => t.y),
            scale: bounceData.targets.map(t => t.scale),
            rotate: bounceData.targets.map(t => t.rotate),
            opacity: bounceData.targets.map(t => t.opacity)
          }}
          transition={{ duration: 2.5, ease: "easeInOut" }}
          style={{
            position: "fixed", zIndex: 1000, pointerEvents: "none",
            display: "flex", alignItems: "center", gap: "8px",
            padding: "7px 14px", background: "#000",
            border: `1px solid ${bounceData.color || "#555"}`,
            color: bounceData.color || "#fff",
            fontFamily: "'Goudy Old Style', serif",
            fontSize: "0.85rem", letterSpacing: "0.08rem",
            boxShadow: `0 0 20px ${bounceData.color || "transparent"}`
          }}
        >
          <span>{bounceData.icon}</span>
          <span>{bounceData.label}</span>
        </motion.div>,
        document.body
      )}
    </>
  );
});

function NavBar({ current, onNavigate, onSecret, onEasterEggUpdate, onSecretRelease }) {
  const btnRefs = useRef({});

  const isMobile = "ontouchstart" in window || window.innerWidth < 768;
  const routeTab = (tabId) => {
    if (tabId === "dashboard" && isMobile) onNavigate("database");
    else onNavigate(tabId);
  };
  const isActive = (tabId) => {
    if (tabId === "dashboard") return current === "dashboard" || current === "database";
    return current === tabId;
  };

  const handlePress = (tabId) => {
    if (tabId === current) return;
    setTimeout(() => routeTab(tabId), 80);
  };

  if (isMobile) {
    return (
      <motion.nav
        className="nav-bar-mobile"
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20, mass: 0.7 }}
      >
        {tabs.map((tab) => {
          const active = isActive(tab.id);
          return (
            <motion.button
              key={tab.id}
              className={`nav-item-mobile ${active ? "active" : ""}`}
              onClick={() => routeTab(tab.id)}
              aria-label={tab.label}
              whileTap={{ scale: 0.88 }}
              transition={{ type: "spring", stiffness: 400, damping: 15, mass: 0.5 }}
            >
              <motion.span
                className="nav-icon"
                animate={active ? { y: -2, scale: 1.1 } : { y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 15 }}
              >
                {tab.icon}
              </motion.span>
              <span className="nav-label">{tab.label}</span>
              {active && (
                <motion.span
              
                  
                />
              )}
            </motion.button>
          );
        })}
      </motion.nav>
    );
  }

  return (
    <nav className="nav-bar-pc">
      <div className="nav-inner">
        {tabs.map((tab) => (
          <NavButton
            key={tab.id}
            ref={(el) => { btnRefs.current[tab.id] = el; }}
            tab={tab}
            active={isActive(tab.id)}
            onPress={handlePress}
            onSecret={onSecret}
            onEasterEggUpdate={tab.id === "settings" ? onEasterEggUpdate : undefined}
            onSecretRelease={tab.id === "settings" ? onSecretRelease : undefined}
          />
        ))}
      </div>
    </nav>
  );
}

export default NavBar;
