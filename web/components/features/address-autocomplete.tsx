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

export interface AddressResult {
    address: string;
    city: string;
    country: string;
    lat: number;
    lng: number;
}

export function AddressAutocomplete({
    name = "location",
    required = false,
    placeholder = "Search address...",
    defaultValue = "",
    onAddressSelect
}: {
    name?: string,
    required?: boolean,
    placeholder?: string,
    defaultValue?: string,
    onAddressSelect?: (result: AddressResult) => void
}) {
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
        defaultValue,
        callbackName: "initMap" // matches the global callback if you use one
    });

    const [open, setOpen] = useState(false);

    const handleSelect = async (address: string) => {
        setValue(address, false);
        clearSuggestions();
        setOpen(false);

        try {
            const results = await getGeocode({ address });
            const { lat, lng } = await getLatLng(results[0]);

            // Extract City and Country
            let city = "";
            let country = "";

            const components = results[0].address_components;

            for (const component of components) {
                if (component.types.includes("country")) {
                    country = component.long_name;
                }
                if (component.types.includes("locality")) {
                    city = component.long_name;
                }
                // Fallback for city if locality is missing (e.g. some parts of Japan/Philippines)
                if (!city && component.types.includes("administrative_area_level_2")) {
                    city = component.long_name; // County/District level often acts as city
                }
                if (!city && component.types.includes("administrative_area_level_1")) {
                    // Last resort: State/Province if no city found (not ideal but better than empty)
                    // keeping empty might be safer to prompt manual entry? No, user requested consolidation.
                    // Let's stick to locality/admin_level_2.
                }
            }

            // If still no city, try postal_town (UK)
            if (!city) {
                const town = components.find((c: any) => c.types.includes("postal_town"));
                if (town) city = town.long_name;
            }

            if (onAddressSelect) {
                onAddressSelect({
                    address,
                    city,
                    country,
                    lat,
                    lng
                });
            }
        } catch (error: any) {
            console.error("Geocoding error: ", error);
            // If the error is related to API request denial, it's likely the Geocoding API is not enabled.
            if (error?.message?.includes("REQUEST_DENIED") || error?.includes && error.includes("REQUEST_DENIED")) {
                alert("Error: Google Maps Geocoding API is not enabled. Please enable it in your Google Cloud Console to use this feature.");
            } else {
                alert("Failed to fetch address details. Please try again.");
            }
        }
    };

    // Sync internal value with hidden input
    // We use a hidden input so it works with the FormData serialization in the parent form
    return (
        <div className="relative w-full">
            <input type="hidden" name={name} value={value} />

            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <button
                        type="button" // Prevent form submission
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
                                    onSelect={() => handleSelect(description)}
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
