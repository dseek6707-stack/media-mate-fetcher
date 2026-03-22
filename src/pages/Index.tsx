import { useState } from "react";
import Header from "@/components/Header";
import FeatureTabs, { type FeatureTab } from "@/components/FeatureTabs";
import UniversalDownloader from "@/components/UniversalDownloader";

const Index = () => {
  const [activeTab, setActiveTab] = useState<FeatureTab>("ig-reels");

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <FeatureTabs active={activeTab} onChange={setActiveTab} />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <UniversalDownloader key={activeTab} activeTab={activeTab} />
      </main>
    </div>
  );
};

export default Index;
