import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "../config";
import { useNavigate, Link } from "react-router-dom";
import "../styles/register.css";

function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: ""
  });
  
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    // Trigger animation after component mounts
    setShowContent(true);
  }, []);

  const handleChange = (e) => {
    setForm({...form, [e.target.name]: e.target.value});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/register`, form);
      alert("Registered successfully!");
      navigate("/");
    } catch (error) {
      alert(error.response?.data?.message || "Registration failed");
    }
  };

  return (
    <div className="register-container">
      <div className="register-grid">
        {/* Left side - Brand with animations */}
        <div className={`brand-section ${showContent ? 'slide-in-left' : ''}`}>
          <div className="brand-content">
            <h1 className="brand-title">
              <span className="letter-animation">P</span>
              <span className="letter-animation">R</span>
              <span className="letter-animation">U</span>
              <span className="letter-animation">L</span>
              <span className="letter-animation">I</span>
              <span className="letter-animation">F</span>
              <span className="letter-animation">E</span>
              <span className="letter-animation space"> </span>
              <span className="letter-animation">U</span>
              <span className="letter-animation">K</span>
            </h1>
            <p className="brand-tagline fade-in-delay">Join our community</p>
            <div className="floating-dots">
              <div className="dot dot-1"></div>
              <div className="dot dot-2"></div>
              <div className="dot dot-3"></div>
            </div>
          </div>
        </div>
        
        {/* Right side - Register Form with animations */}
        <div className={`form-section ${showContent ? 'slide-in-right' : ''}`}>
          <div className="form-wrapper">
            <div className="form-header">
              <h2 className="header-animation">Create account</h2>
              <p className="subheader-animation">Get started</p>
            </div>
            
            <form onSubmit={handleSubmit} className="register-form">
              <div className="field field-animation" style={{animationDelay: '0.1s'}}>
                <input
                  type="text"
                  name="name"
                  placeholder="Full name"
                  value={form.name}
                  onChange={handleChange}
                  className="input-field"
                  required
                />
                <div className="input-border"></div>
              </div>
              
              <div className="field field-animation" style={{animationDelay: '0.2s'}}>
                <input
                  type="email"
                  name="email"
                  placeholder="Email address"
                  value={form.email}
                  onChange={handleChange}
                  className="input-field"
                  required
                />
                <div className="input-border"></div>
              </div>
              
              <div className="field field-animation" style={{animationDelay: '0.3s'}}>
                <input
                  type="password"
                  name="password"
                  placeholder="Password"
                  value={form.password}
                  onChange={handleChange}
                  className="input-field"
                  required
                />
                <div className="input-border"></div>
              </div>
              
              <button type="submit" className="btn-primary" style={{animationDelay: '0.4s'}}>
                Create account
              </button>
              
              <p className="login-text">
                Already have an account?{' '}
                <Link to="/" className="login-link">
                  Sign in
                </Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;