import { Play, Film, ImageIcon } from "lucide-react";

type Tab = "youtube" | "instagram" | "image";

interface BottomTabsProps {
  active: Tab;
  onChange: (tab: Tab) => void;
}

const tabs = [
  { id: "youtube" as Tab, label: "YouTube", icon: Play, color: "text-youtube" },
  { id: "instagram" as Tab, label: "Instagram", icon: Film, color: "text-instagram" },
  { id: "image" as Tab, label: "Image", icon: ImageIcon, color: "text-image-blue" },
];

const BottomTabs = ({ active, onChange }: BottomTabsProps) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {tabs.map((tab) => {
          const isActive = active === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`flex flex-col items-center gap-1 py-3 px-5 transition-all duration-200 relative active:scale-95 ${
                isActive ? tab.color : "text-muted-foreground"
              }`}
            >
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-current" />
              )}
              <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
              <span className={`text-[11px] ${isActive ? "font-semibold" : "font-medium"}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
      {/* Safe area padding for mobile */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
};

export default BottomTabs;