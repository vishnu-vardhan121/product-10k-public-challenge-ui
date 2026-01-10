"use client";
import React from "react";
import Link from "next/link";
import Image from "next/image";
import { FaPhone, FaEnvelope, FaMapMarkerAlt } from "react-icons/fa";
import { IoLogoLinkedin } from "react-icons/io5";
import { FaInstagram, FaYoutube, FaFacebook } from "react-icons/fa";

const Footer = () => {
  const quickLinks = [
    { text: 'About us', link: 'https://www.10000coders.in/about' },
    { text: 'Privacy Policy', link: 'https://www.10000coders.in/privacy_policy' },
    { text: 'Terms and Conditions', link: 'https://www.10000coders.in/terms_and_conditions' },
    { text: 'Settings', link: '/settings' },
  ];

  const socialMedia = [
    {
      text: 'Instagram',
      icon: <FaInstagram />,
      link: 'https://www.instagram.com/10000coders/',
    },
    {
      text: 'Youtube',
      icon: <FaYoutube />,
      link: 'https://www.youtube.com/@10000coders',
    },
    {
      text: 'LinkedIn',
      icon: <IoLogoLinkedin size={20} />,
      link: 'https://in.linkedin.com/company/10000-coders',
    },
    {
      text: 'Facebook',
      icon: <FaFacebook />,
      link: 'https://www.facebook.com/10000coders',
    },
  ];

  const reachUs = [
    { text: '6305693431', icon: <FaPhone />, type: 'tel', location: 'Hyderabad' },
    { text: '9515318212', icon: <FaPhone />, type: 'tel', location: 'Bangalore' },
    { text: 'rakesh@10000coders.co', icon: <FaEnvelope />, type: 'mailto' },
  ];

  const addresses = [
    {
      location: 'Hyderabad',
      address: 'Metro station, MIG 214, Road 1, Behind KPHB, Kukatpally Housing Board Colony, Kukatpally, Hyderabad, Telangana 500072',
      mapLink: 'https://www.google.com/maps?q=17.49329,78.40213'
    },
    {
      location: 'Bangalore',
      address: '937, Cn Reddy Plaza Outer Ring Rd, Munnekolahu, Manjunatha Layout, Marathahalli Village, Marathahalli, Bengaluru, Karnataka 560037',
      mapLink: 'https://www.google.com/maps/place/10000Coders+%E2%80%93+Data+Science+%26+Fullstack+With+AI+Training/@12.9555492,77.7004924,17z'
    }
  ];

  return (
    <footer className="w-full bg-[#071326] text-gray-400 py-12 md:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-6 lg:gap-8">
          {/* Logo and Reach Us */}
          <div className="flex flex-col gap-6">
            <div className="h-12 w-auto">
              <Image
                src="/logos/10k_logo_white.webp"
                alt="10kCoders Logo"
                width={150}
                height={50}
                className="h-12 w-auto"
              />
            </div>
            <div>
              <p className="text-white font-bold text-lg mb-4">Reach Us</p>
              <div className="flex flex-col gap-3">
                {reachUs.map(({ text, icon, type, location }, idx) => (
                  <div key={text + '_' + idx} className="flex items-center gap-3">
                    <div className="text-orange-500 text-sm flex-shrink-0">
                      {icon}
                    </div>
                    {type === 'tel' || type === 'mailto' ? (
                      <a
                        href={`${type}:${text}`}
                        className="text-blue-400 hover:text-blue-300 text-sm break-all"
                      >
                        {text}{location ? ` (${location})` : ''}
                      </a>
                    ) : (
                      <p className="text-sm">{text}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <p className="text-white font-bold text-lg mb-4">Quick Links</p>
            <div className="flex flex-col gap-2">
              {quickLinks.map(({ text, link }, idx) => (
                <Link
                  key={text + '_' + idx}
                  href={link}
                  className="text-sm hover:text-orange-500 transition-colors"
                >
                  {text}
                </Link>
              ))}
            </div>
          </div>

          {/* Social Media */}
          <div>
            <p className="text-white font-bold text-lg mb-4">Social Media</p>
            <div className="flex flex-col gap-3">
              {socialMedia.map(({ text, icon, link }, idx) => (
                <Link
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  key={text + '_' + idx}
                  className="flex items-center gap-3 text-sm hover:text-orange-500 transition-colors"
                >
                  <div className="text-orange-500 text-lg flex-shrink-0">
                    {icon}
                  </div>
                  <span>{text}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Our Offices */}
          <div>
            <p className="text-white font-bold text-lg mb-4">Our Offices</p>
            <div className="flex flex-col gap-4">
              {addresses.map(({ location, address, mapLink }, idx) => (
                <a
                  key={location + '_' + idx}
                  href={mapLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 hover:text-orange-500 transition-colors"
                >
                  <div className="text-orange-500 text-sm mt-1 flex-shrink-0">
                    <FaMapMarkerAlt />
                  </div>
                  <div>
                    <p className="font-semibold text-sm mb-1 text-white">{location}</p>
                    <p className="text-xs leading-relaxed">{address}</p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-gray-700 mt-8 pt-8 text-center text-sm">
          <p className="text-gray-500">
            © {new Date().getFullYear()} 10000Coders. All rights reserved.
          </p>
          <p className="text-gray-600 mt-2">
            Public Challenge Platform
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

