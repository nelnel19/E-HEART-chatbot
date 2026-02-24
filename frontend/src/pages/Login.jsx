import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "../config";
import { Link, useNavigate } from "react-router-dom"; // Add useNavigate
import "../styles/login.css";

function Login() {
  const [form, setForm] = useState({
    email: "",
    password: ""
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const navigate = useNavigate(); // Initialize navigate

  useEffect(() => {
    // Trigger animation after component mounts
    setShowContent(true);
    
    // Check if user is already logged in
    const token = localStorage.getItem("token");
    if (token) {
      navigate("/chat");
    }
  }, [navigate]);

  const handleChange = (e) => {
    setForm({...form, [e.target.name]: e.target.value});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await axios.post(`${API}/login`, form);
      
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("name", res.data.name);
      
      // Redirect to chat page
      navigate("/chat");
      
    } catch (error) {
      alert(error.response?.data?.message || "Login failed");
      
      // Shake animation for error
      const formElement = e.target;
      formElement.classList.add('shake-animation');
      setTimeout(() => {
        formElement.classList.remove('shake-animation');
      }, 500);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-grid">
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
            <p className="brand-tagline fade-in-delay">ASK ANYTHING ABOUT US</p>
            <div className="floating-dots">
              <div className="dot dot-1"></div>
              <div className="dot dot-2"></div>
              <div className="dot dot-3"></div>
            </div>
          </div>
        </div>
        
        {/* Right side - Login Form with animations */}
        <div className={`form-section ${showContent ? 'slide-in-right' : ''}`}>
          <div className="form-wrapper">
            <div className="form-header">
              <h2 className="header-animation">Welcome Agent</h2>
              <p className="subheader-animation">Sign in to your account</p>
            </div>
            
            <form onSubmit={handleSubmit} className="auth-form">
              <div className="field field-animation" style={{animationDelay: '0.1s'}}>
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
              
              <div className="field field-animation" style={{animationDelay: '0.2s'}}>
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
              
              <div className="forgot-password fade-in" style={{animationDelay: '0.3s'}}>
                <Link to="/forgot-password" className="forgot-link">
                  Forgot password?
                </Link>
              </div>
              
              <button 
                type="submit" 
                className={`btn-primary ${isLoading ? 'btn-loading' : ''}`}
                disabled={isLoading}
                style={{animationDelay: '0.3s'}}
              >
                {isLoading ? (
                  <span className="loader"></span>
                ) : (
                  <span className="btn-text">Sign in</span>
                )}
              </button>
              
              <div className="register-wrapper fade-in" style={{animationDelay: '0.4s'}}>
                <p className="register-text">
                  Don't have an account?{' '}
                  <Link to="/register" className="register-link">
                    Register now
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;