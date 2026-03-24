import React from 'react';

const glimpses = [
  {
    title: "Planning Visuel & Intuitif",
    description: "Gérez vos équipes en quelques clics. Visualisez instantanément les besoins en personnel, les disponibilités et les demandes de congés sur un calendrier interactif.",
    image: "/Users/arnaudriche/.gemini/antigravity/brain/c7dd4584-0001-4624-8a41-43d1122c7469/app_planning_1774358173165.png"
  },
  {
    title: "Audit Constant : IA & Légal",
    description: "Planify veille sur vous. Notre assistant IA analyse vos plannings pour garantir le respect du Code du travail et de la convention HCR (temps de repos, heures max, etc.).",
    image: "/Users/arnaudriche/.gemini/antigravity/brain/c7dd4584-0001-4624-8a41-43d1122c7469/app_assistant_1774358197924.png"
  },
  {
    title: "Pré-paie Automatisée",
    description: "Finies les erreurs de calcul. Les majorations de nuit, de dimanche et les heures supplémentaires sont calculées automatiquement pour une paie sans stress.",
    image: "/Users/arnaudriche/.gemini/antigravity/brain/c7dd4584-0001-4624-8a41-43d1122c7469/app_prepaie_1774358217533.png"
  }
];

const AppGlimpse = () => {
  return (
    <section id="preview" className="site-section">
      <div style={{ textAlign: 'center', marginBottom: '6rem' }}>
        <h2 className="hero-title" style={{ fontSize: '2.5rem' }}>L'outil que vos managers <br/><span className="hero-gradient-text">vont adorer</span></h2>
        <p className="hero-subtitle">Une interface pensée par et pour des restaurateurs.</p>
      </div>
      <div className="app-glimpse-container">
        {glimpses.map((item, index) => (
          <div key={index} className="glimpse-item animate-fade-up" style={{ animationDelay: `${0.2 * index}s` }}>
            <div className="glimpse-content">
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </div>
            <div className="glimpse-image-wrapper">
              <img src={item.image} alt={item.title} className="glimpse-image" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default AppGlimpse;
