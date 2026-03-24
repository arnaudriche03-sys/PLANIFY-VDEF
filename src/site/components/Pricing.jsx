import React from 'react';
import { Check } from 'lucide-react';

const plans = [
  {
    name: "Starter",
    price: "49",
    description: "L'essentiel pour un petit établissement.",
    features: [
      "1 Restaurant",
      "Jusqu'à 10 salariés",
      "Planning Intelligent",
      "Gestion d'équipe (HCR)",
      "Support par email"
    ]
  },
  {
    name: "Pro",
    price: "99",
    description: "Pour les restaurants en pleine croissance.",
    popular: true,
    features: [
      "Jusqu'à 3 Restaurants",
      "Jusqu'à 30 salariés",
      "Assistant IA (Audit Légal)",
      "Pré-paie automatisée",
      "Support Prioritaire"
    ]
  },
  {
    name: "Enterprise",
    price: "Sur mesure",
    description: "Solutions pour groupes et franchises.",
    features: [
      "Multi-établissements illimités",
      "Salariés illimités",
      "Analyses financières avancées",
      "API & Intégrations",
      "Account Manager dédié"
    ]
  }
];

const Pricing = () => {
  return (
    <section id="pricing" className="site-section">
      <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
        <h2 className="hero-title" style={{ fontSize: '2.5rem' }}>Des formules adaptées <br/><span className="hero-gradient-text">à votre taille</span></h2>
        <p className="hero-subtitle">Choisissez le plan qui correspond à vos besoins actuels.</p>
      </div>
      <div className="pricing-grid">
        {plans.map((plan, index) => (
          <div key={index} className={`pricing-card ${plan.popular ? 'popular' : ''}`}>
            {plan.popular && <div className="pricing-badge">Plus populaire</div>}
            <div className="pricing-tier">{plan.name}</div>
            <div className="pricing-price">
              {plan.price !== "Sur mesure" ? (
                <>€{plan.price}<span>/mois</span></>
              ) : (
                plan.price
              )}
            </div>
            <p style={{ color: 'var(--site-text-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>{plan.description}</p>
            <ul className="pricing-features">
              {plan.features.map((feature, fIndex) => (
                <li key={fIndex} className="pricing-feature">
                  <Check size={18} />
                  {feature}
                </li>
              ))}
            </ul>
            <button className={`btn ${plan.popular ? 'btn-primary' : 'btn-secondary'}`} style={{ width: '100%', justifyContent: 'center' }}>
              Choisir ce plan
            </button>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Pricing;
