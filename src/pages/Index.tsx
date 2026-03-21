import { useState } from "react";
import BottomTabs from "@/components/BottomTabs";
import YouTubeDownloader from "@/components/YouTubeDownloader";
import InstagramDownloader from "@/components/InstagramDownloader";
import ImageDownloader from "@/components/ImageDownloader";

type Tab = "youtube" | "instagram" | "image";

const Index = () => {
  const [activeTab, setActiveTab] = useState<Tab>("youtube");

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-4 pb-24 pt-6">
        {activeTab === "youtube" && <YouTubeDownloader />}
        {activeTab === "instagram" && <InstagramDownloader />}
        {activeTab === "image" && <ImageDownloader />}
      </div>
      <BottomTabs active={activeTab} onChange={setActiveTab} />
    </div>
  );
};

export default Index;