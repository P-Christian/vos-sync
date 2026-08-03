import { DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SalariesTab() {
  return (
    <div className="border border-dashed rounded-3xl py-20 px-4 bg-muted/10 text-center max-w-xl mx-auto font-sans">
      <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-4 text-muted-foreground">
        <DollarSign className="w-7 h-7" />
      </div>
      <h3 className="text-lg font-bold text-foreground mb-2">Salary Insights Not Available</h3>
      <p className="text-sm text-muted-foreground leading-relaxed px-6">
        Salary insights are not available for this company yet. Salary information will appear once anonymous salary
        contributions become available.
      </p>
      <div className="mt-8 flex justify-center">
        <Button variant="outline" className="rounded-xl font-semibold opacity-60 cursor-not-allowed" disabled>
          Submit Salary Info
        </Button>
      </div>
    </div>
  );
}
