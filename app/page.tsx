import { HowItWorks } from "@/components/landing/HowItWorks";
import { LandingHero } from "@/components/landing/LandingHero";

export default function Landing() {
  return (
    <div className="flex flex-col">
      <LandingHero />
      <HowItWorks />
    </div>
  );
}
