import { Download } from "lucide-react";

const Header = () => {
  return (
    <header className="bg-card border-b border-border sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Download className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-display font-bold text-lg tracking-tight">
            <span className="text-primary">Media</span>
            <span className="text-foreground">Save</span>
          </span>
        </div>
        <p className="text-xs text-muted-foreground hidden sm:block">
          Download videos, reels, photos & more
        </p>
      </div>
    </header>
  );
};

export default Header;
