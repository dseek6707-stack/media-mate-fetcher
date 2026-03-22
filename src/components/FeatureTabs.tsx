import { Film, ImageIcon, Play, User, BookOpen, Clock, Video, Camera } from "lucide-react";
import { cn } from "@/lib/utils";

export type FeatureTab =
  | "ig-video"
  | "ig-reels"
  | "ig-photo"
  | "ig-dp"
  | "ig-stories"
  | "ig-highlights"
  | "youtube"
  | "image";

interface FeatureTabsProps {
  active: FeatureTab;
  onChange: (tab: FeatureTab) => void;
}

const tabs: { id: FeatureTab; label: string; icon: React.ElementType; group: "instagram" | "other" }[] = [
  { id: "ig-video", label: "Video", icon: Video, group: "instagram" },
  { id: "ig-reels", label: "Reels", icon: Film, group: "instagram" },
  { id: "ig-photo", label: "Photo", icon: Camera, group: "instagram" },
  { id: "ig-dp", label: "DP", icon: User, group: "instagram" },
  { id: "ig-stories", label: "Stories", icon: BookOpen, group: "instagram" },
  { id: "ig-highlights", label: "Highlights", icon: Clock, group: "instagram" },
  { id: "youtube", label: "YouTube", icon: Play, group: "other" },
  { id: "image", label: "Image", icon: ImageIcon, group: "other" },
];

const FeatureTabs = ({ active, onChange }: FeatureTabsProps) => {
  return (
    <div className="bg-card border-b border-border">
      <div className="max-w-5xl mx-auto">
        <div className="flex overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => {
            const isActive = active === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => onChange(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap transition-all duration-200 relative shrink-0 active:scale-[0.97]",
                  "hover:text-foreground",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
              >
                <Icon className="w-4 h-4" strokeWidth={isActive ? 2.5 : 2} />
                <span>{tab.label}</span>
                {isActive && (
                  <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default FeatureTabs;
