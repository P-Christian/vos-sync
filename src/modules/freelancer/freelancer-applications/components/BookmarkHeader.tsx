import React from "react";

export const BookmarkHeader: React.FC = () => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b pb-4">
      <div>
        <h2 className="text-lg font-bold text-foreground">Saved Jobs</h2>
        <p className="text-xs text-muted-foreground">
          View and manage the job postings you have bookmarked.
        </p>
      </div>
    </div>
  );
};
