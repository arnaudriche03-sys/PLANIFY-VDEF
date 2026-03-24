import React from 'react';
import { Calendar, Users, Calculator, BrainCircuit, Gavel } from 'lucide-react';

const features = [
  {
    icon: <Calendar size={24} />,
    title: "Planning Intelligent",
    description: "Générez des plannings optimisés en un clic, en tenant compte des flux de clients et des budgets."
  },
  {
    icon: <Users size={24} />,
    title: "Gestion d'Équipe (HCR)",
    description: "Centralisez les dossiers, contrats et absences. Gestion native des spécificités HCR."
  },
  {
    icon: <Gavel size={24} />,
    title: "Conformité Légale",
    description: "Respectez le Code du Travail français. Planify alerte sur les repos minimaux et les durées max."
  },
  {
    icon: <Calculator size={24} />,
    title: "Pré-paie de Précision",
    description: "Calcul automatique des majorations de nuit, dimanche et des heures supplémentaires."
  },
  {
    icon: <BrainCircuit size={24} />,
    title: "IA Décisionnelle",
    description: "L'IA analyse vos KPIs, vos finances et pilote les exceptions pour vous aider à rester rentable."
  }
];

const Features = () => {
  return (
    <section id="features" className="site-section">
      <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
        <h2 className="hero-title" style={{ fontSize: '2.5rem' }}>Une solution <br/><span className="hero-gradient-text">complète et sereine</span></h2>
        <p className="hero-subtitle">Concentrez-vous sur votre cuisine, on s'occupe de l'administratif.</p>
      </div>
      <div className="features-grid">
        {features.map((feature, index) => (
          <div key={index} className="feature-card animate-fade-up" style={{ animationDelay: `${0.1 * index}s` }}>
            <div className="feature-icon">{feature.icon}</div>
            <h3 className="feature-title">{feature.title}</h3>
            <p className="feature-desc">{feature.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Features;
