import React from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Features from './components/Features';
import AppGlimpse from './components/AppGlimpse';
import Pricing from './components/Pricing';
import Footer from './components/Footer';
import './site.css';

const LandingPage = ({ onLoginClick }) => {
  return (
    <div className="site-container">
      <div className="site-bg-gradient" />
      <Navbar onLoginClick={onLoginClick} />
      <main>
        <Hero onLoginClick={onLoginClick} />
        <Features />
        <AppGlimpse />
        <Pricing />
      </main>
      <Footer />
    </div>
  );
};

export default LandingPage;
