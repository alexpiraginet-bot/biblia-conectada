"use client";
import { useEffect } from "react";

/** Progressive enhancement: the reading and all links remain present without JavaScript. */
export function HomeMotion() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>("[data-home]");
    if (!root) return;
    let active = true;
    let disposeStory: (() => void) | undefined;
    const story = root.querySelector<HTMLElement>("[data-living-story]");
    const storyObserver = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      storyObserver.disconnect();
      void import("./living-story-player").then(({ enhanceLivingStory }) => {
        if (active && story) disposeStory = enhanceLivingStory(story);
      }).catch(() => {}); // The poster and destination links remain available.
    }, { rootMargin: "150px" });
    if (story) storyObserver.observe(story);
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const reveals = [...root.querySelectorAll<HTMLElement>("[data-reveal]")];
    const revealAll = () => reveals.forEach((el) => { el.classList.remove("will-reveal"); el.classList.add("is-revealed"); });
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) if (entry.isIntersecting) {
        entry.target.classList.add("is-revealed");
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.08 });
    if (!media.matches) {
      for (const el of reveals) {
        if (el.getBoundingClientRect().top > window.innerHeight) el.classList.add("will-reveal");
        observer.observe(el);
      }
    }
    const onPreference = () => { if (media.matches) { revealAll(); observer.disconnect(); } };
    media.addEventListener("change", onPreference);
    const cards = [...root.querySelectorAll<HTMLElement>("[data-spotlight]")];
    const onPointer = (event: PointerEvent) => {
      if (media.matches || event.pointerType === "touch") return;
      const el = event.currentTarget as HTMLElement, box = el.getBoundingClientRect();
      el.style.setProperty("--pointer-x", `${event.clientX - box.left}px`);
      el.style.setProperty("--pointer-y", `${event.clientY - box.top}px`);
    };
    cards.forEach((card) => card.addEventListener("pointermove", onPointer));
    return () => { active = false; storyObserver.disconnect(); disposeStory?.(); observer.disconnect(); media.removeEventListener("change", onPreference); cards.forEach((card) => card.removeEventListener("pointermove", onPointer)); revealAll(); };
  }, []);
  return null;
}
