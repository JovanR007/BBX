"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Clock } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

export function DateTimePicker({
    name = "date",
    required = false,
    className
}: {
    name?: string;
    required?: boolean;
    className?: string; // Allow external layout classes
}) {
    const [date, setDate] = React.useState<Date | undefined>();
    const [time, setTime] = React.useState("12:00");

    // Combine date and time into a single Date object and formatted string
    const combinedValue = React.useMemo(() => {
        if (!date) return "";
        const [hours, minutes] = time.split(":").map(Number);
        const newDate = new Date(date);
        newDate.setHours(hours);
        newDate.setMinutes(minutes);

        // Format as YYYY-MM-DDTHH:mm for datetime-local compatibility
        const yyyy = newDate.getFullYear();
        const mm = String(newDate.getMonth() + 1).padStart(2, '0');
        const dd = String(newDate.getDate()).padStart(2, '0');
        const hh = String(newDate.getHours()).padStart(2, '0');
        const min = String(newDate.getMinutes()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
    }, [date, time]);

    const displayValue = React.useMemo(() => {
        if (!date) return "Pick a date";
        return `${format(date, "PPP")} at ${time}`;
    }, [date, time]);

    return (
        <div className={cn("relative w-full", className)}>
            <input
                type="hidden"
                name={name}
                value={combinedValue}
                required={required}
            />
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        variant={"outline"}
                        className={cn(
                            "w-full justify-start text-left font-normal h-10 px-3",
                            !date && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {displayValue}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        initialFocus
                    />
                    <div className="p-3 border-t border-border flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <label className="text-sm font-medium">Time:</label>
                        <input
                            type="time"
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                            className="ml-auto w-[120px] rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
}
