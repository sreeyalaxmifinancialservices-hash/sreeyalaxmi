import "./styles.css";
import Navbar from "./components/Navbar.jsx";
import Hero from "./components/Hero.jsx";
import Welcome from "./components/Welcome.jsx";
import About from "./components/About.jsx";
import Company from "./components/Company.jsx";
import Services from "./components/Services.jsx";
import WhyChoose from "./components/WhyChoose.jsx";
import Tagline from "./components/Tagline.jsx";
import Contact from "./components/Contact.jsx";
import Footer from "./components/Footer.jsx";

export default function LandingPage() {
  return (
    <main>
      <Navbar />
      <Hero />
      <Welcome />
      <About />
      <Company />
      <Services />
      <WhyChoose />
      <Tagline />
      <Contact />
      <Footer />
    </main>
  );
}
