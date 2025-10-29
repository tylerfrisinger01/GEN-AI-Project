import { BrowserRouter as Router, Routes, Route, NavLink } from "react-router-dom";
import "./App.css";
import Home from "./pages/home";
import Pantry from "./pages/pantry";
import Search from "./pages/search";

function Header() {
  return (
    <header className="tm-header">
      <div className="tm-header-inner">
        <div className="tm-brand">Insert project name</div>
        <nav className="tm-nav">
          <NavLink to="/" end className="tm-tab">Home</NavLink>
          <NavLink to="/pantry" className="tm-tab">Your pantry</NavLink>
          <NavLink to="/search" className="tm-tab">Search</NavLink>
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
        </Routes>
      </div>
    </Router>
  );
}
