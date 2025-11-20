import { BrowserRouter as Router, Routes, Route, NavLink } from "react-router-dom";
import "./css/App.css";
import Home from "./pages/home";
import Pantry from "./pages/pantry";
import Search from "./pages/search";
import Identify from "./pages/identify";
import Favorites from "./pages/favorites";

function Header() {
  return (
    <header className="tm-header">
      <div className="tm-header-inner">
        <div className="tm-brand">PantryPilot</div>
        <nav className="tm-nav">
          <NavLink to="/" end className="tm-tab">Home</NavLink>
          <NavLink to="/pantry" className="tm-tab">Your pantry</NavLink>
          <NavLink to="/search" className="tm-tab">Search</NavLink>
          <NavLink to="/identify" className="tm-tab">Identify</NavLink>
          <NavLink to="/favorites" className="tm-tab">Favorites</NavLink>
        </nav>
      </div>
    </header>
  );
}

export default function App() {
  return (
    <Router>
      <div className="tm-app">
        <Header />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/pantry" element={<Pantry />} />
          <Route path="/search" element={<Search />} />
          <Route path="/identify" element={<Identify />} />
          <Route path="/favorites" element={<Favorites />} />
        </Routes>
      </div>
    </Router>
  );
}
