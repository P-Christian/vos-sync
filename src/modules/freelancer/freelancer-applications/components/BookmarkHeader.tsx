import React from "react";
import { Bookmark } from "lucide-react";

export const BookmarkHeader: React.FC = () => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-xl">
            <Bookmark className="h-6 w-6 text-primary" />
          </div>
          Saved Jobs
        </h1>
        <p className="text-sm text-muted-foreground mt-1 ml-[52px]">
          View and manage the job postings you have bookmarked.
        </p>
      </div>
    </div>
  );
};
