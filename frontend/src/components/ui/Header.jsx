import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation,useNavigate} from 'react-router-dom';
import Icon from '../AppIcon';
import Button from './Button';
import { useAuth } from '../../context/authContext.jsx';
import { toggleTheme } from '../../utils/theme';


const Header = () => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isStrategicOpen, setIsStrategicOpen] = useState(false);
  const [isMobileStrategicOpen, setIsMobileStrategicOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      return document?.documentElement?.classList?.contains('dark');
    } catch {
      return false;
    }
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const strategicRef = useRef(null)
  const { user, initialLoading, logout } = useAuth();

  
  const searchRef = useRef(null);
  const notificationRef = useRef(null);
  const profileRef = useRef(null);

const navigationItems = [
   { label: 'SWOT Analysis', path: '/swot-analysis-tool', icon: 'Grid' },
   { label: "Porter's Five Forces", path: '/porter-s-five-forces-analysis', icon: 'Pentagon' },
   { label: 'Business Plan Generator', path: '/business-plan-generator', icon: 'FileText' }
]



  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef?.current && !searchRef?.current?.contains(event?.target)) {
        setIsSearchOpen(false);
      }
      if (notificationRef?.current && !notificationRef?.current?.contains(event?.target)) {
        setIsNotificationOpen(false);
      }
      if (profileRef?.current && !profileRef?.current?.contains(event?.target)) {
        setIsProfileOpen(false);
      }
      if (strategicRef?.current && !strategicRef?.current?.contains(event?.target)) {
        setIsStrategicOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const onStorage = (e) => {
      if (e?.key !== 'sgp-theme') return;
      try {
        setIsDarkMode(document.documentElement.classList.contains('dark'));
      } catch {
        // ignore
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  

  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    console.log('Search query:', searchQuery);
    setIsSearchOpen(false);
  };

  const handleNotificationClick = (notification) => {
    console.log('Notification clicked:', notification);
    setIsNotificationOpen(false);
  };

  // Update the isActiveRoute function
  const isActiveRoute = (path) => {
    // Check if current path is one of the strategic analysis paths
    const strategicPaths = [
      '/swot-analysis-tool',
      '/porter-s-five-forces-analysis',
      '/business-plan-generator'
    ];
    
    if (path === 'strategic') {
      return strategicPaths.includes(location?.pathname);
    }
    
    return location?.pathname === path;
  };


  

  const renderDesktopNav = () => (
  <nav className="hidden lg:flex items-center space-x-8">
    {navigationItems?.map((item) => (
      item.hasSubmenu ? (
        <div key={item.label} className="relative" ref={strategicRef}>
          <button
            onClick={() => setIsStrategicOpen(!isStrategicOpen)}
            className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-smooth ${
              isActiveRoute('strategic') || isStrategicOpen 
                ? 'text-primary bg-primary/10' 
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <Icon name={item.icon} size={16} />
            <span>{item.label}</span>
            <Icon name={isStrategicOpen ? "ChevronUp" : "ChevronDown"} size={16} />
          </button>
          
          {isStrategicOpen && (
            <div className="absolute top-full left-0 mt-2 w-56 bg-popover border border-border rounded-lg shadow-elevated animate-slide-down">
              {item.submenu.map((subItem) => (
                <Link
                  key={subItem.path}
                  to={subItem.path}
                  onClick={() => setIsStrategicOpen(false)}
                  className={`flex items-center space-x-2 px-4 py-2 text-sm transition-smooth ${
                    location.pathname === subItem.path
                      ? 'text-primary bg-primary/10'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  <Icon name={subItem.icon} size={16} />
                  <span>{subItem.label}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      ) : (
        <Link
          key={item.path}
          to={item.path}
          className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-smooth ${
            isActiveRoute(item.path)
              ? 'text-primary bg-primary/10' 
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          <Icon name={item.icon} size={16} />
          <span>{item.label}</span>
        </Link>
      )
    ))}
  </nav>
);
  const renderMobileMenu = () => (
  <div className="lg:hidden bg-card border-t border-border animate-slide-down">
    <div className="p-4 space-y-2">
      {navigationItems?.map((item) => (
        item.hasSubmenu ? (
          <div key={item.label}>
            <button
              onClick={() => setIsMobileStrategicOpen(!isMobileStrategicOpen)}
              className={`flex items-center justify-between w-full px-3 py-2 rounded-md text-sm font-medium transition-smooth ${
                isActiveRoute('strategic')
                  ? 'text-primary bg-primary/10' 
                  : 'text-muted-foreground'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon name={item.icon} size={16} />
                <span>{item.label}</span>
              </div>
              <Icon name={isMobileStrategicOpen ? "ChevronUp" : "ChevronDown"} size={16} />
            </button>
            
            {isMobileStrategicOpen && (
              <div className="ml-6 mt-2 space-y-2">
                {item.submenu.map((subItem) => (
                  <Link
                    key={subItem.path}
                    to={subItem.path}
                    onClick={() => {
                      setIsMobileStrategicOpen(false);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm transition-smooth ${
                      location.pathname === subItem.path
                        ? 'text-primary bg-primary/10'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    <Icon name={subItem.icon} size={16} />
                    <span>{subItem.label}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        ) : (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-smooth ${
              isActiveRoute(item.path)
                ? 'text-primary bg-primary/10' 
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <Icon name={item.icon} size={16} />
            <span>{item.label}</span>
          </Link>
        )
      ))}
    </div>
  </div>
);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-card border-b border-border shadow-soft">
      <div className="flex items-center justify-between h-16 px-6">
        {/* Logo */}
        <Link to="/" className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-8 h-8 bg-primary rounded-lg">
            <Icon name="TrendingDown" size={20} color="white" />
          </div>
          <span className="text-xl font-semibold text-foreground">StartupGrowth Pro</span>
        </Link>

        {renderDesktopNav()}

        {/* Right Section */}
        <div className="flex items-center space-x-4">

          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              const next = toggleTheme();
              setIsDarkMode(next === 'dark');
            }}
            aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isDarkMode ? 'Light mode' : 'Dark mode'}
          >
            <Icon name={isDarkMode ? 'Sun' : 'Moon'} size={18} />
          </Button>
      
        {/*Signup-Login Button*/}
            {!user && (
                <>
                  {/* Desktop buttons */}
                  <div className="hidden md:flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate('/login')}
                    >
                      Login
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => navigate('/signup')}
                      className="bg-primary text-primary-foreground hover:bg-blue-500"
                    >
                      Sign Up
                    </Button>
                  </div>

                  {/* Mobile single button */}
                  <Button
                    variant="outline"
                    size="icon"
                    className="md:hidden"
                    onClick={() => navigate('/login')}
                  >
                    <Icon name="User" size={18} />
                  </Button>
                </>
              )}



          {/* User Profile */}
          {user &&(
            <div className="relative" ref={profileRef}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center space-x-2"
            >
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <Icon name="User" size={16} color="white" />
              </div>
              <span className="hidden md:block text-sm font-medium">{user.fullname}</span>
              <Icon name="ChevronDown" size={16} />
            </Button>

            {isProfileOpen && (
              <div className="absolute right-0 top-12 w-56 bg-popover border border-border rounded-lg shadow-elevated animate-slide-down">
                <div className="p-4 border-b border-border">
                  <p className="font-medium text-foreground">{user.username}</p>
                </div>
                <div className="p-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => {
                      setIsProfileOpen(false);
                      navigate('/profile-settings');
                    }}
                  >
                    <Icon name="User" size={16} className="mr-2" />
                    Profile Settings
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => {
                      setIsProfileOpen(false);
                      navigate('/help-support');
                    }}
                  >
                    <Icon name="HelpCircle" size={16} className="mr-2" />
                    Help & Support
                  </Button>
                  <div className="border-t border-border my-2" />
                  <Button variant="ghost" size="sm" className="w-full justify-start text-error"
                  onClick={async() =>{
                    setIsAuthenticated(false);
                    setIsProfileOpen(false);
                    await logout();
                    navigate('/');
                  }}>
                    <Icon name="LogOut" size={16} className="mr-2" />
                    Sign Out
                  </Button>
                </div>
              </div>
            )}
          </div>
          )}

          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden"
          >
            <Icon name={isMobileMenuOpen ? "X" : "Menu"} size={20} />
          </Button>
        </div>
      </div>
      {/* Mobile Menu */}
      {isMobileMenuOpen && renderMobileMenu()}
    </header>
  );
};

export default Header;