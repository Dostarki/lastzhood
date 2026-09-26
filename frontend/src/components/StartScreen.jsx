import { Button } from './ui/button';
import './StartScreen.css';

export const StartScreen = ({ onStart }) => <section className="start-screen" data-testid="start-screen" style={{'--start-image':"url('/images/deadzone-bosses-desktop.jpg')",'--start-image-mobile':"url('/images/deadzone-bosses-mobile.jpg')"}}>
  <picture className="start-banner" data-testid="start-banner">
    <source media="(max-width: 767px)" srcSet="/images/deadzone-bosses-mobile.jpg" />
    <img src="/images/deadzone-bosses-desktop.jpg" alt="Westfall kasabasındaki hayatta kalanlar ve dört dev boss" fetchPriority="high" data-testid="start-banner-image" />
  </picture>
  <header className="start-title"><span data-testid="start-world-name">WESTFALL</span><h1 data-testid="start-game-title">DEADZONE</h1></header>
  <Button className="intro-start-button" data-testid="start-game-button" onClick={onStart}>START GAME</Button>
</section>;