import React from "react";
import HeroSection from "@/components/home/HeroSection";
import FeaturesSection from "@/components/home/FeaturesSection";
import FeaturedChallenge from "@/components/home/FeaturedChallenge";
import Footer from "@/components/common/Footer";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">
      <HeroSection />
      <div className="relative z-20 -mt-10 mb-20"> {/* Negative margin to overlap Hero slightly for joined effect, or just place it. Let's place it clearly. */}
      </div>
      <FeaturedChallenge />
      <div id="features">
        <FeaturesSection />
      </div>
      <Footer />
    </main>
  );
}
