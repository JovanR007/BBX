"use client";

import { useEffect, useState } from "react";
import usePlacesAutocomplete, {
    getGeocode,
    getLatLng,
} from "use-places-autocomplete";
import {
    Command,
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

// Make sure to load the Google Maps script in your layout or app
// e.g. <script src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`}></script>

export function AddressAutocomplete({ name = "location", required = false, placeholder = "Search address..." }: { name?: string, required?: boolean, placeholder?: string }) {
    const {
        ready,
        value,
        suggestions: { status, data },
        setValue,
        clearSuggestions,
    } = usePlacesAutocomplete({
        requestOptions: {
            /* Define search scope here */
        },
        debounce: 300,
        callbackName: "initMap" // matches the global callback if you use one
    });

    const [open, setOpen] = useState(false);

    // Sync internal value with hidden input
    // We use a hidden input so it works with the FormData serialization in the parent form
    return (
        <div className="relative w-full">
            <input type="hidden" name={name} value={value} />

            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <button
                        disabled={!ready}
                        className="w-full flex items-center justify-between h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-left"
                    >
                        <span className={cn("truncate", !value && "text-muted-foreground")}>
                            {value || placeholder}
                        </span>
                        <MapPin className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                    <Command shouldFilter={false}>
                        <CommandInput
                            placeholder="Search places..."
                            value={value}
                            onValueChange={(val) => {
                                setValue(val);
                                setOpen(true);
                            }}
                        />
                        <CommandList>
                            {status === "OK" && data.map(({ place_id, description }) => (
                                <CommandItem
                                    key={place_id}
                                    value={description}
                                    onSelect={(currentValue) => {
                                        setValue(description, false);
                                        clearSuggestions();
                                        setOpen(false);
                                    }}
                                >
                                    <MapPin className="mr-2 h-4 w-4 opacity-50" />
                                    {description}
                                </CommandItem>
                            ))}
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
    );
}
