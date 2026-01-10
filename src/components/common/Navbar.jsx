"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { FaBars, FaTimes } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();



  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  /* Streamlined Navigation */
  const navLinks = [
    // { href: "/", label: "Home" }, // Redundant with Logo
    // { href: "/challenges", label: "Challenges" }, // Covered by CTA
    // { href: "/#about", label: "About" }, // Removed per request
  ];

  const isActive = (href) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname?.startsWith(href.split('#')[0]);
  };

  const handleNavClick = (e, href) => {
    if (href.includes('#')) {
      e.preventDefault();
      const id = href.split('#')[1];
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
        setIsMobileMenuOpen(false);
      }
    }
  };

  // Hide navbar on challenge interface page and registration page
  if (pathname?.includes('/challenges/interface') || pathname?.includes('/challenges/register')) {
    return null;
  }

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled
        ? "bg-white/90 backdrop-blur-md shadow-lg"
        : "bg-white/95 backdrop-blur-sm shadow-md"
        } border-b border-gray-200`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`flex items-center justify-between transition-all duration-300 ${scrolled ? "h-16" : "h-20"
          }`}>
          {/* Logo - Left */}
          <Link href="/" className="flex items-center space-x-3 group">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Image
                src="/logos/10k_logo_black.webp"
                alt="10kCoders Logo"
                width={180}
                height={60}
                className={`w-auto transition-all duration-300 ${scrolled ? "h-10" : "h-14 md:h-16"
                  }`}
                priority
              />
            </motion.div>
            <span className="hidden sm:block text-lg font-semibold text-gray-900 transition-all">
              <span className="bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                Public Challenges
              </span>
            </span>
          </Link>

          {/* Desktop Navigation - Right (Now visible on mobile too for CTA) */}
          <div className="flex items-center space-x-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={(e) => handleNavClick(e, link.href)}
                className={`hidden md:block px-4 py-2 text-sm font-medium rounded-lg transition-all ${isActive(link.href)
                  ? "text-orange-600 bg-orange-50"
                  : "text-gray-700 hover:text-orange-600 hover:bg-gray-50"
                  }`}
              >
                {link.label}
              </Link>
            ))}

            {/* CTA Button */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Link
                href="/challenges"
                className="ml-2 md:ml-4 px-4 md:px-6 py-2 md:py-2.5 bg-gradient-to-r from-orange-600 to-red-600 text-white text-sm md:text-base font-semibold rounded-lg shadow-md hover:shadow-lg transition-all"
              >
                Browse Challenges
              </Link>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.nav>
  );
};

export default Navbar;
