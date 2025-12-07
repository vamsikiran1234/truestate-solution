import { useState } from 'react';
import '../styles/Sidebar.css';

function Sidebar() {
  const [activeItem, setActiveItem] = useState('proforma-invoices');
  const [expandedSections, setExpandedSections] = useState({
    services: true,
    invoices: true
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleNavClick = (itemId) => {
    setActiveItem(itemId);
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="logo-icon">V</div>
          <div className="logo-text">
            <span className="logo-title">Vault</span>
            <span className="logo-subtitle">Anurag Yadav</span>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <a 
          href="#" 
          className={`nav-item ${activeItem === 'dashboard' ? 'active' : ''}`}
          onClick={(e) => { e.preventDefault(); handleNavClick('dashboard'); }}
        >
          <span className="nav-icon">📊</span>
          <span>Dashboard</span>
        </a>
        <a 
          href="#" 
          className={`nav-item ${activeItem === 'nexus' ? 'active' : ''}`}
          onClick={(e) => { e.preventDefault(); handleNavClick('nexus'); }}
        >
          <span className="nav-icon">🔗</span>
          <span>Nexus</span>
        </a>
        <a 
          href="#" 
          className={`nav-item ${activeItem === 'intake' ? 'active' : ''}`}
          onClick={(e) => { e.preventDefault(); handleNavClick('intake'); }}
        >
          <span className="nav-icon">📥</span>
          <span>Intake</span>
        </a>

        <div className="nav-section">
          <div 
            className="nav-section-header"
            onClick={() => toggleSection('services')}
          >
            <span className="nav-icon">⚙️</span>
            <span>Services</span>
            <span className={`nav-arrow ${expandedSections.services ? 'expanded' : ''}`}>▼</span>
          </div>
          {expandedSections.services && (
            <div className="nav-section-items">
              <a 
                href="#" 
                className={`nav-item sub-item ${activeItem === 'pre-active' ? 'active' : ''}`}
                onClick={(e) => { e.preventDefault(); handleNavClick('pre-active'); }}
              >
                <span className="nav-icon">○</span>
                <span>Pre-active</span>
              </a>
              <a 
                href="#" 
                className={`nav-item sub-item ${activeItem === 'active-services' ? 'active' : ''}`}
                onClick={(e) => { e.preventDefault(); handleNavClick('active-services'); }}
              >
                <span className="nav-icon">○</span>
                <span>Active</span>
              </a>
              <a 
                href="#" 
                className={`nav-item sub-item ${activeItem === 'blocked' ? 'active' : ''}`}
                onClick={(e) => { e.preventDefault(); handleNavClick('blocked'); }}
              >
                <span className="nav-icon">○</span>
                <span>Blocked</span>
              </a>
              <a 
                href="#" 
                className={`nav-item sub-item ${activeItem === 'closed' ? 'active' : ''}`}
                onClick={(e) => { e.preventDefault(); handleNavClick('closed'); }}
              >
                <span className="nav-icon">○</span>
                <span>Closed</span>
              </a>
            </div>
          )}
        </div>

        <div className="nav-section">
          <div 
            className="nav-section-header"
            onClick={() => toggleSection('invoices')}
          >
            <span className="nav-icon">📄</span>
            <span>Invoices</span>
            <span className={`nav-arrow ${expandedSections.invoices ? 'expanded' : ''}`}>▼</span>
          </div>
          {expandedSections.invoices && (
            <div className="nav-section-items">
              <a 
                href="#" 
                className={`nav-item sub-item ${activeItem === 'proforma-invoices' ? 'active' : ''}`}
                onClick={(e) => { e.preventDefault(); handleNavClick('proforma-invoices'); }}
              >
                <span className="nav-icon">○</span>
                <span>Proforma Invoices</span>
              </a>
              <a 
                href="#" 
                className={`nav-item sub-item ${activeItem === 'final-invoices' ? 'active' : ''}`}
                onClick={(e) => { e.preventDefault(); handleNavClick('final-invoices'); }}
              >
                <span className="nav-icon">○</span>
                <span>Final Invoices</span>
              </a>
            </div>
          )}
        </div>
      </nav>
    </aside>
  );
}

export default Sidebar;
