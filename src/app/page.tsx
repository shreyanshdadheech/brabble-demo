import LandingPage from "./landing/page";
import * as dotenv from "dotenv";
dotenv.config();

export default function Home() {
  return (
    <div className="h-[500px] w-full">
      <LandingPage></LandingPage>
    </div>
  );
}
