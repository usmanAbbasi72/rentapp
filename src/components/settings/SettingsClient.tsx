'use client';

import { useSettings } from "@/context/settings-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Settings2, Info } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export function SettingsClient() {
  const { analysisStartDate, setAnalysisStartDate } = useSettings();

  return (
    <div className="space-y-6">
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            <CardTitle>Analysis Configuration</CardTitle>
          </div>
          <CardDescription>
            Customize how your financial data is calculated and displayed across the dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col gap-3">
            <Label className="text-sm font-semibold">Analysis Start Date</Label>
            <p className="text-xs text-muted-foreground max-w-md">
              The dashboard will calculate totals for income, expenses, and savings plans starting from this date up to today.
            </p>
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  className={cn(
                    "w-full sm:w-[300px] justify-start text-left font-normal border-primary/20 hover:border-primary/50",
                    !analysisStartDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                  {analysisStartDate ? (
                    <span className="font-medium">{format(analysisStartDate, "PPP")}</span>
                  ) : (
                    <span>Pick a start date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={analysisStartDate}
                  onSelect={(date) => date && setAnalysisStartDate(date)}
                  disabled={(date) => date > new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="rounded-lg bg-primary/5 p-4 border border-primary/10 flex items-start gap-3">
            <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-primary">Why this matters?</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Changing this date affects your "Period Income", "Period Expenses", and the spending chart on the main dashboard. It helps you focus on specific timeframes like the current month or a specific project period.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-muted bg-muted/20">
        <CardHeader>
          <CardTitle className="text-base">System Info</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xs text-muted-foreground space-y-2">
            <p>Currency: <span className="font-semibold text-foreground">PKR (Pakistani Rupee)</span></p>
            <p>AI Model: <span className="font-semibold text-foreground">Gemini 2.5 Flash</span></p>
            <p>Data Storage: <span className="font-semibold text-foreground">Firebase Firestore</span></p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
