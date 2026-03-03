"use client";

import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { Plus } from "lucide-react";

// Register GSAP Plugins safely
if (typeof window !== "undefined") {
  gsap.registerPlugin(CustomEase);
}

export function Component() {
  // We need a ref for the parent container to scope GSAP
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Initial Setup & Hover Effects
  useEffect(() => {
    const currentContainer = containerRef.current;
    if (!currentContainer) return;

    // Create custom easing
    try {
      if (!gsap.parseEase("main")) {
        CustomEase.create("main", "0.65, 0.01, 0.05, 0.99");
        gsap.defaults({ ease: "main", duration: 0.7 });
      }
    } catch (e) {
      console.warn("CustomEase failed to load, falling back to default.", e);
      gsap.defaults({ ease: "power2.out", duration: 0.7 });
    }

    const ctx = gsap.context(() => {
      // 1. Arrow Animation (Removed from indicator, but keeping logic if arrow existed/restored elsewhere)
      // Since arrow is removed from JSX, this selector won't find anything, which is fine (safe check).
      const arrowLine = document.querySelector(".arrow-line");
      if (arrowLine) {
        const pathLength = (arrowLine as SVGPathElement).getTotalLength();
        gsap.set(arrowLine, { strokeDasharray: pathLength, strokeDashoffset: pathLength });
        const arrowTl = gsap.timeline({ repeat: -1, repeatDelay: 0.8 });
        arrowTl
          .to(arrowLine, { strokeDashoffset: 0, duration: 1, ease: "power2.out" })
          .to({}, { duration: 1.2 })
          .to(arrowLine, { strokeDashoffset: -pathLength, duration: 0.6, ease: "power2.in" })
          .set(arrowLine, { strokeDashoffset: pathLength });
      }

      // 2. Shape Hover
      // Updated Selectors: .menu-list-item -> .menu-list-item, .abstract-shapes -> .ambient-background-shapes
      const menuItems = containerRef.current!.querySelectorAll(".menu-list-item[data-shape]");
      const shapesContainer = containerRef.current!.querySelector(".ambient-background-shapes");

      menuItems.forEach((item) => {
        const shapeIndex = item.getAttribute("data-shape");
        // Updated Selector: .shape -> .bg-shape
        const shape = shapesContainer ? shapesContainer.querySelector(`.bg-shape-${shapeIndex}`) : null;

        if (!shape) return;

        // Updated Selector: .shape-el -> .shape-element
        const shapeEls = shape.querySelectorAll(".shape-element");

        const onEnter = () => {
          if (shapesContainer) {
            // Updated Selector: .shape -> .bg-shape
            shapesContainer.querySelectorAll(".bg-shape").forEach((s) => s.classList.remove("active"));
          }
          shape.classList.add("active");

          gsap.fromTo(shapeEls,
            { scale: 0.5, opacity: 0, rotation: -10 },
            { scale: 1, opacity: 1, rotation: 0, duration: 0.6, stagger: 0.08, ease: "back.out(1.7)", overwrite: "auto" }
          );
        };

        const onLeave = () => {
          gsap.to(shapeEls, {
            scale: 0.8, opacity: 0, duration: 0.3, ease: "power2.in",
            onComplete: () => shape.classList.remove("active"),
            overwrite: "auto"
          });
        };

        item.addEventListener("mouseenter", onEnter);
        item.addEventListener("mouseleave", onLeave);

        (item as any)._cleanup = () => {
          item.removeEventListener("mouseenter", onEnter);
          item.removeEventListener("mouseleave", onLeave);
        };
      });

    }, containerRef);

    return () => {
      ctx.revert();
      if (currentContainer) {
        const items = currentContainer.querySelectorAll(".menu-list-item[data-shape]");
        items.forEach((item: any) => item._cleanup && item._cleanup());
      }
    };
  }, []);

  // Menu Open/Close Animation Effect
  useEffect(() => {
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      // Updated Selectors: .nav -> .nav-overlay-wrapper, .menu -> .menu-content
      const navWrap = containerRef.current!.querySelector(".nav-overlay-wrapper");
      const menu = containerRef.current!.querySelector(".menu-content");
      const overlay = containerRef.current!.querySelector(".overlay");
      // Updated Selector: .bg-panel -> .backdrop-layer
      const bgPanels = containerRef.current!.querySelectorAll(".backdrop-layer");
      // Updated Selector: .menu-link -> .nav-link
      const menuLinks = containerRef.current!.querySelectorAll(".nav-link");
      const fadeTargets = containerRef.current!.querySelectorAll("[data-menu-fade]");

      // Updated Selector: .menu-button -> .nav-close-btn
      const menuButton = containerRef.current!.querySelector(".nav-close-btn");
      const menuButtonTexts = menuButton?.querySelectorAll("p");
      // Updated Selector: .menu-button-icon -> .menu-button-icon (unchanged in CSS/JSX?) No, wait, CSS had .menu-button-icon
      const menuButtonIcon = menuButton?.querySelector(".menu-button-icon");

      const tl = gsap.timeline();

      if (isMenuOpen) {
        // OPEN
        if (navWrap) navWrap.setAttribute("data-nav", "open");

        tl.set(navWrap, { display: "block" })
          .set(menu, { xPercent: 0 }, "<")
          // Animate Button Text Swapping if it exists
          .fromTo(menuButtonTexts || [], { yPercent: 0 }, { yPercent: -100, stagger: 0.2 })
          .fromTo(menuButtonIcon || [], { rotate: 0 }, { rotate: 315 }, "<")

          .fromTo(overlay, { autoAlpha: 0 }, { autoAlpha: 1 }, "<")
          .fromTo(bgPanels, { xPercent: 101 }, { xPercent: 0, stagger: 0.12, duration: 0.575 }, "<")
          .fromTo(menuLinks, { yPercent: 140, rotate: 10 }, { yPercent: 0, rotate: 0, stagger: 0.05 }, "<+=0.35");

        if (fadeTargets.length) {
          // Keep clearProps: "all" for blog entry fix
          tl.fromTo(fadeTargets, { autoAlpha: 0, yPercent: 50 }, { autoAlpha: 1, yPercent: 0, stagger: 0.04, clearProps: "all" }, "<+=0.2");
        }

      } else {
        // CLOSE
        if (navWrap) navWrap.setAttribute("data-nav", "closed");

        tl.to(overlay, { autoAlpha: 0 })
          .to(menu, { xPercent: 120 }, "<")
          // Animate Button Text and Icon Back
          .to(menuButtonTexts || [], { yPercent: 0 }, "<")
          .to(menuButtonIcon || [], { rotate: 0 }, "<")

          .set(navWrap, { display: "none" });
      }

    }, containerRef);

    return () => ctx.revert();
  }, [isMenuOpen]);

  // keydown Escape handling
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isMenuOpen) {
        setIsMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isMenuOpen]);

  const toggleMenu = () => setIsMenuOpen(prev => !prev);
  const closeMenu = () => setIsMenuOpen(false);

  return (
    <div ref={containerRef}>
      <div className="site-header-wrapper fixed top-0 left-0 w-full z-40 p-6 md:p-10 pointer-events-none">
        <header className="header">
          <div className="container mx-auto flex justify-between items-center">
            <a href="#" aria-label="home" className="nav-logo-row text-2xl font-bold text-white pointer-events-auto">
              {/* Logo */}
            </a>
            <div className="nav-row__right flex items-center gap-6 pointer-events-auto">
              <div className="nav-toggle-label cursor-pointer" onClick={toggleMenu}>
                <span className="toggle-text text-lg font-medium hover:text-indigo-400 transition-colors"></span>
              </div>

              <button role="button" className="nav-close-btn relative w-28 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-between px-4 hover:bg-white/20 transition-colors overflow-hidden group" onClick={toggleMenu}>
                <div className="menu-button-text absolute inset-0 flex flex-col pointer-events-none">
                  <p className="p-large h-full w-full flex items-center justify-start pl-5 text-sm font-medium shrink-0 m-0">Menu</p>
                  <p className="p-large h-full w-full flex items-center justify-start pl-5 text-sm font-medium shrink-0 m-0">Close</p>
                </div>
                <div className="icon-wrap flex items-center justify-center ml-auto">
                  <Plus className="menu-button-icon w-5 h-5 text-white" />
                </div>
              </button>
            </div>
          </div>
        </header>
      </div>

      <section className="fullscreen-menu-container fixed inset-0 z-50 pointer-events-none">
        <div data-nav="closed" className="nav-overlay-wrapper fixed inset-0 pointer-events-auto" style={{ display: 'none' }}>
          <div className="overlay absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeMenu}></div>

          <nav className="menu-content absolute top-0 right-0 w-full md:w-[500px] lg:w-[600px] h-full bg-zinc-950 shadow-2xl overflow-hidden flex flex-col">
            <div className="menu-bg absolute inset-0 z-0 overflow-hidden">
              <div className="backdrop-layer first absolute inset-0 bg-indigo-600"></div>
              <div className="backdrop-layer second absolute inset-0 bg-indigo-900"></div>
              <div className="backdrop-layer absolute inset-0 bg-zinc-950"></div>

              {/* Abstract shapes container */}
              <div className="ambient-background-shapes absolute inset-0 overflow-hidden pointer-events-none">
                {/* Shape 1: Floating circles */}
                <svg className="bg-shape bg-shape-1 absolute inset-0 w-full h-full opacity-0 [&.active]:opacity-100 transition-opacity duration-500" viewBox="0 0 400 400" fill="none" preserveAspectRatio="xMidYMid slice">
                  <circle className="shape-element origin-center" cx="80" cy="120" r="40" fill="rgba(99,102,241,0.15)" />
                  <circle className="shape-element origin-center" cx="300" cy="80" r="60" fill="rgba(139,92,246,0.12)" />
                  <circle className="shape-element origin-center" cx="200" cy="300" r="80" fill="rgba(236,72,153,0.1)" />
                  <circle className="shape-element origin-center" cx="350" cy="280" r="30" fill="rgba(99,102,241,0.15)" />
                </svg>

                {/* Shape 2: Wave pattern */}
                <svg className="bg-shape bg-shape-2 absolute inset-0 w-full h-full opacity-0 [&.active]:opacity-100 transition-opacity duration-500" viewBox="0 0 400 400" fill="none" preserveAspectRatio="xMidYMid slice">
                  <path className="shape-element origin-center" d="M0 200 Q100 100, 200 200 T 400 200" stroke="rgba(99,102,241,0.2)" strokeWidth="60" fill="none" />
                  <path className="shape-element origin-center" d="M0 280 Q100 180, 200 280 T 400 280" stroke="rgba(139,92,246,0.15)" strokeWidth="40" fill="none" />
                </svg>

                {/* Shape 3: Grid dots */}
                <svg className="bg-shape bg-shape-3 absolute inset-0 w-full h-full opacity-0 [&.active]:opacity-100 transition-opacity duration-500" viewBox="0 0 400 400" fill="none" preserveAspectRatio="xMidYMid slice">
                  <circle className="shape-element origin-center" cx="50" cy="50" r="8" fill="rgba(99,102,241,0.3)" />
                  <circle className="shape-element origin-center" cx="150" cy="50" r="8" fill="rgba(139,92,246,0.3)" />
                  <circle className="shape-element origin-center" cx="250" cy="50" r="8" fill="rgba(236,72,153,0.3)" />
                  <circle className="shape-element origin-center" cx="350" cy="50" r="8" fill="rgba(99,102,241,0.3)" />
                  <circle className="shape-element origin-center" cx="100" cy="150" r="12" fill="rgba(139,92,246,0.25)" />
                  <circle className="shape-element origin-center" cx="200" cy="150" r="12" fill="rgba(236,72,153,0.25)" />
                  <circle className="shape-element origin-center" cx="300" cy="150" r="12" fill="rgba(99,102,241,0.25)" />
                  <circle className="shape-element origin-center" cx="50" cy="250" r="10" fill="rgba(236,72,153,0.3)" />
                  <circle className="shape-element origin-center" cx="150" cy="250" r="10" fill="rgba(99,102,241,0.3)" />
                  <circle className="shape-element origin-center" cx="250" cy="250" r="10" fill="rgba(139,92,246,0.3)" />
                  <circle className="shape-element origin-center" cx="350" cy="250" r="10" fill="rgba(236,72,153,0.3)" />
                  <circle className="shape-element origin-center" cx="100" cy="350" r="6" fill="rgba(99,102,241,0.3)" />
                  <circle className="shape-element origin-center" cx="200" cy="350" r="6" fill="rgba(139,92,246,0.3)" />
                  <circle className="shape-element origin-center" cx="300" cy="350" r="6" fill="rgba(236,72,153,0.3)" />
                </svg>

                {/* Shape 4: Organic blobs */}
                <svg className="bg-shape bg-shape-4 absolute inset-0 w-full h-full opacity-0 [&.active]:opacity-100 transition-opacity duration-500" viewBox="0 0 400 400" fill="none" preserveAspectRatio="xMidYMid slice">
                  <path className="shape-element origin-center" d="M100 100 Q150 50, 200 100 Q250 150, 200 200 Q150 250, 100 200 Q50 150, 100 100" fill="rgba(99,102,241,0.12)" />
                  <path className="shape-element origin-center" d="M250 200 Q300 150, 350 200 Q400 250, 350 300 Q400 250, 350 300 Q300 350, 250 300 Q200 250, 250 200" fill="rgba(236,72,153,0.1)" />
                </svg>

                {/* Shape 5: Diagonal lines */}
                <svg className="bg-shape bg-shape-5 absolute inset-0 w-full h-full opacity-0 [&.active]:opacity-100 transition-opacity duration-500" viewBox="0 0 400 400" fill="none" preserveAspectRatio="xMidYMid slice">
                  <line className="shape-element origin-center" x1="0" y1="100" x2="300" y2="400" stroke="rgba(99,102,241,0.15)" strokeWidth="30" />
                  <line className="shape-element origin-center" x1="100" y1="0" x2="400" y2="300" stroke="rgba(139,92,246,0.12)" strokeWidth="25" />
                  <line className="shape-element origin-center" x1="200" y1="0" x2="400" y2="200" stroke="rgba(236,72,153,0.1)" strokeWidth="20" />
                </svg>
              </div>
            </div>

            <div className="menu-content-wrapper relative z-10 flex flex-col justify-center h-full px-12 md:px-24">
              <ul className="menu-list flex flex-col gap-4 md:gap-8">
                <li className="menu-list-item group" data-shape="1">
                  <div className="overflow-hidden py-2">
                    <a href="#" className="nav-link block w-inline-block">
                      <p className="nav-link-text text-5xl md:text-7xl font-bold text-white group-hover:text-indigo-400 transition-colors duration-300">About us</p>
                    </a>
                  </div>
                </li>
                <li className="menu-list-item group" data-shape="2">
                  <div className="overflow-hidden py-2">
                    <a href="#" className="nav-link block w-inline-block">
                      <p className="nav-link-text text-5xl md:text-7xl font-bold text-white group-hover:text-indigo-400 transition-colors duration-300">Our work</p>
                    </a>
                  </div>
                </li>
                <li className="menu-list-item group" data-shape="3">
                  <div className="overflow-hidden py-2">
                    <a href="#" className="nav-link block w-inline-block">
                      <p className="nav-link-text text-5xl md:text-7xl font-bold text-white group-hover:text-indigo-400 transition-colors duration-300">Services</p>
                    </a>
                  </div>
                </li>
                <li className="menu-list-item group" data-shape="4">
                  <div className="overflow-hidden py-2">
                    <a href="#" className="nav-link block w-inline-block">
                      <p className="nav-link-text text-5xl md:text-7xl font-bold text-white group-hover:text-indigo-400 transition-colors duration-300" data-menu-fade>Blog</p>
                    </a>
                  </div>
                </li>
                <li className="menu-list-item group" data-shape="5">
                  <div className="overflow-hidden py-2">
                    <a href="#" className="nav-link block w-inline-block">
                      <p className="nav-link-text text-5xl md:text-7xl font-bold text-white group-hover:text-indigo-400 transition-colors duration-300">Contact us</p>
                    </a>
                  </div>
                </li>
              </ul>
            </div>
          </nav>
        </div>
      </section>
    </div>
  );
}
