import { domMax } from "motion/react";

/**
 * Motion feature bundle, loaded lazily by `MotionProvider`. `domMax` includes
 * drag, layout and in-view features; keeping it behind a dynamic import keeps
 * the synchronous bundle small while the `m` components render immediately.
 */
export default domMax;
